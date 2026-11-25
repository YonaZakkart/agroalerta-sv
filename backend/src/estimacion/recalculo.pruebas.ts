import { strict as assert } from "node:assert";
import { proyectarEstimacion } from "./proyeccion";
import { recalcularDistrito, recalcularSiembra } from "./recalculo";
import type { ContextoEstimacion, RecalculoDeps, SiembraParaEstimar } from "./recalculo";

// Pruebas SIN red ni base de datos del recálculo de 5-A:
//   npm run pruebas:listeners
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

function decimal(valor: number): { toNumber(): number } {
  return { toNumber: () => valor };
}

function siembra(id: number, overrides: Partial<SiembraParaEstimar> = {}): SiembraParaEstimar {
  return {
    id,
    usuarioId: 7,
    distritoId: 1304,
    cultivo: "MAIZ",
    estado: "SEMBRADO",
    areaMz: decimal(3.5),
    fechaSiembra: new Date("2026-11-24T00:00:00.000Z"),
    distrito: {
      condicion: {
        condicion: "SEQUIA",
        nivelSequia: "MODERADA",
        fechaDatos: new Date("2026-11-23T00:00:00.000Z"),
        actualizadoEn: new Date("2026-11-24T12:00:00.000Z"),
      },
    },
    ...overrides,
  };
}

async function main(): Promise<void> {
  console.log("recalcularSiembra");

  await prueba("arma el contexto con la condición guardada y llama al cálculo", async () => {
    const contextos: ContextoEstimacion[] = [];
    const deps: RecalculoDeps = {
      buscarSiembra: async (id) => {
        assert.equal(id, 42);
        return siembra(42);
      },
      listarSiembrasPorDistrito: async () => [],
      solicitarCalculo: (contexto) => {
        contextos.push(contexto);
      },
      registrar: () => undefined,
    };

    await recalcularSiembra(42, deps);
    assert.equal(contextos.length, 1);
    const c = contextos[0]!;
    assert.equal(c.siembraId, 42);
    assert.equal(c.usuarioId, 7);
    assert.equal(c.distritoId, 1304);
    assert.equal(c.cultivo, "MAIZ");
    assert.equal(c.estado, "SEMBRADO");
    assert.equal(c.areaMz, 3.5);
    assert.equal(c.fechaSiembra.toISOString(), "2026-11-24T00:00:00.000Z");
    assert.equal(c.condicion, "SEQUIA");
    assert.equal(c.nivelSequia, "MODERADA");
    assert.equal(c.fechaDatos?.toISOString(), "2026-11-23T00:00:00.000Z");
    assert.equal(c.actualizadoEn?.toISOString(), "2026-11-24T12:00:00.000Z");
  });

  await prueba("si el distrito no tiene condición, el contexto queda sin evaluar", async () => {
    const contextos: ContextoEstimacion[] = [];
    const deps: RecalculoDeps = {
      buscarSiembra: async () => siembra(42, { distrito: { condicion: null } }),
      listarSiembrasPorDistrito: async () => [],
      solicitarCalculo: (contexto) => {
        contextos.push(contexto);
      },
      registrar: () => undefined,
    };

    await recalcularSiembra(42, deps);
    const c = contextos[0]!;
    assert.equal(c.condicion, null);
    assert.equal(c.nivelSequia, null);
    assert.equal(c.fechaDatos, null);
    assert.equal(c.actualizadoEn, null);
  });

  await prueba("el contexto de 5-A alimenta la proyección de 5-B", async () => {
    const proyecciones: ReturnType<typeof proyectarEstimacion>[] = [];
    const deps: RecalculoDeps = {
      buscarSiembra: async () => siembra(42),
      listarSiembrasPorDistrito: async () => [],
      solicitarCalculo: (contexto) => {
        proyecciones.push(proyectarEstimacion(contexto));
      },
      registrar: () => undefined,
    };

    await recalcularSiembra(42, deps);
    assert.equal(proyecciones.length, 1);
    assert.equal(proyecciones[0]!.cultivo, "MAIZ");
    assert.equal(proyecciones[0]!.areaMz, 3.5);
    assert.equal(proyecciones[0]!.factorClimatico, 0.85);
    assert.equal(proyecciones[0]!.ingresoEstimadoUsd, 5324.78);
  });

  await prueba("si la siembra no existe, registra y no calcula", async () => {
    const mensajes: string[] = [];
    let calculos = 0;
    const deps: RecalculoDeps = {
      buscarSiembra: async () => null,
      listarSiembrasPorDistrito: async () => [],
      solicitarCalculo: () => {
        calculos++;
      },
      registrar: (mensaje) => {
        mensajes.push(mensaje);
      },
    };

    await recalcularSiembra(99, deps);
    assert.equal(calculos, 0);
    assert.match(mensajes.join(" "), /siembra 99 no existe/);
  });

  console.log("recalcularDistrito");

  await prueba("procesa solo las siembras del distrito afectado", async () => {
    const distritosConsultados: number[] = [];
    const contextos: ContextoEstimacion[] = [];
    const deps: RecalculoDeps = {
      buscarSiembra: async () => null,
      listarSiembrasPorDistrito: async (distritoId) => {
        distritosConsultados.push(distritoId);
        return [siembra(1), siembra(2, { distritoId })];
      },
      solicitarCalculo: (contexto) => {
        contextos.push(contexto);
      },
      registrar: () => undefined,
    };

    await recalcularDistrito(1304, deps);
    assert.deepEqual(distritosConsultados, [1304]);
    assert.deepEqual(
      contextos.map((c) => c.siembraId),
      [1, 2],
    );
    assert.ok(contextos.every((c) => c.distritoId === 1304));
  });

  await prueba("sin siembras en el distrito no calcula nada", async () => {
    let calculos = 0;
    const deps: RecalculoDeps = {
      buscarSiembra: async () => null,
      listarSiembrasPorDistrito: async () => [],
      solicitarCalculo: () => {
        calculos++;
      },
      registrar: () => undefined,
    };

    await recalcularDistrito(1304, deps);
    assert.equal(calculos, 0);
  });

  await prueba("un fallo en una siembra no impide procesar las demás", async () => {
    const procesadas: number[] = [];
    const errores: string[] = [];
    const deps: RecalculoDeps = {
      buscarSiembra: async () => null,
      listarSiembrasPorDistrito: async () => [siembra(1), siembra(2), siembra(3)],
      solicitarCalculo: (contexto) => {
        if (contexto.siembraId === 2) throw new Error("fallo simulado");
        procesadas.push(contexto.siembraId);
      },
      registrar: (mensaje) => {
        errores.push(mensaje);
      },
    };

    await recalcularDistrito(1304, deps);
    assert.deepEqual(procesadas, [1, 3]);
    assert.match(errores.join(" "), /siembra 2/);
  });

  console.log(`\n${ok} ok, ${fallos} con fallas`);
  process.exit(fallos > 0 ? 1 : 0);
}

void main();
