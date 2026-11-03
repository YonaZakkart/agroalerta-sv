export const EVENTOS = {
    AGRICULTOR_REGISTRADO: "AgricultorRegistrado",
    ACTUALIZACION_METEOROLOGICA: "ActualizacionMeteorologica",
    CONDICION_CLIMATICA_ACTUALIZADA: "CondicionClimaticaActualizada",
    SIEMBRA_REGISTRADA: "SiembraRegistrada",
} as const;

export interface AgricultorRegistradoPayload {
    usuarioId: number;
    correo: string;
    distrito: string;
    distritoId: number;
    fechaRegistro: Date;
}

// Condición climática de un distrito. 
export type CondicionClimatica = "SEQUIA" | "EXCESO_LLUVIA" | "INVIERNO_ACEPTABLE";

// Se emite en cada consulta a Open-Meteo (3-C).
export interface ActualizacionMeteorologicaPayload {
    distritoId: number;
    fecha: Date;
    precipitacionMm: number;
    fuente: string;
}

// Se emite solo cuando la condición del distrito cambia (3-C).
// condicionAnterior es null la primera vez que se clasifica un distrito.
export interface CondicionClimaticaActualizadaPayload {
    distritoId: number;
    condicion: CondicionClimatica;
    condicionAnterior: CondicionClimatica | null;
    precipitacionAcumuladaMm: number;
    fecha: Date;
}


// Se emitirá al guardar una siembra (4-D).
export interface SiembraRegistradaPayload {
    siembraId: number;
    usuarioId: number;
    distritoId: number;
    cultivo: string;
    areaMz: number;
    fecha: Date;
}