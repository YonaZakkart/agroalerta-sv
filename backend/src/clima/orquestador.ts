import { bus } from "../events/bus";
import { EVENTOS } from "../events/types";
import type {
  ActualizacionMeteorologicaPayload,
  CondicionClimatica,
  CondicionClimaticaActualizadaPayload,
} from "../events/types";
import { obtenerClimaActual } from "./clima-actual";
import type { ClimaActual, ClimaDistrito, OpcionesClimaActual } from "./clima-actual";
import { leerPuntosDistrito } from "./puntos";
import type { PuntoDistrito } from "./tipos";
import { clasificarLluvia } from "./clasificacion";
import type { NivelSequia, ResultadoClasificacion } from "./clasificacion";
import type { ResumenLluvia } from "./resumen-lluvia";
import { guardarCondicion, leerCondicion } from "./condicion.repo";

export interface OpcionesOrquestacion extends OpcionesClimaActual {
  /** Distritos a actualizar. Por defecto, todos los que tienen coordenada. */
  distritoIds?: readonly number[];
  /** false solo para pruebas: calcula y guarda, pero no emite eventos. */
  emitirEventos?: boolean;
}

export interface ResultadoDistrito {
  distritoId: number;
  /** SIN_DATOS: no hay ningún día completo; no se guarda ni se emite nada. */
  estado: "ACTUALIZADO" | "SIN_DATOS";
  condicion: CondicionClimatica | null;
  nivelSequia: NivelSequia | null;
  /** true solo si cambió a una condición evaluada (pasar a "sin evaluación" no cuenta). */
  cambio: boolean;
  sinEvaluar: ResultadoClasificacion["sinEvaluar"];
  resumen: ResumenLluvia | null;
}

export interface ResultadoOrquestacion {
  fechaUltimoDiaCompleto: string;
  normalDisponible: boolean;
  distritos: ResultadoDistrito[];
}

// Una ejecución a la vez dentro del proceso: el endpoint y el job no escriben en paralelo.
let turno: Promise<unknown> = Promise.resolve();

export function actualizarClima(opciones: OpcionesOrquestacion = {}): Promise<ResultadoOrquestacion> {
  const ejecucion = turno.then(() => ejecutar(opciones));
  turno = ejecucion.catch(() => undefined);
  return ejecucion;
}

async function ejecutar(opciones: OpcionesOrquestacion): Promise<ResultadoOrquestacion> {
  const puntos: PuntoDistrito[] = await leerPuntosDistrito(opciones.distritoIds);
  // Si Open-Meteo falla, obtenerClimaActual lanza y no se toca ninguna condición.
  const clima: ClimaActual = await obtenerClimaActual(puntos, opciones);
  const emitir = opciones.emitirEventos ?? true;

  const distritos: ResultadoDistrito[] = [];
  for (const d of clima.distritos) {
    distritos.push(await procesarDistrito(d, clima, emitir));
  }
  return {
    fechaUltimoDiaCompleto: clima.fechaUltimoDiaCompleto,
    normalDisponible: clima.normalDisponible,
    distritos,
  };
}

async function procesarDistrito(d: ClimaDistrito, clima: ClimaActual, emitir: boolean): Promise<ResultadoDistrito> {
  // La condición anterior entra aquí para el margen anti-oscilación de clasificar().
  const previa = await leerCondicion(d.distritoId);
  const condicionAnterior = previa?.condicion ?? null;
  const { resumen, resultado } = clasificarLluvia(d.diario, d.normal30Mm, condicionAnterior);

  if (resumen.fecha === null) {
    return {
      distritoId: d.distritoId,
      estado: "SIN_DATOS",
      condicion: null,
      nivelSequia: null,
      cambio: false,
      sinEvaluar: resultado.sinEvaluar,
      resumen: null,
    };
  }

  const { cambio } = await guardarCondicion({
    distritoId: d.distritoId,
    resumen,
    resultado,
    normal30Mm: d.normal30Mm,
    consultadoEn: clima.consultadoEn,
  });

  // Se emite después de guardar, para que quien escuche lea ya el estado nuevo.
  if (emitir) {
    const fecha = new Date(`${resumen.fecha}T00:00:00Z`);

    const ultimo = d.diario.find((dia) => dia.fecha === resumen.fecha);
    const mm = ultimo?.precipitacionMm;
    if (typeof mm === "number") {
      const payload: ActualizacionMeteorologicaPayload = {
        distritoId: d.distritoId,
        fecha,
        precipitacionMm: mm,
        fuente: clima.fuente,
      };
      bus.emit(EVENTOS.ACTUALIZACION_METEOROLOGICA, payload);
    }

    if (cambio && resultado.condicion !== null) {
      const payload: CondicionClimaticaActualizadaPayload = {
        distritoId: d.distritoId,
        condicion: resultado.condicion,
        condicionAnterior,
        precipitacionAcumuladaMm: resumen.acumulado30Mm,
        fecha,
      };
      bus.emit(EVENTOS.CONDICION_CLIMATICA_ACTUALIZADA, payload);
    }
  }

  return {
    distritoId: d.distritoId,
    estado: "ACTUALIZADO",
    condicion: resultado.condicion,
    nivelSequia: resultado.nivelSequia,
    cambio,
    sinEvaluar: resultado.sinEvaluar,
    resumen,
  };
}