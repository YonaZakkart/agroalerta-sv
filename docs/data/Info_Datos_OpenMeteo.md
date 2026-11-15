# Info_Datos_OpenMeteo – Cliente de Open-Meteo (3-A)

Documento del cliente que consulta la lluvia por distrito. Complementa `Info_Datos_Clima.md` (umbrales y supuestos de 3-0c) y `Info_Datos_Coordenadas.md` (los puntos que se consultan).
Documentación oficial consultada el 4 de noviembre de 2026.

## 1. Términos de uso y atribución

| Tema | Lo que dice la documentación | Efecto en el proyecto |
|------|------------------------------|-----------------------|
| Uso | API gratuita solo para uso no comercial: menos de 10.000 llamadas al día, 5.000 por hora y 600 por minuto. El contenido educativo y las apps sin suscripciones ni anuncios cuentan como no comercial. | El proyecto es una cátedra, sin cobro ni anuncios: aplica el plan gratuito. Si algún día se comercializa, hay que pasar a un plan de pago. |
| Licencia de los datos | CC BY 4.0. | Hay que atribuir. |
| Atribución | Un enlace a Open-Meteo junto a cualquier lugar donde se muestren sus datos (ej. "Weather data by Open-Meteo.com"). | El cliente devuelve la atribución en cada resultado (`atribucion`) para que viaje hasta la interfaz. Mostrarla es trabajo de 6-D o 7-D. |
| Privacidad | Los logs del servidor pueden guardar las coordenadas consultadas durante 90 días. | Solo se envían los 26 puntos de distrito. Nunca la ubicación de un agricultor. |
| Clave | No se necesita clave en el plan gratuito. | No se envía `apikey`. |

Estimación de uso: 26 puntos cada 30 minutos son 1.248 llamadas al día contando cada punto como una llamada, muy por debajo del límite diario. Cada 15 minutos serían 2.496.

## 2. Servicios usados

### 2.1 Lluvia reciente (API de pronóstico, `past_days`)

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=<lat1>,<lat2>,...&longitude=<lon1>,<lon2>,...
    &daily=precipitation_sum
    &timezone=America%2FEl_Salvador
    &past_days=30&forecast_days=1
```

- `past_days` admite de 0 a 92 días. Se usan 30, la ventana de `Info_Datos_Clima.md` (sección 4).
- `forecast_days=1` agrega hoy. El día de hoy llega **incompleto**: el cliente lo marca con `completo: false`.
- `timezone` es obligatoria cuando se piden variables diarias. `America/El_Salvador` es el nombre IANA de la zona.
- Para El Salvador, "best match" usa modelos globales (resolución de 9 a 25 km).

### 2.2 Lluvia histórica (API de archivo, para la normal)

```
GET https://archive-api.open-meteo.com/v1/archive
    ?latitude=<lat>&longitude=<lon>
    &start_date=2001-01-01&end_date=2020-12-31
    &daily=precipitation_sum&timezone=America%2FEl_Salvador&models=era5
```

- Reanálisis ERA5 (0.25°, desde 1940, con 5 días de retraso). ERA5-Land (0.1°) **no trae precipitación propia** (usa la de ERA5), así que se usa ERA5.
- La documentación recomienda un único reanálisis (ERA5 o ERA5-Land) para series de varias décadas, por consistencia.
- No sirve para los últimos 5 días: eso lo cubre 2.1.

## 3. Comportamiento de la respuesta (según la documentación)

- Con **varias coordenadas** separadas por coma, la respuesta es una **lista** en el mismo orden en que se pidieron. Con **una sola**, es un **objeto**. El cliente maneja ambos casos.
- `latitude` y `longitude` de la respuesta son el **centro de la celda del modelo**, que puede estar a unos kilómetros del punto pedido. Por eso las series se emparejan por **posición**, no por coordenada. El cliente las expone como `celdaModelo`.
- Un parámetro mal escrito devuelve HTTP 400 con `{ "error": true, "reason": "..." }`. El cliente lo convierte en `ErrorOpenMeteo` de tipo `HTTP` con el motivo.
- La unidad de `precipitation_sum` es mm. El cliente rechaza cualquier otra unidad.
- Los valores pueden ser `null`. Se conservan como `null` y no se tratan como 0.

## 4. Contrato del módulo (`backend/src/clima/`)

Punto de entrada: `index.ts`. Quien use el clima (3-B, 3-C, 3-D) importa de ahí y no necesita conocer Open-Meteo.

| Función | Qué hace |
|---------|----------|
| `leerPuntosDistrito(ids?)` | Lee de la base los puntos. `latitud` y `longitud` llegan como `Decimal \| null`: se convierten con `toNumber()` y `null` es error (`COORDENADA_INVALIDA`). |
| `obtenerClimaActual(puntos, opciones?)` | Una llamada: serie diaria de lluvia + normal de 30 días por distrito. Es el punto de entrada recomendado. |
| `consultarLluviaReciente(puntos, ...)` | Solo la serie reciente de todos los puntos en **una** petición. |
| `consultarLluviaHistorica(puntos, desde, hasta)` | Serie histórica (ERA5). La usa el generador de normales. |
| `calcularNormal30(serie)`, `obtenerNormal30(tabla, fecha)` | Funciones puras de la normal. |
| `leerArchivoNormales()` | Lee `backend/data/referencia/normales_lluvia_30d.json`. |

Resultado de `obtenerClimaActual`:

```
ClimaActual {
  fuente, atribucion { texto, url, licencia, urlLicencia },
  consultadoEn, zonaHoraria, fechaLocal,
  fechaUltimoDiaCompleto,   // fin de la ventana de 30 días (normalmente ayer)
  normalDisponible,         // false si aún no existe el archivo de normales
  distritos: [{
    distritoId,
    celdaModelo { latitud, longitud, elevacionM },
    diario: [{ fecha, precipitacionMm | null, completo }],
    normal30Mm | null
  }]
}
```

Qué hace cada quien con esto:

- **3-B (clasificación):** deriva `diasSecosConsecutivos` y `acumulado30Mm` de `diario` con una función pura propia (por ejemplo `resumirLluvia(serie)`), usando solo los días con `completo: true`. Los umbrales viven en 3-B, no aquí. Si `normal30Mm` es `null`, clasifica solo con los días secos.
- **3-C / 3-D (orquestador, job y endpoint):** llaman a `obtenerClimaActual`, pasan el resultado a 3-B, guardan y emiten. Deben capturar `ErrorOpenMeteo` y decidir si reintentan; el cliente **no reintenta**.

## 5. La normal de 30 días

Definición: para una fecha F, el promedio sobre los años del periodo de la lluvia acumulada en los 30 días que terminan en F (F incluida).

- Periodo por defecto: 2001 a 2020. Modelo: ERA5.
- Un año se descarta para una fecha si algún día de su ventana no tiene dato. Se exige un mínimo de 10 años válidos; si no se llega, el valor es `null`.
- El 29 de febrero no tiene clave propia: se usa el 28.
- Se guarda en `backend/data/referencia/normales_lluvia_30d.json` (no en la base, para no tocar `schema.prisma`), con la fuente, el modelo, el periodo y la fecha de generación, y con la celda del modelo de cada distrito.
- Se genera una sola vez con `npm run clima:normales` y se versiona. El script hace una petición por distrito, con pausa, y si recibe 429 se detiene conservando lo ya guardado (al repetirlo retoma los que faltan).

## 6. Errores

El cliente lanza `ErrorOpenMeteo` con un `tipo`:

| tipo | cuándo |
|------|--------|
| `COORDENADA_INVALIDA` | punto sin coordenadas, repetido o fuera de rango; no se llegó a consultar |
| `PARAMETRO_INVALIDO` | días o fechas fuera de lo que admite la API; no se llegó a consultar |
| `TIMEOUT` | sin respuesta en 10 s (30 s para el histórico) |
| `RED` | fallo de conexión |
| `HTTP` | la API respondió con error (`estadoHttp` trae el estado, por ejemplo 400 o 429) |
| `FORMATO` | la respuesta no tiene la forma documentada (unidad distinta, series de distinto largo, etc.) |

## 7. Recomendaciones para 3-D

- Los modelos globales se actualizan cada pocas horas (ECMWF cada 6 horas según la documentación): consultar más de una vez por hora no aporta datos nuevos. Un intervalo de 1 hora o más es razonable.
- Ante `TIMEOUT`, `RED` o `HTTP`: no reemplazar el último dato bueno por un error; reintentar en el siguiente ciclo.
- Ante `HTTP` con 429: esperar más de un ciclo.

## 8. Cómo probar

Desde `backend/`:

```bash
npm run clima:pruebas                                   # sin red, 17 pruebas con respuestas de ejemplo
npm run clima:probar                                    # API real, los 26 distritos
npm run clima:probar -- --distritos=1304,1318           # solo algunos
npm run clima:probar -- --historico=2024-01-01:2024-01-31
npm run clima:normales                                  # genera el archivo de normales
```

`clima:probar` y `clima:normales` necesitan las coordenadas en la base (`npm run datos:cargar`) y salida a internet.

## 9. Limitaciones y riesgos

- **Normal y lluvia reciente vienen de modelos distintos.** La normal sale de ERA5 (25 km) y la lluvia reciente de los modelos de pronóstico de Open-Meteo (resolución más fina). Ambas son de la misma fuente, pero no son el mismo conjunto de datos: puede haber un sesgo sistemático en la relación entre ambas. 3-B debe tratar la normal como referencia y no como medida exacta; el margen anti-oscilación ayuda a no reaccionar a diferencias pequeñas.
- **`models=era5`:** el nombre de ese parámetro no aparece en la tabla de parámetros de la documentación consultada. Debe confirmarse en la primera ejecución de `clima:probar -- --historico=...`: si es inválido, la API responde 400 con el motivo y el cliente lo muestra.
- **Conteo de llamadas del histórico:** no se confirmó cómo cuenta Open-Meteo las peticiones de rango largo. El generador de normales las hace una por distrito y con pausa por prudencia.
- **Resolución:** muchos distritos cercanos caen en la misma celda del modelo y reciben el mismo dato. Es una limitación del origen de los datos, no del cliente.
- **Un punto por distrito:** igual que en `Info_Datos_Coordenadas.md`.
- **Sin pruebas automáticas contra la API real:** las pruebas de `clima:pruebas` usan respuestas de ejemplo con la forma documentada; el contraste con la API real se hace a mano con `clima:probar`.

## 10. Atribución

Datos meteorológicos: Open-Meteo.com (https://open-meteo.com), licencia CC BY 4.0. Los datos históricos provienen del reanálisis ERA5 de ECMWF / Copernicus Climate Change Service. Debe mostrarse en la aplicación.
