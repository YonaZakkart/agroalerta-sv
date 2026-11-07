import { strict as assert } from "node:assert";
import { clasificar, clasificarLluvia, enEpocaLluviosa } from "./clasificacion";
import { resumirLluvia, type DiaLluvia } from "./resumen-lluvia";

let ok = 0;
let fallos = 0;
function prueba(nombre: string, fn: () => void) {
  try { fn(); ok++; console.log(`  ok    ${nombre}`); }
  catch (e) { fallos++; console.error(`  FALLA ${nombre}\n        ${(e as Error).message}`); }
}

function dia(base: number, i: number, mm: number | null, completo: boolean): DiaLluvia {
  return { fecha: new Date(base + i * 86400000).toISOString().slice(0, 10), precipitacionMm: mm, completo };
}
function serie(inicio: string, mm: (number | null)[], hoy?: number | null): DiaLluvia[] {
  const base = Date.parse(`${inicio}T00:00:00Z`);
  const dias = mm.map((v, i) => dia(base, i, v, true));
  if (hoy !== undefined) dias.push(dia(base, mm.length, hoy, false));
  return dias;
}
const E = (o: Partial<Parameters<typeof clasificar>[0]> = {}) =>
  clasificar({ fecha: "2026-09-15", diasSecosConsecutivos: 0, acumulado30Mm: 100, normal30Mm: 100, ...o });

console.log("clasificar");
prueba("DSC 10 no es sequía", () => { const r = E({ diasSecosConsecutivos: 10 }); assert.equal(r.condicion, "INVIERNO_ACEPTABLE"); assert.equal(r.nivelSequia, null); });
prueba("DSC 11 = SEQUIA moderada", () => { const r = E({ diasSecosConsecutivos: 11 }); assert.equal(r.condicion, "SEQUIA"); assert.equal(r.nivelSequia, "MODERADA"); });
prueba("DSC 15 moderada, 16 fuerte, 20 fuerte, 21 severa", () => {
  assert.equal(E({ diasSecosConsecutivos: 15 }).nivelSequia, "MODERADA");
  assert.equal(E({ diasSecosConsecutivos: 16 }).nivelSequia, "FUERTE");
  assert.equal(E({ diasSecosConsecutivos: 20 }).nivelSequia, "FUERTE");
  assert.equal(E({ diasSecosConsecutivos: 21 }).nivelSequia, "SEVERA");
});
prueba("razon 0.59 = SEQUIA por déficit", () => { const r = E({ acumulado30Mm: 59 }); assert.equal(r.condicion, "SEQUIA"); assert.deepEqual(r.criterios, ["DEFICIT_30D"]); });
prueba("razon 0.60 no es sequía", () => assert.equal(E({ acumulado30Mm: 60 }).condicion, "INVIERNO_ACEPTABLE"));
prueba("razon 1.50 = EXCESO_LLUVIA", () => assert.equal(E({ acumulado30Mm: 150 }).condicion, "EXCESO_LLUVIA"));
prueba("razon 1.49 es aceptable", () => assert.equal(E({ acumulado30Mm: 149 }).condicion, "INVIERNO_ACEPTABLE"));
prueba("SEQUIA tiene prioridad sobre EXCESO", () => assert.equal(E({ diasSecosConsecutivos: 11, acumulado30Mm: 200 }).condicion, "SEQUIA"));
prueba("normal < 20 mm: sin razón", () => { const r = E({ normal30Mm: 19.9, acumulado30Mm: 1 }); assert.equal(r.razon30, null); assert.equal(r.condicion, "INVIERNO_ACEPTABLE"); });
prueba("sin normal: clasifica solo con DSC", () => {
  assert.equal(E({ normal30Mm: null, diasSecosConsecutivos: 5 }).condicion, "INVIERNO_ACEPTABLE");
  assert.equal(E({ normal30Mm: null, diasSecosConsecutivos: 12 }).condicion, "SEQUIA");
});
prueba("acumulado null: clasifica solo con DSC", () => assert.equal(E({ acumulado30Mm: null }).condicion, "INVIERNO_ACEPTABLE"));
prueba("histéresis: salir de SEQUIA exige razon >= 0.65", () => {
  assert.equal(E({ acumulado30Mm: 62 }).condicion, "INVIERNO_ACEPTABLE");
  assert.equal(E({ acumulado30Mm: 62, condicionAnterior: "SEQUIA" }).condicion, "SEQUIA");
  assert.equal(E({ acumulado30Mm: 66, condicionAnterior: "SEQUIA" }).condicion, "INVIERNO_ACEPTABLE");
});
prueba("histéresis: salir de EXCESO exige razon < 1.45", () => {
  assert.equal(E({ acumulado30Mm: 146, condicionAnterior: "EXCESO_LLUVIA" }).condicion, "EXCESO_LLUVIA");
  assert.equal(E({ acumulado30Mm: 144, condicionAnterior: "EXCESO_LLUVIA" }).condicion, "INVIERNO_ACEPTABLE");
});
prueba("fuera de época: condicion null", () => {
  const r = E({ fecha: "2026-01-15", diasSecosConsecutivos: 30 });
  assert.equal(r.condicion, null); assert.equal(r.sinEvaluar, "FUERA_DE_EPOCA");
});
prueba("fronteras de época", () => {
  assert.equal(enEpocaLluviosa("2026-05-01"), true);
  assert.equal(enEpocaLluviosa("2026-04-30"), false);
  assert.equal(enEpocaLluviosa("2026-11-15"), true);
  assert.equal(enEpocaLluviosa("2026-11-16"), false);
});
prueba("fecha inválida lanza", () => assert.throws(() => enEpocaLluviosa("15/09/2026"), RangeError));

console.log("resumirLluvia");
prueba("30 días secos + hoy incompleto con lluvia", () => {
  const r = resumirLluvia(serie("2026-10-01", Array(30).fill(0), 5));
  assert.equal(r.diasSecosConsecutivos, 30); assert.equal(r.acumulado30Mm, 0); assert.equal(r.fecha, "2026-10-30");
});
prueba("1.0 mm ya no es día seco", () => {
  const mm = Array(30).fill(0); mm[29] = 1;
  assert.equal(resumirLluvia(serie("2026-10-01", mm)).diasSecosConsecutivos, 0);
});
prueba("0.9 mm sí es día seco", () => {
  const mm = Array(30).fill(0); mm[29] = 0.9;
  assert.equal(resumirLluvia(serie("2026-10-01", mm)).diasSecosConsecutivos, 30);
});
prueba("null corta el DSC y anula el acumulado", () => {
  const mm: (number | null)[] = Array(30).fill(0); mm[25] = null;
  const r = resumirLluvia(serie("2026-10-01", mm));
  assert.equal(r.diasSecosConsecutivos, 4); assert.equal(r.acumulado30Mm, null); assert.equal(r.diasConDato, 29);
});
prueba("menos de 30 días: acumulado null", () => assert.equal(resumirLluvia(serie("2026-10-01", Array(20).fill(1))).acumulado30Mm, null));
prueba("acumulado sin ruido de coma flotante", () => assert.equal(resumirLluvia(serie("2026-10-01", Array(30).fill(0.1))).acumulado30Mm, 3));
prueba("sin días completos: SIN_DATOS", () => {
  const { resultado } = clasificarLluvia(serie("2026-10-01", [], 2), 100);
  assert.equal(resultado.sinEvaluar, "SIN_DATOS"); assert.equal(resultado.condicion, null);
});
prueba("clasificarLluvia integra resumen y clasificación", () => {
  const { resultado } = clasificarLluvia(serie("2026-10-01", Array(30).fill(0), 3), 100);
  assert.equal(resultado.condicion, "SEQUIA");
  assert.deepEqual(resultado.criterios, ["DIAS_SECOS", "DEFICIT_30D"]);
  assert.equal(resultado.nivelSequia, "SEVERA");
});

console.log(`\n${ok} ok, ${fallos} con fallas`);
process.exit(fallos > 0 ? 1 : 0);