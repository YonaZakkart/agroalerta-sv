import { prisma } from "../config/prisma";
import type { CondicionClimatica } from "../events/types";
import type { ResultadoClasificacion } from "./clasificacion";
import type { ResumenLluvia } from "./resumen-lluvia";

export function leerCondicion(distritoId: number) {
  return prisma.condicionDistrito.findUnique({ where: { distritoId } });
}

// Un solo escritor (el job de 3-D): lectura + upsert sin transacción.
// Con SIN_DATOS NO se llama: se conserva el último dato bueno (Info_Datos_Clima.md, sección 4).
export async function guardarCondicion(p: {
  distritoId: number;
  resumen: ResumenLluvia;
  resultado: ResultadoClasificacion;
  normal30Mm: number | null;
  consultadoEn: Date;
}): Promise<{ condicionAnterior: CondicionClimatica | null; cambio: boolean }> {
  const { distritoId, resumen, resultado, normal30Mm, consultadoEn } = p;
  if (resumen.fecha === null) throw new Error("guardarCondicion: sin datos que guardar");

  const anterior = await prisma.condicionDistrito.findUnique({ where: { distritoId } });
  const condicionAnterior = anterior?.condicion ?? null;
  const cambioCondicion = resultado.condicion !== condicionAnterior;

  const datos = {
    condicion: resultado.condicion,
    nivelSequia: resultado.nivelSequia,
    diasSecosConsecutivos: resumen.diasSecosConsecutivos,
    acumulado30Mm: resumen.acumulado30Mm,
    normal30Mm,
    razon30: resultado.razon30,
    fechaDatos: new Date(`${resumen.fecha}T00:00:00Z`),
    actualizadoEn: consultadoEn,
  };

  await prisma.condicionDistrito.upsert({
    where: { distritoId },
    create: { distritoId, ...datos, condicionDesde: consultadoEn },
    update: cambioCondicion ? { ...datos, condicionDesde: consultadoEn } : datos,
  });

  // Entrar a "sin evaluación" (null) no es un evento.
  return { condicionAnterior, cambio: resultado.condicion !== null && cambioCondicion };
}