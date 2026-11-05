import { leerArchivoNormales } from "./normales-archivo";
import type { ArchivoNormales } from "./normales-archivo";
import { obtenerNormal30 } from "./normales";
import { consultarLluviaReciente } from "./open-meteo.client";
import type { FetchFn, OpcionesReciente } from "./open-meteo.client";
import { ErrorOpenMeteo } from "./errores";
import type { Atribucion, CeldaModelo, DiaLluvia, PuntoDistrito } from "./tipos";

// Punto de entrada pensado para 3-B, 3-C y 3-D: una sola llamada que devuelve, por distrito,
// la serie diaria de lluvia y la normal de 30 días (o null). Nadie tiene que conocer Open-Meteo.

export interface ClimaDistrito {
    distritoId: number;
    celdaModelo: CeldaModelo;
    /** Orden cronológico. El último día (hoy) llega con completo=false: usar solo los completos. */
    diario: DiaLluvia[];
    /**
     * Normal de lluvia (mm) de los 30 días que terminan en fechaUltimoDiaCompleto.
     * null si todavía no existe el archivo de normales o no hay dato para esa fecha:
     * 3-B debe poder clasificar solo con los días secos.
     */
    normal30Mm: number | null;
}

export interface ClimaActual {
    fuente: string;
    atribucion: Atribucion;
    consultadoEn: Date;
    zonaHoraria: string;
    /** Hoy en la zona horaria de El Salvador (AAAA-MM-DD). */
    fechaLocal: string;
    /** Último día con lluvia completa (normalmente ayer). Fin de la ventana de 30 días. */
    fechaUltimoDiaCompleto: string;
    /** false si no se encontró el archivo de normales (npm run clima:normales). */
    normalDisponible: boolean;
    distritos: ClimaDistrito[];
}

export interface OpcionesClimaActual extends OpcionesReciente {
    /** Para pruebas: normales ya leídas (null = sin normales). Por defecto se lee el archivo versionado. */
    normales?: ArchivoNormales | null;
    fetchFn?: FetchFn;
    ahora?: () => Date;
}

export async function obtenerClimaActual(
    puntos: readonly PuntoDistrito[],
    opciones: OpcionesClimaActual = {},
): Promise<ClimaActual> {
    const reciente: OpcionesReciente = {};
    if (opciones.diasPasados !== undefined) reciente.diasPasados = opciones.diasPasados;
    if (opciones.diasPronostico !== undefined) reciente.diasPronostico = opciones.diasPronostico;

    const normales = opciones.normales !== undefined ? opciones.normales : leerArchivoNormales();
    const resultado = await consultarLluviaReciente(puntos, reciente, opciones.fetchFn ?? fetch, opciones.ahora ?? (() => new Date()));

    let fechaUltimoDiaCompleto: string | null = null;
    for (const serie of resultado.series) {
        for (const dia of serie.diario) {
            if (dia.completo && (fechaUltimoDiaCompleto === null || dia.fecha > fechaUltimoDiaCompleto)) {
                fechaUltimoDiaCompleto = dia.fecha;
            }
        }
    }
    if (fechaUltimoDiaCompleto === null) {
        throw new ErrorOpenMeteo("FORMATO", "La respuesta de Open-Meteo no trae ningún día completo");
    }
    const fin = fechaUltimoDiaCompleto;

    return {
        fuente: resultado.fuente,
        atribucion: resultado.atribucion,
        consultadoEn: resultado.consultadoEn,
        zonaHoraria: resultado.zonaHoraria,
        fechaLocal: resultado.fechaLocal,
        fechaUltimoDiaCompleto: fin,
        normalDisponible: normales !== null,
        distritos: resultado.series.map((serie) => {
            const normal = normales?.distritos[String(serie.distritoId)];
            return {
                distritoId: serie.distritoId,
                celdaModelo: serie.celdaModelo,
                diario: serie.diario,
                normal30Mm: normal === undefined ? null : obtenerNormal30(normal.normal30, fin),
            };
        }),
    };
}
