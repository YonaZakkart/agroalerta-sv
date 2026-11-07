import "dotenv/config";
import { prisma } from "../config/prisma";
import { leerPuntosDistrito, obtenerClimaActual } from "./index";
import { clasificarLluvia } from "./clasificacion";
import { guardarCondicion, leerCondicion } from "./condicion.repo";

async function main() {
  const guardar = process.argv.includes("--guardar");
  const clima = await obtenerClimaActual(await leerPuntosDistrito());
  const filas: Record<string, unknown>[] = [];

  for (const d of clima.distritos) {
    const previo = await leerCondicion(d.distritoId);
    const { resumen, resultado } = clasificarLluvia(d.diario, d.normal30Mm, previo?.condicion ?? null);
    let cambio: boolean | string = "-";
    if (guardar && resultado.sinEvaluar !== "SIN_DATOS") {
      ({ cambio } = await guardarCondicion({
        distritoId: d.distritoId, resumen, resultado,
        normal30Mm: d.normal30Mm, consultadoEn: new Date(clima.consultadoEn),
      }));
    }
    filas.push({
      distrito: d.distritoId, fecha: resumen.fecha, dsc: resumen.diasSecosConsecutivos,
      acum30: resumen.acumulado30Mm, normal30: d.normal30Mm, razon: resultado.razon30,
      condicion: resultado.condicion ?? resultado.sinEvaluar, nivel: resultado.nivelSequia, cambio,
    });
  }
  console.table(filas);
  console.log(guardar ? "Guardado en condiciones_distrito." : "Solo lectura (use --guardar para persistir).");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());