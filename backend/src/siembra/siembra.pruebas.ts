import { strict as assert } from "node:assert";
import { EVENTOS } from "../events/types";
import type { SiembraRegistradaPayload } from "../events/types";
import { aSiembraDto } from "./siembra.dto";
import { aPayloadSiembraRegistrada, crearSiembra, SiembraError } from "./siembra.service";
import type { CrearSiembraDeps, NuevaSiembra } from "./siembra.service";
import { validarDatosSiembra } from "./siembra.validacion";
import type { DatosSiembra } from "./siembra.validacion";
import { datosValidos, hoyEnElSalvador, siembraPersistida, sumarDias } from "./siembra.pruebas.ayudas";

// Pruebas SIN red ni base de datos de la validación, el DTO y el servicio:
//   npm run pruebas:siembra
let ok = 0;
let fallos = 0;

async function prueba(nombre: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    ok++;
    console.log(`  ok    ${nombre}`);
  } catch (error) {
    fallos++;
    console.error(`  FALLA ${nombre}\n        ${error instanceof Error ? error.message : String(error)}`);
  }
}

function erroresDe(cuerpo: unknown): string[] {
  const resultado = validarDatosSiembra(cuerpo);
  assert.equal(resultado.ok, false);
  return resultado.ok ? [] : resultado.detalles;
}

async function main(): Promise<void> {
  console.log("validarDatosSiembra");

  await prueba("un cuerpo válido se normaliza", () => {
    const resultado = validarDatosSiembra(datosValidos());
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;
    assert.equal(resultado.datos.distritoId, 1304);
    assert.equal(resultado.datos.cultivo, "MAIZ");
    assert.equal(resultado.datos.estado, "POR_SEMBRAR");
    assert.equal(resultado.datos.areaMz, 3.5);
    assert.equal(resultado.datos.cantidadSemilla, 45);
    assert.equal(resultado.datos.unidadSemilla, "LIBRAS");
    assert.equal(resultado.datos.inversionTotalUsd, 1900);
  });

  await prueba("sin opcionales, semilla y costos quedan en null", () => {
    const resultado = validarDatosSiembra({
      distritoId: 1304,
      cultivo: "FRIJOL",
      estado: "SEMBRADO",
      fechaSiembra: hoyEnElSalvador(),
      areaMz: 1,
      inversionTotalUsd: 0,
    });
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;
    assert.equal(resultado.datos.cantidadSemilla, null);
    assert.equal(resultado.datos.unidadSemilla, null);
    assert.equal(resultado.datos.costoSemillaUsd, null);
    assert.equal(resultado.datos.alquilaTerreno, false);
    assert.equal(resultado.datos.usaMaquinaria, false);
    assert.equal(resultado.datos.usaRiego, false);
  });

  await prueba("rechaza un cuerpo que no es objeto", () => {
    for (const cuerpo of [null, undefined, [], "texto", 42]) {
      assert.match(erroresDe(cuerpo).join(" "), /objeto JSON/);
    }
  });

  await prueba("rechaza distritoId inválido", () => {
    for (const distritoId of [0, -1, 1.5, "1304", Number.NaN]) {
      assert.match(erroresDe({ ...datosValidos(), distritoId }).join(" "), /distritoId/);
    }
  });

  await prueba("rechaza cultivo y estado fuera del enum", () => {
    assert.match(erroresDe({ ...datosValidos(), cultivo: "SORGO" }).join(" "), /cultivo/);
    assert.match(erroresDe({ ...datosValidos(), estado: "OTRO" }).join(" "), /estado/);
  });

  await prueba("rechaza fechas inválidas", () => {
    for (const fecha of ["2026-02-30", "24/11/2026", "2026-13-01", ""]) {
      assert.match(erroresDe({ ...datosValidos(), fechaSiembra: fecha }).join(" "), /fechaSiembra/);
    }
  });

  await prueba("la fecha debe ser coherente con el estado", () => {
    const hoy = hoyEnElSalvador();
    const ayer = sumarDias(hoy, -1);
    const manana = sumarDias(hoy, 1);

    assert.equal(validarDatosSiembra({ ...datosValidos(), estado: "SEMBRADO", fechaSiembra: hoy }).ok, true);
    assert.equal(validarDatosSiembra({ ...datosValidos(), estado: "POR_SEMBRAR", fechaSiembra: hoy }).ok, true);

    assert.match(
      erroresDe({ ...datosValidos(), estado: "SEMBRADO", fechaSiembra: manana }).join(" "),
      /fecha futura/,
    );
    assert.match(
      erroresDe({ ...datosValidos(), estado: "POR_SEMBRAR", fechaSiembra: ayer }).join(" "),
      /fecha pasada/,
    );
  });

  await prueba("rechaza área fuera de rango o con más de dos decimales", () => {
    for (const areaMz of [0, -1, 0.001, 1000000, 3.555]) {
      assert.match(erroresDe({ ...datosValidos(), areaMz }).join(" "), /areaMz/);
    }
  });

  await prueba("cantidadSemilla y unidadSemilla deben ir juntas", () => {
    assert.match(
      erroresDe({ ...datosValidos(), cantidadSemilla: 45, unidadSemilla: null }).join(" "),
      /deben ir juntas/,
    );
    assert.match(
      erroresDe({ ...datosValidos(), cantidadSemilla: null, unidadSemilla: "LIBRAS" }).join(" "),
      /deben ir juntas/,
    );
    assert.match(
      erroresDe({ ...datosValidos(), unidadSemilla: "KILOS" }).join(" "),
      /unidadSemilla/,
    );
  });

  await prueba("rechaza montos negativos o con más de dos decimales", () => {
    assert.match(erroresDe({ ...datosValidos(), inversionTotalUsd: -1 }).join(" "), /inversionTotalUsd/);
    assert.match(erroresDe({ ...datosValidos(), inversionTotalUsd: 10.999 }).join(" "), /inversionTotalUsd/);
    assert.match(erroresDe({ ...datosValidos(), costoSemillaUsd: -0.01 }).join(" "), /costoSemillaUsd/);
  });

  await prueba("permite un desglose mayor que la inversión total (decisión MVP)", () => {
    const resultado = validarDatosSiembra({
      ...datosValidos(),
      inversionTotalUsd: 100,
      costoSemillaUsd: 80,
      costoMaquinariaUsd: 80,
    });
    assert.equal(resultado.ok, true);
  });

  await prueba("ignora campos desconocidos", () => {
    assert.equal(validarDatosSiembra({ ...datosValidos(), campoExtra: "x" }).ok, true);
  });

  await prueba("rechaza booleanos que no son booleanos", () => {
    assert.match(erroresDe({ ...datosValidos(), usaRiego: "si" }).join(" "), /usaRiego/);
  });

  console.log("aSiembraDto");

  await prueba("convierte Decimal y fechas al contrato público", () => {
    const dto = aSiembraDto(siembraPersistida());
    assert.equal(dto.id, 1);
    assert.equal(dto.distritoId, 1304);
    assert.equal(dto.distrito.nombre, "Chilanga");
    assert.equal(dto.distrito.municipio.nombre, "Morazán Norte");
    assert.equal(dto.fechaSiembra, "2026-11-24");
    assert.equal(dto.creadoEn, "2026-11-24T18:00:00.000Z");
    assert.equal(dto.areaMz, 3.5);
    assert.equal(dto.cantidadSemilla, 45);
    assert.equal(dto.inversionTotalUsd, 1900);
    assert.equal(dto.costoMaquinariaUsd, 300);
    assert.equal(dto.costoAlquilerUsd, null);
    assert.equal(dto.unidadSemilla, "LIBRAS");
  });

  console.log("crearSiembra");

  await prueba("busca el distrito, persiste y emite después", async () => {
    const llamadas: string[] = [];
    let nueva: NuevaSiembra | null = null;
    let payload: SiembraRegistradaPayload | null = null;

    const deps: CrearSiembraDeps = {
      buscarDistrito: async (id) => {
        llamadas.push("buscar");
        assert.equal(id, 1304);
        return { id };
      },
      crear: async (datos) => {
        llamadas.push("crear");
        nueva = datos;
        return siembraPersistida();
      },
      emitir: (evento, datos) => {
        llamadas.push("emitir");
        assert.equal(evento, EVENTOS.SIEMBRA_REGISTRADA);
        payload = datos as SiembraRegistradaPayload;
        return true;
      },
    };

    const dto = await crearSiembra(7, datosValidos({ fechaSiembra: "2026-11-24" }), deps);
    assert.deepEqual(llamadas, ["buscar", "crear", "emitir"]);
    assert.equal(nueva!.usuarioId, 7);
    assert.equal(nueva!.fechaSiembra.toISOString(), "2026-11-24T00:00:00.000Z");
    assert.equal(nueva!.areaMz, 3.5);
    assert.equal(nueva!.cantidadSemilla, 45);
    assert.equal(dto.id, 1);
    assert.equal(payload!.siembraId, 1);
    assert.equal(payload!.usuarioId, 7);
    assert.equal(payload!.distritoId, 1304);
    assert.equal(payload!.cultivo, "MAIZ");
    assert.equal(payload!.areaMz, 3.5);
    assert.equal(payload!.fecha.toISOString(), "2026-11-24T00:00:00.000Z");
  });

  await prueba("distrito inexistente: 404 y no persiste ni emite", async () => {
    const llamadas: string[] = [];
    const deps: CrearSiembraDeps = {
      buscarDistrito: async () => {
        llamadas.push("buscar");
        return null;
      },
      crear: async () => {
        llamadas.push("crear");
        return siembraPersistida();
      },
      emitir: () => {
        llamadas.push("emitir");
        return true;
      },
    };

    await assert.rejects(
      () => crearSiembra(7, datosValidos(), deps),
      (error: unknown) => error instanceof SiembraError && error.status === 404,
    );
    assert.deepEqual(llamadas, ["buscar"]);
  });

  await prueba("si la FK falla por carrera, se traduce a 404", async () => {
    const deps: CrearSiembraDeps = {
      buscarDistrito: async () => ({ id: 1304 }),
      crear: async () => {
        throw Object.assign(new Error("FK"), { code: "P2003" });
      },
      emitir: () => true,
    };

    await assert.rejects(
      () => crearSiembra(7, datosValidos(), deps),
      (error: unknown) => error instanceof SiembraError && error.status === 404,
    );
  });

  await prueba("si el emisor falla, la siembra igual se devuelve", async () => {
    const deps: CrearSiembraDeps = {
      buscarDistrito: async () => ({ id: 1304 }),
      crear: async () => siembraPersistida(),
      emitir: () => {
        throw new Error("listener roto");
      },
    };

    const original = console.error;
    console.error = () => undefined;
    try {
      const dto = await crearSiembra(7, datosValidos(), deps);
      assert.equal(dto.id, 1);
    } finally {
      console.error = original;
    }
  });

  await prueba("el payload usa números y Date, no Decimal", () => {
    const payload = aPayloadSiembraRegistrada(siembraPersistida(), 7);
    assert.equal(typeof payload.areaMz, "number");
    assert.equal(payload.areaMz, 3.5);
    assert.ok(payload.fecha instanceof Date);
    assert.equal(payload.cultivo, "MAIZ");
  });

  await prueba("los datos validados se pueden pasar al servicio", () => {
    const validado = validarDatosSiembra(datosValidos());
    assert.equal(validado.ok, true);
    if (!validado.ok) return;
    const datos: DatosSiembra = validado.datos;
    assert.equal(datos.distritoId, 1304);
  });

  console.log(`\n${ok} ok, ${fallos} con fallas`);
  process.exit(fallos > 0 ? 1 : 0);
}

void main();
