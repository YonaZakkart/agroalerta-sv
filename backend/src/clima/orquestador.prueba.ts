import { bus } from "../events/bus";
import { EVENTOS } from "../events/types";
import { actualizarClima } from "./orquestador";
import { fechaLocalDe } from "./open-meteo.client";
import type { PuntoDistrito } from "./tipos";

// Prueba manual de 3-C con Open-Meteo simulado. Ejecutar desde backend/:
//   npx ts-node-dev --transpile-only src/clima/orquestador.prueba.ts
// Cada caso indica lo esperado y el script imprime OK o FALLA.
// Escribe en condicion_distrito de la base local (distrito 1304).

const hoy = fechaLocalDe(new Date());

function sumarDias(fecha: string, n: number): string {
  const base = new Date(`${fecha}T00:00:00Z`);
  return new Date(base.getTime() + n * 86_400_000).toISOString().slice(0, 10);
}

type Dia = { fecha: string; precipitacionMm: number | null };

// 30 días pasados (lluvia(i) para i = 0..29; el último es ayer) más hoy, que llega incompleto.
function serieCon(lluvia: (i: number) => number | null): Dia[] {
  const pasados = Array.from({ length: 30 }, (_, i) => ({
    fecha: sumarDias(hoy, i - 30),
    precipitacionMm: lluvia(i),
  }));
  return [...pasados, { fecha: hoy, precipitacionMm: 0 }];
}

function respuesta(dias: Dia[]) {
  return {
    latitude: 13.67,
    longitude: -88.16,
    elevation: 500,
    daily_units: { time: "iso8601", precipitation_sum: "mm" },
    daily: {
      time: dias.map((d) => d.fecha),
      precipitation_sum: dias.map((d) => d.precipitacionMm),
    },
  };
}

const puntos: PuntoDistrito[] = [
  { distritoId: 1304, nombre: "Chilanga", latitud: 13.67, longitud: -88.16 },
];

function normalesDe(normal30Mm: number | null) {
  if (normal30Mm === null) return null;
  return {
    fuente: "prueba",
    atribucion: {} as never,
    modelo: "prueba",
    fechaGeneracion: hoy,
    periodo: { desde: "2016", hasta: "2025" },
    ventanaDias: 30,
    minimoAnios: 10,
    unidad: "mm" as const,
    distritos: {
      "1304": {
        nombre: "Chilanga",
        celdaModelo: { latitud: 13.67, longitud: -88.16, elevacionM: 500 },
        // La clave es el último día completo (ayer), no hoy.
        normal30: { [sumarDias(hoy, -1).slice(5)]: normal30Mm },
      },
    },
  };
}

interface Esperado {
  estado: "ACTUALIZADO" | "SIN_DATOS";
  condicion?: string | null;
  nivelSequia?: string | null;
  /** Cuántos ActualizacionMeteorologica deben emitirse. */
  actualizaciones: number;
  emitir: boolean;
}

let actualizacionesVistas = 0;
bus.on(EVENTOS.ACTUALIZACION_METEOROLOGICA, () => {
  actualizacionesVistas++;
});

async function caso(nombre: string, dias: Dia[], normal30Mm: number | null, esp: Esperado) {
  actualizacionesVistas = 0;
  const fetchFn = (async () =>
    new Response(JSON.stringify(respuesta(dias)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const r = await actualizarClima({
    puntos,
    fetchFn,
    normales: normalesDe(normal30Mm) as never,
    emitirEventos: esp.emitir,
  });
  const d = r.distritos[0];

  const ok =
    d !== undefined &&
    d.estado === esp.estado &&
    (esp.condicion === undefined || d.condicion === esp.condicion) &&
    (esp.nivelSequia === undefined || d.nivelSequia === esp.nivelSequia) &&
    actualizacionesVistas === esp.actualizaciones;

  console.log(
    ok ? "OK    " : "FALLA ",
    nombre,
    JSON.stringify({
      estado: d?.estado,
      condicion: d?.condicion,
      nivelSequia: d?.nivelSequia,
      actualizacionEmitida: d?.actualizacionEmitida,
      actualizacionesVistas,
    }),
  );
}

async function main() {
  await caso("sin lluvia (sequía por días secos):", serieCon(() => 0), 100, {
    estado: "ACTUALIZADO", condicion: "SEQUIA", nivelSequia: "SEVERA", actualizaciones: 0, emitir: false,
  });
  await caso("lluvia normal (invierno aceptable, emite 1):", serieCon(() => 8), 240, {
    estado: "ACTUALIZADO", condicion: "INVIERNO_ACEPTABLE", nivelSequia: null, actualizaciones: 1, emitir: true,
  });
  await caso("mucha lluvia (exceso):", serieCon(() => 20), 240, {
    estado: "ACTUALIZADO", condicion: "EXCESO_LLUVIA", actualizaciones: 0, emitir: false,
  });
  await caso("sin normal (solo días secos):", serieCon(() => 0), null, {
    estado: "ACTUALIZADO", condicion: "SEQUIA", nivelSequia: "SEVERA", actualizaciones: 0, emitir: false,
  });
  await caso("sin ningún día completo (SIN_DATOS, no emite):", [{ fecha: hoy, precipitacionMm: 0 }], 240, {
    estado: "SIN_DATOS", condicion: null, actualizaciones: 0, emitir: true,
  });
  await caso("último día completo sin lluvia (no emite ActualizacionMeteorologica):", serieCon((i) => (i === 29 ? null : 8)), 240, {
    estado: "ACTUALIZADO", actualizaciones: 0, emitir: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });