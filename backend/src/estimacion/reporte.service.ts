import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";
import { aEstimacionDto } from "./reporte.dto";
import type { EstimacionDto, EstimacionPersistida } from "./reporte.dto";
import type { ProyeccionEstimacion } from "./proyeccion";
import type { Recomendacion } from "./recomendacion";

// Persistencia del reporte de estimación (5-D). Guarda una fila por cálculo;
// la última estimación de una siembra es la fila más reciente y el historial
// son todas las filas. No recalcula nada al leer.

const SELECT_ESTIMACION = {
  id: true,
  siembraId: true,
  usuarioId: true,
  distritoId: true,
  cultivo: true,
  estado: true,
  areaMz: true,
  fechaSiembra: true,
  condicion: true,
  nivelSequia: true,
  fechaDatos: true,
  actualizadoEn: true,
  rendimientoBaseQqPorMz: true,
  factorClimatico: true,
  rendimientoEstimadoQqPorMz: true,
  produccionEstimadaQq: true,
  precioVentaQqUsd: true,
  ingresoEstimadoUsd: true,
  nivelRiesgo: true,
  titulo: true,
  mensaje: true,
  motivos: true,
  viabilidad: true,
  supuestos: true,
  calculadoEn: true,
} as const;

export async function guardarEstimacion(
  proyeccion: ProyeccionEstimacion,
  recomendacion: Recomendacion,
): Promise<EstimacionDto> {
  const fila = await prisma.estimacion.create({
    data: {
      siembraId: proyeccion.siembraId,
      usuarioId: proyeccion.usuarioId,
      distritoId: proyeccion.distritoId,
      cultivo: proyeccion.cultivo,
      estado: proyeccion.estado,
      areaMz: proyeccion.areaMz,
      fechaSiembra: proyeccion.fechaSiembra,
      condicion: proyeccion.condicion,
      nivelSequia: proyeccion.nivelSequia,
      fechaDatos: proyeccion.fechaDatos,
      actualizadoEn: proyeccion.actualizadoEn,
      rendimientoBaseQqPorMz: proyeccion.rendimientoBaseQqPorMz,
      factorClimatico: proyeccion.factorClimatico,
      rendimientoEstimadoQqPorMz: proyeccion.rendimientoEstimadoQqPorMz,
      produccionEstimadaQq: proyeccion.produccionEstimadaQq,
      precioVentaQqUsd: proyeccion.precioVentaQqUsd,
      ingresoEstimadoUsd: proyeccion.ingresoEstimadoUsd,
      nivelRiesgo: recomendacion.nivel,
      titulo: recomendacion.titulo,
      mensaje: recomendacion.mensaje,
      motivos: recomendacion.motivos as Prisma.InputJsonValue,
      ...(recomendacion.viabilidad !== null && {
        viabilidad: recomendacion.viabilidad as unknown as Prisma.InputJsonValue,
      }),
      supuestos: proyeccion.supuestos as unknown as Prisma.InputJsonValue,
    },
    select: SELECT_ESTIMACION,
  });
  return aEstimacionDto(fila);
}

export async function listarEstimaciones(usuarioId: number): Promise<EstimacionDto[]> {
  const filas: EstimacionPersistida[] = await prisma.estimacion.findMany({
    where: { usuarioId },
    orderBy: { calculadoEn: "desc" },
    select: SELECT_ESTIMACION,
  });
  return filas.map(aEstimacionDto);
}
