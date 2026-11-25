import { strict as assert } from "node:assert";
import { estimarCostos } from "./estimar-costos";
import type { EstimacionCostos, LineaEstimacion, OpcionesEstimacion } from "./estimar-costos";
import { REFERENCIA_COSTOS } from "./referencia";

// Pruebas SIN red ni base de datos:
//   npm run pruebas:estimacion
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

const TODO: OpcionesEstimacion = { alquilaTerreno: true, usaMaquinaria: true, usaRiego: true };
const NADA: OpcionesEstimacion = { alquilaTerreno: false, usaMaquinaria: false, usaRiego: false };

function mismoUsd(actual: number, esperado: number): void {
  assert.equal(Math.round(actual * 100), Math.round(esperado * 100));
}

function linea(estimacion: EstimacionCostos, concepto: string): LineaEstimacion {
  const encontrada = estimacion.lineas.find((l) => l.concepto === concepto);
  if (!encontrada) throw new Error(`falta la línea ${concepto}`);
  return encontrada;
}

console.log("estimarCostos");

prueba("1 mz de maíz semitecnificado con todos los rubros = $1,329.28", () => {
  const e = estimarCostos("MAIZ", 1, TODO);
  assert.equal(e.lineas.length, 10);
  mismoUsd(e.totalUsd, 1329.28);
  mismoUsd(linea(e, "Semilla").subtotalUsd, 97.75);
  mismoUsd(linea(e, "Fertilizante formulado").subtotalUsd, 203.44);
  mismoUsd(linea(e, "Sulfato de amonio").subtotalUsd, 153.7);
  mismoUsd(linea(e, "Urea").subtotalUsd, 178.96);
  mismoUsd(linea(e, "Mano de obra").subtotalUsd, 405.5);
  mismoUsd(linea(e, "Maquinaria (rastra, surcado y aporco)").subtotalUsd, 131.91);
  mismoUsd(linea(e, "Alquiler de la tierra").subtotalUsd, 63.09);
  mismoUsd(linea(e, "Riego (cuota de agua)").subtotalUsd, 63.64);
});

prueba("0.5 mz redondea hacia arriba semilla, fertilizantes y jornales", () => {
  const e = estimarCostos("MAIZ", 0.5, TODO);
  mismoUsd(e.totalUsd, 681.98);
  const semilla = linea(e, "Semilla");
  assert.ok(Math.abs(semilla.cantidadCalculada - 12.105) < 1e-9);
  assert.equal(semilla.cantidadComprada, 13);
  assert.equal(linea(e, "Fertilizante formulado").cantidadComprada, 2);
  assert.equal(linea(e, "Sulfato de amonio").cantidadComprada, 3);
  assert.equal(linea(e, "Urea").cantidadComprada, 2);
  assert.equal(linea(e, "Mano de obra").cantidadComprada, 25);
  mismoUsd(linea(e, "Herbicidas").subtotalUsd, 7.91);
  mismoUsd(linea(e, "Maquinaria (rastra, surcado y aporco)").subtotalUsd, 65.96);
});

prueba("sin alquiler, maquinaria ni riego solo quedan los rubros directos", () => {
  const e = estimarCostos("MAIZ", 1, NADA);
  mismoUsd(e.totalUsd, 1070.64);
  assert.equal(e.lineas.some((l) => l.concepto === "Alquiler de la tierra"), false);
  assert.equal(e.lineas.some((l) => l.concepto.startsWith("Maquinaria")), false);
  assert.equal(e.lineas.some((l) => l.concepto.startsWith("Riego")), false);
});

prueba("2 mz de frijol de invierno = $1,943.58", () => {
  const e = estimarCostos("FRIJOL", 2, TODO);
  mismoUsd(e.totalUsd, 1943.58);
  assert.equal(linea(e, "Semilla").cantidadComprada, 200);
  assert.equal(linea(e, "Mano de obra").cantidadComprada, 114);
  assert.equal(e.lineas.some((l) => l.concepto.startsWith("Maquinaria")), false);
});

prueba("1 mz de maicillo semitecnificado = $912.01", () => {
  const e = estimarCostos("MAICILLO", 1, TODO);
  mismoUsd(e.totalUsd, 912.01);
  assert.equal(linea(e, "Semilla").cantidadComprada, 14);
  assert.equal(linea(e, "Mano de obra").cantidadComprada, 37);
  mismoUsd(linea(e, "Maquinaria (rastra y surcado)").subtotalUsd, 118.34);
});

prueba("el total es la suma exacta de las líneas", () => {
  for (const cultivo of ["MAIZ", "FRIJOL", "MAICILLO"] as const) {
    for (const area of [0.25, 1, 3.5]) {
      const e = estimarCostos(cultivo, area, TODO);
      mismoUsd(e.totalUsd, e.lineas.reduce((total, l) => total + l.subtotalUsd, 0));
    }
  }
});

prueba("cada línea conserva fuente, fecha y tipo", () => {
  const e = estimarCostos("MAIZ", 1, TODO);
  for (const l of e.lineas) {
    assert.ok(l.fuente.length > 0);
    assert.equal(l.fecha, "2024-02-21");
    assert.ok(l.tipo === "OFICIAL" || l.tipo === "SUPUESTO");
  }
  const semilla = linea(e, "Semilla");
  assert.equal(semilla.tipo, "OFICIAL");
  assert.match(semilla.fuente, /MAG\/DGEA\/DEA/);
  assert.equal(semilla.fecha, "2024-02-21");
});

prueba("el riego se declara como supuesto, no como dato oficial", () => {
  const e = estimarCostos("MAIZ", 1, TODO);
  const riego = linea(e, "Riego (cuota de agua)");
  assert.equal(riego.tipo, "SUPUESTO");
  assert.ok(riego.nota && riego.nota.includes("no trae cuota de agua"));
});

prueba("las fuentes se deduplican", () => {
  assert.equal(estimarCostos("MAIZ", 1, TODO).fuentes.length, 2);
  assert.equal(estimarCostos("MAIZ", 1, NADA).fuentes.length, 1);
});

prueba("la ficha y la página de origen viajan en el resultado", () => {
  const e = estimarCostos("MAICILLO", 1, TODO);
  assert.equal(e.ficha, "Sorgo semi-tecnificado (maicillo)");
  assert.equal(REFERENCIA_COSTOS.MAICILLO.paginaPdf, 16);
});

prueba("rechaza áreas inválidas", () => {
  for (const area of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1000000]) {
    assert.throws(() => estimarCostos("MAIZ", area, TODO), RangeError);
  }
});

prueba("rechaza un cultivo desconocido", () => {
  assert.throws(() => estimarCostos("SORGO" as never, 1, TODO), RangeError);
});

prueba("acepta el área máxima del formulario", () => {
  const e = estimarCostos("MAIZ", 999999.99, NADA);
  assert.ok(Number.isFinite(e.totalUsd));
  assert.ok(e.totalUsd > 0);
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);
