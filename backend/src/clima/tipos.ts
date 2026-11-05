import type { ATRIBUCION } from "./config";

export type Atribucion = typeof ATRIBUCION;

/** Punto a consultar: un distrito con su coordenada ya convertida a número. */
export interface PuntoDistrito {
    distritoId: number;
    nombre: string;
    latitud: number;
    longitud: number;
}

export interface DiaLluvia {
    /** AAAA-MM-DD en la zona horaria de El Salvador. */
    fecha: string;
    /** Lluvia del día en mm. null si el modelo no entregó el dato. */
    precipitacionMm: number | null;
    /** false para hoy (el día aún no termina o es pronóstico). El resto de la serie es completo. */
    completo: boolean;
}

/** Celda del modelo que respondió. Puede estar a unos kilómetros del punto pedido. */
export interface CeldaModelo {
    latitud: number;
    longitud: number;
    elevacionM: number | null;
}

export interface SerieLluviaDistrito {
    distritoId: number;
    celdaModelo: CeldaModelo;
    /** Orden cronológico, un elemento por día, sin huecos. */
    diario: DiaLluvia[];
}

export interface ResultadoClima {
    fuente: string;
    atribucion: Atribucion;
    consultadoEn: Date;
    zonaHoraria: string;
    /** Fecha de hoy en la zona horaria de El Salvador (AAAA-MM-DD). */
    fechaLocal: string;
    series: SerieLluviaDistrito[];
}
