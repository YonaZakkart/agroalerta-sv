# Historia — Parte 3: clima, eventos y estabilización

- **Periodo:** 1 a 13 de noviembre de 2026
- **Fuente:** `docs/Estado_Proyecto_Pt2.txt`, sección «Parte 3», y `git log`
- **Estado:** ✅ cerrada (3-0a, 3-0b, 3-0c, 3-A, 3-B, 3-C, 3-D y el job periódico)

## Resumen

| Punto | Rama | Responsable | Resultado |
|---|---|---|---|
| 3-0b | `feat/3-0b-coordenadas` | Requeno | Latitud/longitud por distrito desde GeoNames |
| 3-0c | `docs/3-0c-umbrales-temporadas` | Smith | `Info_Datos_Clima.md` con umbrales y supuestos |
| 3-0a | `feat/3-0a-eventos` | Pocho | Payloads de clima y siembra |
| 3-A | `feat/3-a-cliente-open-meteo` | Requeno | Cliente Open-Meteo y normales |
| 3-B | `feat/3-b-clasificacion-clima` | Smith | Clasificación pura y `CondicionDistrito` |
| 3-C | `feat/3-c-orquestador-clima` | Josué | Orquestador y emisión de eventos |
| 3-D | `feat/3-d-endpoint-clima` | Josué | `POST /clima/actualizar` |
| Cierre | `fix/correccion-pendientes-y-bugs` | Yona | 8 bugs de backend y frontend |
| Cierre | `feat/pendientes-{backend,frontend,transversal}` | Yona | Job, `GET /clima/distritos/:id`, CORS, rate limit, CI |

---

## 3-0b — Coordenadas por distrito

**Rama:** `feat/3-0b-coordenadas` · **Responsable:** Requeno · **1 de noviembre de 2026**

Las columnas `x` e `y` de los exports de CENTA venían **vacías**, así que no servían. Se eligió **GeoNames** (`SV.txt`, CC BY 4.0), filtrado por Morazán (`admin1 08`) para evitar homónimos como San Carlos o San Isidro de otros departamentos. Punto representativo: la cabecera del distrito.

- `Distrito.latitud` y `Distrito.longitud` (`Decimal(9,6)`, **opcionales**): una columna obligatoria rompería la migración en las bases existentes.
- Migración `add_coordenadas_distrito`.
- `data/referencia/coordenadas_distritos.csv` con fuente, fecha y nota por distrito.
- `limpiar-centa.ts` y `cargar-centa.ts` validan y cargan las 26 coordenadas.
- Límites de cordura: latitud 13.55–14.02 y longitud -88.30–-87.90 (no son límites oficiales).

**Casos especiales:** El Rosario tiene tres localidades en Morazán; se eligió la más cercana al punto de Wikipedia. Yamabal y Sensembra compartían punto en GeoNames; se usó el centro de la huella de la iglesia en OpenStreetMap.

**Pendiente:** verificar 15 distritos con una segunda fuente y mostrar la atribución a GeoNames.

---

## 3-0c — Umbrales y temporadas

**Rama:** `docs/3-0c-umbrales-temporadas` · **Responsable:** Smith · **2 de noviembre de 2026**

Solo documentación. `docs/data/Info_Datos_Clima.md` fija:

- Tipos de valor: `OFICIAL_MARN`, `SECUNDARIA`, `SUPUESTO`.
- Bandas por días secos consecutivos del MARN: débil ≤ 10, moderada 11–15, fuerte 16–20, severa ≥ 21.
- Supuestos declarados: día seco < 1 mm, sequía con razón < 0.60, exceso ≥ 1.50, guarda de normal mínima de 20 mm, ventanas de primera (01-05 a 30-06) y postrera (01-08 a 30-09).
- Contrato de entrada y salida para 3-B.

**Lo que no se consiguió:** cifras oficiales de los cortes por porcentaje, el límite inferior de «débil» y los requerimientos hídricos por etapa. Se presentan como supuestos, no como dato oficial.

---

## 3-0a — Eventos

**Rama:** `feat/3-0a-eventos` · **Responsable:** Pocho · **3 de noviembre de 2026** · PR #33

Se agregaron a `events/types.ts`, **solo agregando**:

| Evento | Payload |
|---|---|
| `ActualizacionMeteorologica` | `distritoId`, `fecha`, `precipitacionMm`, `fuente` |
| `CondicionClimaticaActualizada` | `distritoId`, `condicion`, `condicionAnterior`, `precipitacionAcumuladaMm`, `fecha` |
| `SiembraRegistrada` | `siembraId`, `usuarioId`, `distritoId`, `cultivo`, `areaMz`, `fecha` |

`condicionAnterior` admite `null`; `cultivo` es `string` hasta que exista el modelo de siembra. El nombre `EXCESO_LLUVIA` quedó alineado con el código, aunque el documento de datos todavía diga `EXCESO`.

---

## 3-A — Cliente de Open-Meteo

**Rama:** `feat/3-a-cliente-open-meteo` · **Responsable:** Requeno · **4 de noviembre de 2026**

Verificación de la documentación oficial: plan gratuito no comercial, CC BY 4.0 con atribución, archivo ERA5 desde 1940 y `past_days` de 0 a 92.

- `config.ts`, `tipos.ts`, `errores.ts`: URLs, zona horaria, ventana de 30 días, timeouts, atribución y `ErrorOpenMeteo` con seis tipos.
- `open-meteo.client.ts`: `fetch` nativo, **una sola petición para los 26 puntos**, `AbortSignal.timeout`, respuesta en lista u objeto y `null` conservado. Sin reintentos.
- `normales.ts` / `normales-archivo.ts`: normal de 30 días por distrito.
- `clima-actual.ts`: serie diaria + normal (o `null`) en una llamada.
- `puntos.ts`: lee coordenadas de la base; `null` es error.
- `generar-normales.ts` (`clima:normales`), `probar-open-meteo.ts` (`clima:probar`) y 17 pruebas sin red.

**Decisiones:** no redondear a celdas de 0.1° (desplazaría hasta 5 km por eje); devolver la serie completa y no valores ya resumidos; guardar la normal en JSON versionado para que 3-B sea la única migración de la Parte 3.

**Incidencias:** Open-Meteo respondió **429** al generar las normales; se agregó pausa de 8 s y reintento con espera de 65 s. Resultado: 26 distritos × 365 claves.

---

## 3-B — Clasificación climática

**Rama:** `feat/3-b-clasificacion-clima` · **Responsable:** Smith · **7 de noviembre de 2026**

Decisiones de arranque:

1. **Sin cuarta salida:** fuera de época `condicion = null` y no se emite evento. No se tocó `events/types.ts`.
2. `EXCESO_LLUVIA` es el nombre válido.
3. Anti-oscilación de 0.05 sobre `razon30`; los días secos no llevan margen.
4. `null` corta el conteo de días secos; si falta un día de la ventana, `acumulado30Mm` es `null`. **Nunca se trata `null` como 0.**
5. `DEBIL` existe en el tipo pero no se produce (`DSC_DEBIL_MIN = null`).
6. Todos los umbrales en `umbrales.ts`, con tipo y sección de origen.

Archivos: `umbrales.ts`, `resumen-lluvia.ts`, `clasificacion.ts`, `condicion.repo.ts`, 24 pruebas sin red y `clasificar-probar.ts`.

Modelo `CondicionDistrito` (una fila por distrito) y migración `add_condicion_distrito`: condición, nivel, días secos, acumulados, razón, `fechaDatos`, `actualizadoEn` y `condicionDesde`. `condicionDesde` solo cambia cuando cambia la condición; entrar a `null` no cuenta como cambio.

**Resultado real del 6 de noviembre:** 23 distritos `INVIERNO_ACEPTABLE` y 3 `SEQUIA` por déficit (1305, 1314, 1315); ningún exceso; ningún nivel de sequía por días secos. La razón se concentró por debajo de 1 (mediana ≈ 0.78), probablemente por el sesgo entre ERA5 y los modelos de pronóstico y por la transición lluviosa a seca. No se calibró nada con ese resultado.

**Incidencias:** `P1012` por escribir la relación inversa en la misma línea que otro campo; las primeras corridas de `clima:clasificar` no imprimían nada porque el archivo no se había guardado completo.

---

## 3-C — Orquestador

**Rama:** `feat/3-c-orquestador-clima` · **Responsable:** Josué · **13 de noviembre de 2026**

`actualizarClima()` es el único punto que consulta, clasifica, guarda y emite:

1. Lee la condición anterior.
2. Clasifica con `clasificarLluvia`.
3. Guarda con `guardarCondicion`.
4. Emite **después** de guardar.

- `ActualizacionMeteorologica` en cada consulta con lluvia del último día completo.
- `CondicionClimaticaActualizada` solo cuando cambia a una condición evaluada.
- `SIN_DATOS`: no guarda ni emite.
- Si el último día completo no tiene precipitación, **no se emite** la actualización y se avisa por consola.
- Un cerrojo en memoria serializa las ejecuciones dentro del proceso.

Cambios coordinados: `obtenerClimaActual` devuelve `fechaUltimoDiaCompleto: null` en lugar de lanzar; `precipitacionAcumuladaMm` admite `null`.

**Prueba:** `orquestador.prueba.ts` con Open-Meteo simulado, 6 casos.

---

## 3-D — Endpoint y job

**Rama:** `feat/3-d-endpoint-clima` · **Responsable:** Josué · **13 de noviembre de 2026**

- `POST /clima/actualizar` con `requireAuth`: sin cuerpo actualiza los 26 distritos; con `distritoIds`, solo esos.
- 400 para listas inválidas o distritos inexistentes; 500 sin `error.message`.

El **job con `setInterval`** se completó después, en `feat/pendientes-backend` (PR #44): intervalo mínimo de 1 hora, arranque con el servidor, parada en el cierre ordenado y pausa de dos ciclos ante un 429.

---

## Cierre técnico — `fix/correccion-pendientes-y-bugs`

**Responsable:** Yona · **13 de noviembre de 2026**

Ocho correcciones, cada una con prueba:

1. `PORT` se interpretaba como ruta de socket Unix (`listen("3000")`); ahora se valida como entero TCP y se maneja el evento `error`.
2. Rutas inexistentes y JSON mal formado devolvían HTML; ahora devuelven el contrato `{ error, detalles }`.
3. `distritoIds` vacío o con distritos inexistentes terminaba en 500; ahora es 400.
4. El interceptor enviaba el token a orígenes externos; ahora solo al API propio.
5. Un 401 no limpiaba el perfil anterior; ahora el interceptor llama `perfil.limpiar()`.
6. El servidor SSR tenía el mismo defecto de `PORT`.
7. Si `/auth/yo` fallaba, el dashboard se quedaba cargando; ahora muestra alerta con reintento.
8. `npm test` era el placeholder de npm; ahora encadena las suites sin red.

**Resultado:** 53 pruebas de backend y 12 de frontend en verde.

---

## Estabilización — PR #44, #45 y #46

**Responsable:** Yona · **13 de noviembre de 2026**

### `feat/pendientes-backend` (PR #44)

- `GET /clima/distritos/:id` con la última condición guardada.
- Job periódico cada hora, con pausa doble tras un 429.
- Rechazo de cuerpos no JSON y aislamiento de errores de listeners.
- Validación del archivo de normales y escritura atómica.
- `condicionDesde` se conserva al entrar a «sin evaluación».
- Errores de Open-Meteo mapeados a 502 y 429 con `Retry-After`.
- Validación de `JWT_EXPIRES_IN`, `DUI_PEPPER` y `EXPONER_TOKEN_VERIFICACION` al arrancar.
- Fuente y fecha de viabilidad tomadas de la misma fila.
- CORS opt-in, límite de cuerpo, cabeceras de seguridad y rate limit en memoria.
- `GET /health` con verificación de base y `GET /health/live`.
- Cierre ordenado de servidor, job y Prisma.

### `feat/pendientes-frontend` (PR #45)

- SSR acepta solo `localhost`, `127.0.0.1` y `[::1]` por defecto.
- Tokens vencidos descartados al arrancar e `invitadoGuard`.
- Mensajes para 403, 413, 429 y 5xx; timeout de 15 s.
- Dashboard sin datos obsoletos, con reintento y navegación por teclado.

### `feat/pendientes-transversal` (PR #46)

- README corregido, `.gitattributes`, scripts `typecheck`, plantilla de PR y CI en GitHub Actions.

---

## Estado al cerrar la Parte 3

- Clima completo: coordenadas, cliente, clasificación, orquestador, endpoint, job y lectura.
- 18 archivos de pruebas de backend; 9 archivos y 30 casos de frontend.
- Supuestos de umbrales sin validar con CENTA ni con un agrónomo.
- Atribución de Open-Meteo devuelta por la API, pero todavía no mostrada en la interfaz.
