import { strict as assert } from "node:assert";
import { proyectarEstimacion, REFERENCIA_PROYECCION } from "./proyeccion";
import type { ContextoEstimacion } from "./recalculo";

// Pruebas SIN red ni base de datos de la proyección de 5-B:
//   npm run pruebas:proyeccion
let ok = 0;
let fallos = 0;

function prueba(nombre: string, fn: () => void): void {
  try {
    fn();
    ok++;
    console.log(`  ok    ${nombre}`);
  } catch (error) {
    fallos++;
    console.error(`  FALLA ${nombre}\n        ${error instanceof Error ? error.message : String(error)}`);
  }
}

function mismo2(actual: number, esperado: number): void {
  assert.equal(Math.round(actual * 100), Math.round(esperado * 100));
}

function contexto(overrides: Partial<ContextoEstimacion> = {}): ContextoEstimacion {
  return {
    siembraId: 1,
    usuarioId: 7,
    distritoId: 1304,
    cultivo: "MAIZ",
    estado: "SEMBRADO",
    areaMz: 1,
    fechaSiembra: new Date("2026-11-24T00:00:00.000Z"),
    condicion: "INVIERNO_ACEPTABLE",
    nivelSequia: null,
    fechaDatos: new Date("2026-11-23T00:00:00.000Z"),
    actualizadoEn: new Date("2026-11-24T12:00:00.000Z"),
    ...overrides,
  };
}

console.log("proyectarEstimacion");

prueba("1 mz de maíz en invierno aceptable = 58.22 qq y $1,789.68", () => {
  const p = proyectarEstimacion(contexto());
  assert.equal(p.cultivo, "MAIZ");
  mismo2(p.rendimientoBaseQqPorMz, 58.22);
  mismo2(p.factorClimatico, 1);
  mismo2(p.rendimientoEstimadoQqPorMz, 58.22);
  mismo2(p.produccionEstimadaQq, 58.22);
  mismo2(p.precioVentaQqUsd, 30.74);
  mismo2(p.ingresoEstimadoUsd, 1789.68);
});

prueba("1 mz de frijol en invierno aceptable = 18.17 qq y $1,271.90", () => {
  const p = proyectarEstimacion(contexto({ cultivo: "FRIJOL" }));
  mismo2(p.rendimientoBaseQqPorMz, 18.17);
  mismo2(p.produccionEstimadaQq, 18.17);
  mismo2(p.precioVentaQqUsd, 70);
  mismo2(p.ingresoEstimadoUsd, 1271.9);
});

prueba("1 mz de maicillo en invierno aceptable = 39.44 qq y $1,183.20", () => {
  const p = proyectarEstimacion(contexto({ cultivo: "MAICILLO" }));
  mismo2(p.rendimientoBaseQqPorMz, 39.44);
  mismo2(p.produccionEstimadaQq, 39.44);
  mismo2(p.precioVentaQqUsd, 30);
  mismo2(p.ingresoEstimadoUsd, 1183.2);
});

prueba("2 mz de maíz duplican producción e ingreso", () => {
  const p = proyectarEstimacion(contexto({ areaMz: 2 }));
  mismo2(p.produccionEstimadaQq, 116.44);
  mismo2(p.ingresoEstimadoUsd, 3579.37);
});

prueba("0.5 mz de maíz producen la mitad", () => {
  const p = proyectarEstimacion(contexto({ areaMz: 0.5 }));
  mismo2(p.produccionEstimadaQq, 29.11);
  mismo2(p.ingresoEstimadoUsd, 894.84);
});

prueba("1.5 mz de maíz redondean a dos decimales", () => {
  const p = proyectarEstimacion(contexto({ areaMz: 1.5 }));
  mismo2(p.produccionEstimadaQq, 87.33);
  mismo2(p.ingresoEstimadoUsd, 2684.52);
});

prueba("la sequía aplica el factor declarado por nivel", () => {
  const casos: { nivel: "DEBIL" | "MODERADA" | "FUERTE" | "SEVERA"; factor: number; rendimiento: number; ingreso: number }[] = [
    { nivel: "DEBIL", factor: 0.95, rendimiento: 55.31, ingreso: 1700.23 },
    { nivel: "MODERADA", factor: 0.85, rendimiento: 49.49, ingreso: 1521.32 },
    { nivel: "FUERTE", factor: 0.7, rendimiento: 40.75, ingreso: 1252.66 },
    { nivel: "SEVERA", factor: 0.5, rendimiento: 29.11, ingreso: 894.84 },
  ];

  for (const caso of casos) {
    const p = proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: caso.nivel }));
    mismo2(p.factorClimatico, caso.factor);
    mismo2(p.rendimientoEstimadoQqPorMz, caso.rendimiento);
    mismo2(p.ingresoEstimadoUsd, caso.ingreso);
  }
});

prueba("la sequía sin nivel usa el factor base 0.80", () => {
  const p = proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: null }));
  mismo2(p.factorClimatico, 0.8);
  mismo2(p.rendimientoEstimadoQqPorMz, 46.58);
  mismo2(p.ingresoEstimadoUsd, 1431.87);
});

prueba("el exceso de lluvia usa el factor declarado 0.90", () => {
  const p = proyectarEstimacion(contexto({ condicion: "EXCESO_LLUVIA" }));
  mismo2(p.factorClimatico, 0.9);
  mismo2(p.rendimientoEstimadoQqPorMz, 52.4);
  mismo2(p.ingresoEstimadoUsd, 1610.78);
});

prueba("sin evaluación climática no se aplica ajuste", () => {
  const p = proyectarEstimacion(contexto({ condicion: null, nivelSequia: null }));
  mismo2(p.factorClimatico, 1);
  mismo2(p.ingresoEstimadoUsd, 1789.68);
  assert.match(p.supuestos[2]!.nota!, /Sin evaluación climática/);
});

prueba("la proyección conserva los datos de la siembra y del clima", () => {
  const p = proyectarEstimacion(contexto());
  assert.equal(p.siembraId, 1);
  assert.equal(p.usuarioId, 7);
  assert.equal(p.distritoId, 1304);
  assert.equal(p.estado, "SEMBRADO");
  assert.equal(p.fechaSiembra.toISOString(), "2026-11-24T00:00:00.000Z");
  assert.equal(p.condicion, "INVIERNO_ACEPTABLE");
  assert.equal(p.nivelSequia, null);
  assert.equal(p.fechaDatos?.toISOString(), "2026-11-23T00:00:00.000Z");
  assert.equal(p.actualizadoEn?.toISOString(), "2026-11-24T12:00:00.000Z");
});

prueba("los supuestos distinguen oficiales y declarados", () => {
  const p = proyectarEstimacion(contexto({ condicion: "SEQUIA", nivelSequia: "MODERADA" }));
  assert.equal(p.supuestos.length, 3);

  const rendimiento = p.supuestos.find((s) => s.clave === "rendimiento_base")!;
  assert.equal(rendimiento.tipo, "OFICIAL");
  assert.equal(rendimiento.valor, 58.22);
  assert.equal(rendimiento.unidad, "qq/mz");
  assert.match(rendimiento.fuente, /MAG\/DGEA\/DEA/);
  assert.equal(rendimiento.fecha, "2024-02-21");
  assert.match(rendimiento.nota!, /PDF pág\. 15/);

  const precio = p.supuestos.find((s) => s.clave === "precio_venta")!;
  assert.equal(precio.tipo, "OFICIAL");
  assert.equal(precio.valor, 30.74);
  assert.equal(precio.unidad, "USD/qq");

  const factor = p.supuestos.find((s) => s.clave === "factor_climatico")!;
  assert.equal(factor.tipo, "SUPUESTO");
  mismo2(Number(factor.valor), 0.85);
  assert.equal(factor.fecha, "2026-11-24");
  assert.match(factor.nota!, /Sequía moderada/);
});

prueba("las referencias base son las mismas fichas del MAG que 4-C", () => {
  assert.equal(REFERENCIA_PROYECCION.MAIZ.paginaPdf, 15);
  assert.equal(REFERENCIA_PROYECCION.FRIJOL.paginaPdf, 12);
  assert.equal(REFERENCIA_PROYECCION.MAICILLO.paginaPdf, 16);
  assert.equal(REFERENCIA_PROYECCION.MAIZ.ficha, "Maíz semitecnificado");
});

prueba("rechaza cultivo desconocido y áreas inválidas", () => {
  assert.throws(() => proyectarEstimacion(contexto({ cultivo: "SORGO" as never })), RangeError);
  for (const areaMz of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => proyectarEstimacion(contexto({ areaMz })), RangeError);
  }
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
