import { actualizarClima } from "./orquestador";
import type { PuntoDistrito } from "./tipos";
import { clasificarLluvia } from "./clasificacion";

// Prueba manual de 3-C: Open-Meteo simulado y sin emitir eventos.
// Ejecutar desde backend/: npx ts-node-dev --transpile-only src/clima/orquestador.prueba.ts

const hoy = "2026-11-10";

function diasDesde(inicio: string, n: number, mmPorDia: (i: number) => number | null) {
  const base = new Date(`${inicio}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { fecha: d, precipitacionMm: mmPorDia(i) };
  });
}

// Respuesta simulada del pronóstico: 30 días pasados completos + hoy incompleto.
function respuestaSimulada(lluviaPorDia: (i: number) => number | null) {
  const pasados = diasDesde("2026-10-11", 30, lluviaPorDia);
  const dias = [...pasados, { fecha: hoy, precipitacionMm: 0 }];
  return {
    latitude: 13.67,
    longitude: -88.16,
    elevation: 500,
    daily_units: {
  time: "iso8601",
  precipitation_sum: "mm",
},
    daily: {
      time: dias.map((d) => d.fecha),
      precipitation_sum: dias.map((d) => d.precipitacionMm),
    },
  };
}

const puntos: PuntoDistrito[] = [
  { distritoId: 1304, nombre: "Chilanga", latitud: 13.67, longitud: -88.16 },
];

async function caso(nombre: string, lluvia: (i: number) => number | null, normal30Mm: number | null) {
  const fetchFn = (async () =>
    new Response(JSON.stringify(respuestaSimulada(lluvia)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const normales = normal30Mm === null ? null : {
    fuente: "prueba",
    atribucion: {} as never,
    modelo: "prueba",
    fechaGeneracion: hoy,
    periodo: { desde: "2016", hasta: "2025" },
    ventanaDias: 30,
    minimoAnios: 10,
    unidad: "mm" as const,
    distritos: {
      "1304": {
        nombre: "Chilanga",
        celdaModelo: { latitud: 13.67, longitud: -88.16, elevacionM: 500 },
        normal30: { "11-09": normal30Mm },
      },
    },
  };

  const r = await actualizarClima({
    puntos,
    fetchFn,
    normales: normales as never,
    emitirEventos: false,
  });
  console.log("  resumen:", JSON.stringify(r.distritos[0]?.resumen));
  console.log(nombre, JSON.stringify(r.distritos.map((d) => ({
    estado: d.estado,
    condicion: d.condicion,
    nivelSequia: d.nivelSequia,
    cambio: d.cambio,
    sinEvaluar: d.sinEvaluar,
  }))));
}

async function main() {
  const dia = Array.from({ length: 30 }, (_, i) => {
    const f = new Date(Date.UTC(2026, 9, 11 + i)).toISOString().slice(0, 10);
    return { fecha: f, precipitacionMm: 20, completo: true };
  });
  console.log("  clasificar directo:", JSON.stringify(clasificarLluvia(dia, 240, "INVIERNO_ACEPTABLE")));

  await caso("sin lluvia (sequía por días secos):", () => 0, 100);
  await caso("lluvia normal (invierno aceptable):", () => 8, 240);
  await caso("mucha lluvia (exceso):", () => 20, 240);
  await caso("sin normal (solo días secos):", () => 0, null);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});