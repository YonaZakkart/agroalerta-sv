// API pública del módulo clima, para 3-B, 3-C y 3-D.
export { ATRIBUCION, OPEN_METEO } from "./config";
export { ErrorOpenMeteo } from "./errores";
export type { TipoErrorOpenMeteo } from "./errores";
export { consultarLluviaHistorica, consultarLluviaReciente, fechaLocalDe } from "./open-meteo.client";
export { obtenerClimaActual } from "./clima-actual";
export type { ClimaActual, ClimaDistrito, OpcionesClimaActual } from "./clima-actual";
export { calcularNormal30, obtenerNormal30 } from "./normales";
export type { TablaNormal30 } from "./normales";
export { leerArchivoNormales } from "./normales-archivo";
export { leerPuntosDistrito } from "./puntos";
export type {
    Atribucion,
    CeldaModelo,
    DiaLluvia,
    PuntoDistrito,
    ResultadoClima,
    SerieLluviaDistrito,
} from "./tipos";

export * from "./umbrales";
export * from "./resumen-lluvia";
export * from "./clasificacion";
export * from "./condicion.repo";