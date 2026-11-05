import { prisma } from "../config/prisma";
import { ATRIBUCION, OPEN_METEO } from "./config";
import { ErrorOpenMeteo } from "./errores";
import { MINIMO_ANIOS, VENTANA_DIAS, calcularNormal30 } from "./normales";
import { RUTA_NORMALES, escribirArchivoNormales, leerArchivoNormales } from "./normales-archivo";
import type { ArchivoNormales } from "./normales-archivo";
import { consultarLluviaHistorica } from "./open-meteo.client";
import type { ResultadoClima } from "./tipos";
import { leerPuntosDistrito } from "./puntos";

// Genera backend/data/referencia/normales_lluvia_30d.json (se corre UNA vez y se versiona).
//   npm run clima:normales                              -> periodo 2001-2020, los 26 distritos
//   npm run clima:normales -- --desde=2001 --hasta=2020
//   npm run clima:normales -- --distritos=1304,1318     -> solo esos (prueba rápida)
//
// Hace UNA petición por distrito (rango largo) con pausa entre peticiones. Una petición de 20 años
// cuenta como varias llamadas para Open-Meteo: en la primera corrida real respondió 429 después de
// 12 distritos en menos de un minuto. Por eso hay una pausa larga entre peticiones y, ante un 429,
// el script espera y reintenta. Si el 429 persiste, se detiene y conserva lo ya guardado: al volver
// a correrlo retoma los distritos que faltan.

const PAUSA_MS = 8_000;
const ESPERA_429_MS = 65_000;
const REINTENTOS_429 = 3;

function argumento(nombre: string): string | undefined {
    const prefijo = `--${nombre}=`;
    return process.argv.find((a) => a.startsWith(prefijo))?.slice(prefijo.length);
}

const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
    const anioDesde = Number(argumento("desde") ?? 2001);
    const anioHasta = Number(argumento("hasta") ?? 2020);
    const anioActual = new Date().getFullYear();
    if (!Number.isInteger(anioDesde) || !Number.isInteger(anioHasta) || anioDesde >= anioHasta || anioHasta >= anioActual) {
        throw new Error(`Periodo inválido (${anioDesde}-${anioHasta}): hasta debe ser un año ya terminado (< ${anioActual}) y mayor que desde`);
    }
    const desde = `${anioDesde}-01-01`;
    const hasta = `${anioHasta}-12-31`;

    const ids = argumento("distritos")?.split(",").map(Number);
    const puntos = await leerPuntosDistrito(ids);

    let archivo: ArchivoNormales | null = leerArchivoNormales();
    if (archivo !== null && (archivo.periodo.desde !== desde || archivo.periodo.hasta !== hasta)) {
        throw new Error(
            `${RUTA_NORMALES} ya existe con otro periodo (${archivo.periodo.desde} a ${archivo.periodo.hasta}). Bórralo para regenerarlo.`,
        );
    }
    archivo ??= {
        fuente: `${OPEN_METEO.fuente} Historical Weather API`,
        atribucion: ATRIBUCION,
        modelo: OPEN_METEO.modeloHistorico,
        fechaGeneracion: new Date().toISOString().slice(0, 10),
        periodo: { desde, hasta },
        ventanaDias: VENTANA_DIAS,
        minimoAnios: MINIMO_ANIOS,
        unidad: "mm",
        distritos: {},
    };

    const pendientes = puntos.filter((p) => archivo?.distritos[String(p.distritoId)] === undefined);
    console.log(`Periodo ${desde} a ${hasta}. ${puntos.length - pendientes.length} ya guardados, ${pendientes.length} por calcular.`);

    for (const [i, punto] of pendientes.entries()) {
        let resultado: ResultadoClima | undefined;
        for (let intento = 0; resultado === undefined; intento++) {
            try {
                resultado = await consultarLluviaHistorica([punto], desde, hasta);
            } catch (error) {
                if (!(error instanceof ErrorOpenMeteo && error.estadoHttp === 429)) throw error;
                if (intento >= REINTENTOS_429) {
                    console.error("Open-Meteo sigue respondiendo 429 (límite de uso). Lo ya calculado quedó guardado: espera un rato (si es el límite por hora, una hora) y vuelve a correr el comando.");
                    process.exitCode = 1;
                    return;
                }
                console.log(`  429 (límite de uso): espero ${ESPERA_429_MS / 1000} s y reintento (${intento + 1}/${REINTENTOS_429})...`);
                await dormir(ESPERA_429_MS);
            }
        }

        const serie = resultado.series[0];
        if (serie === undefined) throw new ErrorOpenMeteo("FORMATO", "Respuesta histórica vacía");
        archivo.distritos[String(punto.distritoId)] = {
            nombre: punto.nombre,
            celdaModelo: serie.celdaModelo,
            normal30: calcularNormal30(serie.diario),
        };
        escribirArchivoNormales(archivo);
        console.log(`[${i + 1}/${pendientes.length}] ${punto.distritoId} ${punto.nombre}: ${serie.diario.length} días, guardado`);
        if (i < pendientes.length - 1) await dormir(PAUSA_MS);
    }
    console.log(`Listo: ${Object.keys(archivo.distritos).length} distritos en ${RUTA_NORMALES}`);
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof ErrorOpenMeteo ? `ERROR ${error.tipo}: ${error.message}` : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
