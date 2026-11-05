// Configuración del cliente de Open-Meteo (3-A).
// Los valores salen de la documentación oficial, consultada el 4 de noviembre de 2026:
//   https://open-meteo.com/en/docs                        (pronóstico y últimos días)
//   https://open-meteo.com/en/docs/historical-weather-api (histórico, para la normal)
//   https://open-meteo.com/en/terms y https://open-meteo.com/en/licence

export const OPEN_METEO = {
    fuente: "Open-Meteo",
    urlPronostico: "https://api.open-meteo.com/v1/forecast",
    urlHistorico: "https://archive-api.open-meteo.com/v1/archive",
    // Zona horaria IANA de El Salvador. Obligatoria cuando se piden variables diarias.
    zonaHoraria: "America/El_Salvador",
    variableDiaria: "precipitation_sum",
    unidadEsperada: "mm",
    timeoutPronosticoMs: 10_000,
    timeoutHistoricoMs: 30_000,
    // Ventana de 30 días de Info_Datos_Clima.md (sección 4). La API admite hasta 92.
    diasPasados: 30,
    maxDiasPasados: 92,
    // 1 = hoy. El día de hoy llega incompleto (ver DiaLluvia.completo).
    diasPronostico: 1,
    maxDiasPronostico: 16,
    // Reanálisis usado para la normal. ERA5-Land no trae precipitación propia (usa la de ERA5),
    // y la documentación recomienda un solo reanálisis para series de varias décadas.
    modeloHistorico: "era5",
    maxPuntosPorPeticion: 100,
} as const;

// Licencia CC BY 4.0: hay que mostrar un enlace junto a cualquier lugar donde se muestren sus datos.
export const ATRIBUCION = {
    texto: "Weather data by Open-Meteo.com",
    url: "https://open-meteo.com/",
    licencia: "CC BY 4.0",
    urlLicencia: "https://open-meteo.com/en/licence",
} as const;
