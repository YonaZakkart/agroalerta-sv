import { ATRIBUCION, OPEN_METEO } from "./config";
import { ErrorOpenMeteo } from "./errores";
import type { CeldaModelo, DiaLluvia, PuntoDistrito, ResultadoClima, SerieLluviaDistrito } from "./tipos";

// Cliente de Open-Meteo. Usa el fetch nativo de Node, sin dependencias nuevas.
// Es puro: recibe los puntos ya convertidos (ver puntos.ts), no toca la base ni emite eventos.
// No reintenta: la tolerancia a fallos y la periodicidad son de 3-D.

export type FetchFn = typeof fetch;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface OpcionesReciente {
    diasPasados?: number;
    diasPronostico?: number;
}

// ---------------------------------------------------------------------------
// Validación y construcción de URL
// ---------------------------------------------------------------------------

function redondear6(n: number): number {
    return Math.round(n * 1e6) / 1e6;
}

export function validarPuntos(puntos: readonly PuntoDistrito[]): void {
    if (puntos.length === 0) {
        throw new ErrorOpenMeteo("COORDENADA_INVALIDA", "No hay puntos que consultar");
    }
    if (puntos.length > OPEN_METEO.maxPuntosPorPeticion) {
        throw new ErrorOpenMeteo(
            "PARAMETRO_INVALIDO",
            `Demasiados puntos en una petición (${puntos.length}; máximo ${OPEN_METEO.maxPuntosPorPeticion})`,
        );
    }
    const vistos = new Set<number>();
    for (const p of puntos) {
        if (vistos.has(p.distritoId)) {
            throw new ErrorOpenMeteo("COORDENADA_INVALIDA", `El distrito ${p.distritoId} está repetido`);
        }
        vistos.add(p.distritoId);
        const valida =
            Number.isFinite(p.latitud) &&
            Number.isFinite(p.longitud) &&
            Math.abs(p.latitud) <= 90 &&
            Math.abs(p.longitud) <= 180;
        if (!valida) {
            throw new ErrorOpenMeteo(
                "COORDENADA_INVALIDA",
                `Coordenada inválida para el distrito ${p.distritoId} (${p.nombre}): ${p.latitud}, ${p.longitud}`,
            );
        }
    }
}

function parametrosUbicacion(puntos: readonly PuntoDistrito[]): string {
    const latitudes = puntos.map((p) => redondear6(p.latitud)).join(",");
    const longitudes = puntos.map((p) => redondear6(p.longitud)).join(",");
    return `latitude=${latitudes}&longitude=${longitudes}`;
}

function exigirEntero(nombre: string, valor: number, minimo: number, maximo: number): void {
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
        throw new ErrorOpenMeteo(
            "PARAMETRO_INVALIDO",
            `${nombre} debe ser un entero entre ${minimo} y ${maximo} (recibido ${valor})`,
        );
    }
}

export function construirUrlPronostico(
    puntos: readonly PuntoDistrito[],
    diasPasados: number,
    diasPronostico: number,
): string {
    validarPuntos(puntos);
    exigirEntero("diasPasados", diasPasados, 0, OPEN_METEO.maxDiasPasados);
    exigirEntero("diasPronostico", diasPronostico, 1, OPEN_METEO.maxDiasPronostico);
    return (
        `${OPEN_METEO.urlPronostico}?${parametrosUbicacion(puntos)}` +
        `&daily=${OPEN_METEO.variableDiaria}` +
        `&timezone=${encodeURIComponent(OPEN_METEO.zonaHoraria)}` +
        `&past_days=${diasPasados}&forecast_days=${diasPronostico}`
    );
}

export function construirUrlHistorico(puntos: readonly PuntoDistrito[], desde: string, hasta: string): string {
    validarPuntos(puntos);
    if (!FORMATO_FECHA.test(desde) || !FORMATO_FECHA.test(hasta) || desde > hasta) {
        throw new ErrorOpenMeteo("PARAMETRO_INVALIDO", `Rango de fechas inválido: ${desde} a ${hasta}`);
    }
    return (
        `${OPEN_METEO.urlHistorico}?${parametrosUbicacion(puntos)}` +
        `&start_date=${desde}&end_date=${hasta}` +
        `&daily=${OPEN_METEO.variableDiaria}` +
        `&timezone=${encodeURIComponent(OPEN_METEO.zonaHoraria)}` +
        `&models=${OPEN_METEO.modeloHistorico}`
    );
}

// ---------------------------------------------------------------------------
// Petición HTTP
// ---------------------------------------------------------------------------

function esRegistro(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function describirError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function pedirJson(url: string, timeoutMs: number, fetchFn: FetchFn): Promise<unknown> {
    let estado: number;
    let ok: boolean;
    let texto: string;
    try {
        const respuesta = await fetchFn(url, {
            signal: AbortSignal.timeout(timeoutMs),
            headers: { Accept: "application/json" },
        });
        estado = respuesta.status;
        ok = respuesta.ok;
        texto = await respuesta.text();
    } catch (error) {
        if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
            throw new ErrorOpenMeteo("TIMEOUT", `Open-Meteo no respondió en ${timeoutMs} ms`, undefined, error);
        }
        throw new ErrorOpenMeteo("RED", `No se pudo conectar con Open-Meteo: ${describirError(error)}`, undefined, error);
    }

    let json: unknown = null;
    try {
        json = JSON.parse(texto);
    } catch {
        json = null;
    }

    // Documentado: un parámetro mal escrito devuelve 400 con { error: true, reason: "..." }.
    const razon = esRegistro(json) && typeof json["reason"] === "string" ? json["reason"] : null;
    if (!ok) {
        throw new ErrorOpenMeteo("HTTP", `Open-Meteo respondió ${estado}: ${razon ?? "sin detalle"}`, estado);
    }
    if (esRegistro(json) && json["error"] === true) {
        throw new ErrorOpenMeteo("HTTP", `Open-Meteo devolvió un error: ${razon ?? "sin detalle"}`, estado);
    }
    if (json === null) {
        throw new ErrorOpenMeteo("FORMATO", "La respuesta de Open-Meteo no es JSON válido", estado);
    }
    return json;
}

// ---------------------------------------------------------------------------
// Interpretación de la respuesta
// ---------------------------------------------------------------------------

function numeroOnull(valor: unknown, que: string): number | null {
    if (valor === null) return null;
    if (typeof valor === "number" && Number.isFinite(valor)) return valor;
    throw new ErrorOpenMeteo("FORMATO", `${que}: se esperaba un número o null y llegó ${JSON.stringify(valor)}`);
}

function interpretarUno(item: unknown, punto: PuntoDistrito, fechaLocalCompleto: string | null): SerieLluviaDistrito {
    const etiqueta = `distrito ${punto.distritoId} (${punto.nombre})`;
    if (!esRegistro(item)) {
        throw new ErrorOpenMeteo("FORMATO", `Respuesta inesperada para el ${etiqueta}`);
    }
    const diario = item["daily"];
    const unidades = item["daily_units"];
    if (!esRegistro(diario)) {
        throw new ErrorOpenMeteo("FORMATO", `Falta "daily" en la respuesta del ${etiqueta}`);
    }
    const unidad = esRegistro(unidades) ? unidades[OPEN_METEO.variableDiaria] : undefined;
    if (unidad !== OPEN_METEO.unidadEsperada) {
        throw new ErrorOpenMeteo(
            "FORMATO",
            `Unidad inesperada para el ${etiqueta}: ${JSON.stringify(unidad)} (se esperaba "${OPEN_METEO.unidadEsperada}")`,
        );
    }
    const fechas = diario["time"];
    const valores = diario[OPEN_METEO.variableDiaria];
    if (!Array.isArray(fechas) || !Array.isArray(valores) || fechas.length !== valores.length) {
        throw new ErrorOpenMeteo("FORMATO", `Series de fechas y lluvia inconsistentes para el ${etiqueta}`);
    }

    const dias: DiaLluvia[] = fechas.map((fecha: unknown, i: number) => {
        if (typeof fecha !== "string" || !FORMATO_FECHA.test(fecha)) {
            throw new ErrorOpenMeteo("FORMATO", `Fecha inválida en la respuesta del ${etiqueta}: ${JSON.stringify(fecha)}`);
        }
        return {
            fecha,
            precipitacionMm: numeroOnull(valores[i], `Lluvia del ${etiqueta} (${fecha})`),
            completo: fechaLocalCompleto === null ? true : fecha < fechaLocalCompleto,
        };
    });

    const latitud = item["latitude"];
    const longitud = item["longitude"];
    if (typeof latitud !== "number" || typeof longitud !== "number") {
        throw new ErrorOpenMeteo("FORMATO", `Falta la celda del modelo para el ${etiqueta}`);
    }
    const elevacion = item["elevation"];
    const celdaModelo: CeldaModelo = {
        latitud,
        longitud,
        elevacionM: typeof elevacion === "number" && Number.isFinite(elevacion) ? elevacion : null,
    };
    return { distritoId: punto.distritoId, celdaModelo, diario: dias };
}

/**
 * Convierte el JSON de Open-Meteo en series por distrito.
 * Con una sola coordenada la API devuelve un objeto; con varias, una lista en el mismo orden
 * en que se pidieron. Las coordenadas devueltas son las del centro de celda del modelo, no las
 * pedidas, así que el emparejamiento es por posición.
 * fechaLocalCompleto: los días anteriores a esa fecha se marcan completos (null = todos completos).
 */
export function interpretarRespuesta(
    json: unknown,
    puntos: readonly PuntoDistrito[],
    fechaLocalCompleto: string | null,
): SerieLluviaDistrito[] {
    const items: unknown[] = Array.isArray(json) ? json : [json];
    if (items.length !== puntos.length) {
        throw new ErrorOpenMeteo(
            "FORMATO",
            `Se pidieron ${puntos.length} ubicaciones y Open-Meteo devolvió ${items.length}`,
        );
    }
    return puntos.map((punto, i) => interpretarUno(items[i], punto, fechaLocalCompleto));
}

// ---------------------------------------------------------------------------
// API pública del cliente
// ---------------------------------------------------------------------------

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria dada. */
export function fechaLocalDe(instante: Date, zonaHoraria: string = OPEN_METEO.zonaHoraria): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: zonaHoraria,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(instante);
}

/**
 * Lluvia diaria de los últimos días (por defecto 30) más hoy, para todos los puntos en UNA petición.
 * El día de hoy llega con completo=false: 3-B debe calcular con los días completos.
 */
export async function consultarLluviaReciente(
    puntos: readonly PuntoDistrito[],
    opciones: OpcionesReciente = {},
    fetchFn: FetchFn = fetch,
    ahora: () => Date = () => new Date(),
): Promise<ResultadoClima> {
    const url = construirUrlPronostico(
        puntos,
        opciones.diasPasados ?? OPEN_METEO.diasPasados,
        opciones.diasPronostico ?? OPEN_METEO.diasPronostico,
    );
    const consultadoEn = ahora();
    const fechaLocal = fechaLocalDe(consultadoEn);
    const json = await pedirJson(url, OPEN_METEO.timeoutPronosticoMs, fetchFn);
    return {
        fuente: OPEN_METEO.fuente,
        atribucion: ATRIBUCION,
        consultadoEn,
        zonaHoraria: OPEN_METEO.zonaHoraria,
        fechaLocal,
        series: interpretarRespuesta(json, puntos, fechaLocal),
    };
}

/**
 * Lluvia diaria histórica (reanálisis) entre dos fechas. Sirve para calcular la normal (normales.ts).
 * El archivo tiene unos 5 días de retraso: no usarlo para los últimos días.
 */
export async function consultarLluviaHistorica(
    puntos: readonly PuntoDistrito[],
    desde: string,
    hasta: string,
    fetchFn: FetchFn = fetch,
    ahora: () => Date = () => new Date(),
): Promise<ResultadoClima> {
    const url = construirUrlHistorico(puntos, desde, hasta);
    const consultadoEn = ahora();
    const json = await pedirJson(url, OPEN_METEO.timeoutHistoricoMs, fetchFn);
    return {
        fuente: OPEN_METEO.fuente,
        atribucion: ATRIBUCION,
        consultadoEn,
        zonaHoraria: OPEN_METEO.zonaHoraria,
        fechaLocal: fechaLocalDe(consultadoEn),
        series: interpretarRespuesta(json, puntos, null),
    };
}
