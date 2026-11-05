import { prisma } from "../config/prisma";
import { ErrorOpenMeteo } from "./errores";
import { consultarLluviaHistorica, consultarLluviaReciente } from "./open-meteo.client";
import { leerPuntosDistrito } from "./puntos";
import type { ResultadoClima } from "./tipos";

// Prueba manual contra la API real (usa la cuota gratuita: son muy pocas llamadas).
//   npm run clima:probar                                  -> los 26 distritos, últimos 30 días
//   npm run clima:probar -- --distritos=1304,1318         -> solo esos distritos
//   npm run clima:probar -- --historico=2024-01-01:2024-01-31
// Hay que correr npm run datos:cargar antes (necesita las coordenadas en la base).

function argumento(nombre: string): string | undefined {
    const prefijo = `--${nombre}=`;
    return process.argv.find((a) => a.startsWith(prefijo))?.slice(prefijo.length);
}

function imprimir(titulo: string, resultado: ResultadoClima, nombres: Map<number, string>): void {
    console.log(`\n=== ${titulo} ===`);
    console.log(`Fuente: ${resultado.fuente} | zona: ${resultado.zonaHoraria} | hoy: ${resultado.fechaLocal}`);
    console.log(`Atribución: ${resultado.atribucion.texto} (${resultado.atribucion.url}) ${resultado.atribucion.licencia}`);
    for (const serie of resultado.series) {
        const dias = serie.diario;
        const ultimos = dias.slice(-4).map((d) => `${d.fecha}=${d.precipitacionMm ?? "null"}${d.completo ? "" : "*"}`);
        const total = dias.reduce((s, d) => s + (d.precipitacionMm ?? 0), 0);
        const c = serie.celdaModelo;
        console.log(
            `${serie.distritoId} ${(nombres.get(serie.distritoId) ?? "").padEnd(24)} ` +
                `celda ${c.latitud},${c.longitud} elev ${c.elevacionM ?? "?"} m | ${dias.length} días, suma ${total.toFixed(1)} mm | ${ultimos.join(" ")}`,
        );
    }
    console.log("(* = día incompleto)");
}

async function main(): Promise<void> {
    const ids = argumento("distritos")?.split(",").map(Number);
    const puntos = await leerPuntosDistrito(ids);
    const nombres = new Map(puntos.map((p) => [p.distritoId, p.nombre]));
    console.log(`Consultando ${puntos.length} distrito(s) en una sola petición...`);

    imprimir("Lluvia reciente", await consultarLluviaReciente(puntos), nombres);

    const historico = argumento("historico");
    if (historico !== undefined) {
        const [desde, hasta] = historico.split(":");
        if (desde === undefined || hasta === undefined) throw new Error("Usa --historico=AAAA-MM-DD:AAAA-MM-DD");
        imprimir(`Lluvia histórica ${desde} a ${hasta}`, await consultarLluviaHistorica(puntos, desde, hasta), nombres);
    }
}

main()
    .catch((error: unknown) => {
        if (error instanceof ErrorOpenMeteo) {
            console.error(`ERROR ${error.tipo}: ${error.message}`);
        } else {
            console.error(error);
        }
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
