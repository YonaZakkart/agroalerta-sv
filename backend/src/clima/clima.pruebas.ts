import assert from "node:assert/strict";
import { ErrorOpenMeteo } from "./errores";
import type { TipoErrorOpenMeteo } from "./errores";
import { calcularNormal30, clavesDelAnio, obtenerNormal30 } from "./normales";
import {
    construirUrlHistorico,
    construirUrlPronostico,
    consultarLluviaHistorica,
    consultarLluviaReciente,
    fechaLocalDe,
    interpretarRespuesta,
} from "./open-meteo.client";
import type { FetchFn } from "./open-meteo.client";
import { obtenerClimaActual } from "./clima-actual";
import type { ArchivoNormales } from "./normales-archivo";
import { ATRIBUCION } from "./config";
import type { DiaLluvia, PuntoDistrito } from "./tipos";

// Pruebas SIN red: usan respuestas de ejemplo con la forma documentada por Open-Meteo.
//   npm run clima:pruebas
// Cada prueba es independiente; si una falla se informa y el proceso termina con código 1.

const A: PuntoDistrito = { distritoId: 1304, nombre: "Chilanga", latitud: 13.71667, longitud: -88.11667 };
const B: PuntoDistrito = { distritoId: 1318, nombre: "San Fernando", latitud: 13.96667, longitud: -88.2 };

function itemApi(lat: number, lon: number, fechas: string[], valores: Array<number | null>, unidad = "mm"): unknown {
    return {
        latitude: lat,
        longitude: lon,
        elevation: 250.5,
        generationtime_ms: 0.5,
        utc_offset_seconds: -21600,
        timezone: "America/El_Salvador",
        daily_units: { time: "iso8601", precipitation_sum: unidad },
        daily: { time: fechas, precipitation_sum: valores },
    };
}

function respuesta(cuerpo: unknown, estado = 200): Response {
    return new Response(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo), { status: estado });
}

const fetchCon = (r: Response | Error): FetchFn =>
    (async () => {
        if (r instanceof Error) throw r;
        return r;
    }) as FetchFn;

function esperarError(tipo: TipoErrorOpenMeteo, f: () => unknown): void {
    assert.throws(f, (e: unknown) => e instanceof ErrorOpenMeteo && e.tipo === tipo, `se esperaba ${tipo}`);
}

async function esperarErrorAsync(tipo: TipoErrorOpenMeteo, f: () => Promise<unknown>): Promise<void> {
    await assert.rejects(f, (e: unknown) => e instanceof ErrorOpenMeteo && e.tipo === tipo, `se esperaba ${tipo}`);
}

const pruebas: Array<[string, () => void | Promise<void>]> = [
    ["URL de pronóstico: coordenadas, variable, zona y días", () => {
        const url = construirUrlPronostico([A, B], 30, 1);
        assert.equal(
            url,
            "https://api.open-meteo.com/v1/forecast?latitude=13.71667,13.96667&longitude=-88.11667,-88.2" +
                "&daily=precipitation_sum&timezone=America%2FEl_Salvador&past_days=30&forecast_days=1",
        );
    }],
    ["URL histórica: fechas, zona y modelo", () => {
        const url = construirUrlHistorico([A], "2001-01-01", "2020-12-31");
        assert.match(url, /^https:\/\/archive-api\.open-meteo\.com\/v1\/archive\?latitude=13\.71667&longitude=-88\.11667/);
        assert.match(url, /&start_date=2001-01-01&end_date=2020-12-31&daily=precipitation_sum&timezone=America%2FEl_Salvador&models=era5$/);
    }],
    ["valida coordenadas, repetidos, vacío y días fuera de rango", () => {
        esperarError("COORDENADA_INVALIDA", () => construirUrlPronostico([{ ...A, latitud: NaN }], 30, 1));
        esperarError("COORDENADA_INVALIDA", () => construirUrlPronostico([{ ...A, latitud: 95 }], 30, 1));
        esperarError("COORDENADA_INVALIDA", () => construirUrlPronostico([A, A], 30, 1));
        esperarError("COORDENADA_INVALIDA", () => construirUrlPronostico([], 30, 1));
        esperarError("PARAMETRO_INVALIDO", () => construirUrlPronostico([A], 93, 1));
        esperarError("PARAMETRO_INVALIDO", () => construirUrlPronostico([A], 30, 0));
        esperarError("PARAMETRO_INVALIDO", () => construirUrlHistorico([A], "2020-12-31", "2001-01-01"));
        esperarError("PARAMETRO_INVALIDO", () => construirUrlHistorico([A], "ayer", "hoy"));
    }],
    ["respuesta con lista (varias ubicaciones): empareja por posición y marca el día de hoy", () => {
        const fechas = ["2026-11-01", "2026-11-02", "2026-11-03"];
        const json = [itemApi(13.75, -88.25, fechas, [1.2, 0, 4.5]), itemApi(14, -88.25, fechas, [0, null, 2])];
        const series = interpretarRespuesta(json, [A, B], "2026-11-03");
        assert.equal(series.length, 2);
        assert.equal(series[0]?.distritoId, 1304);
        assert.equal(series[1]?.distritoId, 1318);
        assert.deepEqual(series[0]?.celdaModelo, { latitud: 13.75, longitud: -88.25, elevacionM: 250.5 });
        assert.deepEqual(series[0]?.diario.map((d) => d.completo), [true, true, false]);
        assert.equal(series[1]?.diario[1]?.precipitacionMm, null);
    }],
    ["respuesta con un solo objeto (una ubicación)", () => {
        const series = interpretarRespuesta(itemApi(13.75, -88.25, ["2026-11-02"], [3]), [A], null);
        assert.equal(series.length, 1);
        assert.equal(series[0]?.diario[0]?.completo, true);
    }],
    ["formato inválido: cantidad, unidad, longitudes, fechas, valores y estructura", () => {
        const f = ["2026-11-02"];
        esperarError("FORMATO", () => interpretarRespuesta([itemApi(1, 1, f, [1])], [A, B], null));
        esperarError("FORMATO", () => interpretarRespuesta(itemApi(1, 1, f, [1], "inch"), [A], null));
        esperarError("FORMATO", () => interpretarRespuesta(itemApi(1, 1, f, [1, 2]), [A], null));
        esperarError("FORMATO", () => interpretarRespuesta(itemApi(1, 1, ["02/11/2026"], [1]), [A], null));
        esperarError("FORMATO", () => interpretarRespuesta(itemApi(1, 1, f, ["x" as unknown as number]), [A], null));
        esperarError("FORMATO", () => interpretarRespuesta({ latitude: 1, longitude: 1 }, [A], null));
        esperarError("FORMATO", () => interpretarRespuesta("hola", [A], null));
    }],
    ["error 400 documentado: { error: true, reason } -> HTTP con el motivo", async () => {
        const f = fetchCon(respuesta({ error: true, reason: "Cannot initialize WeatherVariable from invalid String value" }, 400));
        await assert.rejects(
            () => consultarLluviaReciente([A], {}, f),
            (e: unknown) => e instanceof ErrorOpenMeteo && e.tipo === "HTTP" && e.estadoHttp === 400 && /invalid String value/.test(e.message),
        );
    }],
    ["429 se reporta como HTTP con estado 429 (para que 3-D y el script lo distingan)", async () => {
        await assert.rejects(
            () => consultarLluviaReciente([A], {}, fetchCon(respuesta({ error: true, reason: "Too many requests" }, 429))),
            (e: unknown) => e instanceof ErrorOpenMeteo && e.tipo === "HTTP" && e.estadoHttp === 429,
        );
    }],
    ["200 con error:true y respuesta que no es JSON", async () => {
        await esperarErrorAsync("HTTP", () => consultarLluviaReciente([A], {}, fetchCon(respuesta({ error: true, reason: "x" }, 200))));
        await esperarErrorAsync("FORMATO", () => consultarLluviaReciente([A], {}, fetchCon(respuesta("<html>no json</html>", 200))));
    }],
    ["timeout y fallo de red se distinguen", async () => {
        const timeout = new Error("timeout");
        timeout.name = "TimeoutError";
        await esperarErrorAsync("TIMEOUT", () => consultarLluviaReciente([A], {}, fetchCon(timeout)));
        await esperarErrorAsync("RED", () => consultarLluviaReciente([A], {}, fetchCon(new TypeError("fetch failed"))));
    }],
    ["consulta completa: usa la fecha local de El Salvador para marcar hoy", async () => {
        // 2026-11-03 03:00 UTC = 2026-11-02 21:00 en El Salvador (UTC-6)
        const ahora = (): Date => new Date("2026-11-03T03:00:00Z");
        assert.equal(fechaLocalDe(ahora()), "2026-11-02");
        const f = fetchCon(respuesta(itemApi(13.75, -88.25, ["2026-11-01", "2026-11-02"], [2, 1])));
        const r = await consultarLluviaReciente([A], {}, f, ahora);
        assert.equal(r.fuente, "Open-Meteo");
        assert.equal(r.atribucion.texto, "Weather data by Open-Meteo.com");
        assert.equal(r.fechaLocal, "2026-11-02");
        assert.deepEqual(r.series[0]?.diario.map((d) => d.completo), [true, false]);
    }],
    ["consulta histórica: todos los días completos", async () => {
        const f = fetchCon(respuesta(itemApi(13.75, -88.25, ["2020-01-01", "2020-01-02"], [0, 0])));
        const r = await consultarLluviaHistorica([A], "2020-01-01", "2020-01-02", f);
        assert.deepEqual(r.series[0]?.diario.map((d) => d.completo), [true, true]);
    }],
    ["normal de 30 días: 1 mm diario constante da 30 mm; el 29 de febrero usa el 28", () => {
        const serie = serieDiaria("2001-01-01", "2012-12-31", () => 1);
        const tabla = calcularNormal30(serie);
        assert.equal(Object.keys(tabla).length, 365);
        assert.equal(tabla["07-15"], 30);
        assert.equal(tabla["02-28"], 30);
        assert.equal(obtenerNormal30(tabla, "2024-02-29"), 30);
        assert.equal(tabla["01-10"], 30); // 2002..2012 = 11 años válidos (>= 10)
    }],
    ["normal: promedia años y descarta ventanas con datos faltantes", () => {
        // 2001 con 2 mm/día, 2002 con 4 mm/día -> normal de agosto = (60 + 120) / 2 = 90 con minimoAnios = 2
        const serie = serieDiaria("2001-01-01", "2002-12-31", (f) => (f.startsWith("2001") ? 2 : 4));
        assert.equal(calcularNormal30(serie, 2)["08-31"], 90);
        // Un día null en 2002 invalida solo la ventana de ese año
        const conHueco = serie.map((d) => (d.fecha === "2002-08-20" ? { ...d, precipitacionMm: null } : d));
        const tabla = calcularNormal30(conHueco, 1);
        assert.equal(tabla["08-31"], 60); // solo cuenta 2001
        assert.equal(calcularNormal30(conHueco, 2)["08-31"], null); // no alcanza el mínimo de años
    }],
    ["normal: una serie con huecos de fechas se rechaza", () => {
        const serie = serieDiaria("2001-01-01", "2001-03-01", () => 1);
        const rota = [...serie.slice(0, 10), ...serie.slice(12)];
        esperarError("FORMATO", () => calcularNormal30(rota));
    }],
    ["obtenerClimaActual: serie + normal30Mm de la fecha del último día completo", async () => {
        const ahora = (): Date => new Date("2026-11-03T03:00:00Z"); // hoy = 2026-11-02 en El Salvador
        const f = fetchCon(respuesta([
            itemApi(13.75, -88.25, ["2026-10-31", "2026-11-01", "2026-11-02"], [0, 5, 1]),
            itemApi(14, -88.25, ["2026-10-31", "2026-11-01", "2026-11-02"], [1, 1, 1]),
        ]));
        const normales: ArchivoNormales = {
            fuente: "prueba", atribucion: ATRIBUCION, modelo: "era5", fechaGeneracion: "2026-11-02",
            periodo: { desde: "2001-01-01", hasta: "2020-12-31" }, ventanaDias: 30, minimoAnios: 10, unidad: "mm",
            distritos: { "1304": { nombre: "Chilanga", celdaModelo: { latitud: 13.75, longitud: -88.25, elevacionM: null }, normal30: { "11-01": 123.4 } } },
        };
        const r = await obtenerClimaActual([A, B], { fetchFn: f, ahora, normales });
        assert.equal(r.fechaLocal, "2026-11-02");
        assert.equal(r.fechaUltimoDiaCompleto, "2026-11-01");
        assert.equal(r.normalDisponible, true);
        assert.equal(r.distritos[0]?.normal30Mm, 123.4);
        assert.equal(r.distritos[1]?.normal30Mm, null); // sin normal para San Fernando: 3-B clasifica solo con días secos
        assert.equal(r.distritos[0]?.diario.length, 3);
        const sin = await obtenerClimaActual([A], { fetchFn: fetchCon(respuesta(itemApi(13.75, -88.25, ["2026-11-01"], [2]))), ahora, normales: null });
        assert.equal(sin.normalDisponible, false);
        assert.equal(sin.distritos[0]?.normal30Mm, null);
    }],
    ["clavesDelAnio tiene 365 claves únicas sin 02-29", () => {
        const claves = clavesDelAnio();
        assert.equal(new Set(claves).size, 365);
        assert.ok(!claves.includes("02-29"));
        assert.equal(claves[0], "01-01");
        assert.equal(claves[364], "12-31");
    }],
];

function serieDiaria(desde: string, hasta: string, valor: (fecha: string) => number): DiaLluvia[] {
    const salida: DiaLluvia[] = [];
    for (let t = Date.parse(desde); t <= Date.parse(hasta); t += 86_400_000) {
        const fecha = new Date(t).toISOString().slice(0, 10);
        salida.push({ fecha, precipitacionMm: valor(fecha), completo: true });
    }
    return salida;
}

async function main(): Promise<void> {
    let fallos = 0;
    for (const [nombre, prueba] of pruebas) {
        try {
            await prueba();
            console.log(`  ok   ${nombre}`);
        } catch (error) {
            fallos++;
            console.log(`  FALLA ${nombre}`);
            console.log(`        ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
        }
    }
    console.log(`\n${pruebas.length - fallos}/${pruebas.length} pruebas pasaron.`);
    if (fallos > 0) process.exitCode = 1;
}

void main();
