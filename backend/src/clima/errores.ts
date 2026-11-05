export type TipoErrorOpenMeteo =
    | "COORDENADA_INVALIDA" // punto sin coordenadas o fuera de rango (no se llegó a consultar)
    | "PARAMETRO_INVALIDO" // días o fechas fuera de lo que admite la API (no se llegó a consultar)
    | "TIMEOUT" // la API no respondió a tiempo
    | "RED" // fallo de conexión
    | "HTTP" // la API respondió con un estado de error
    | "FORMATO"; // la respuesta no tiene la forma documentada

export class ErrorOpenMeteo extends Error {
    constructor(
        readonly tipo: TipoErrorOpenMeteo,
        mensaje: string,
        readonly estadoHttp?: number,
        readonly causa?: unknown,
    ) {
        super(mensaje);
        this.name = "ErrorOpenMeteo";
    }
}
