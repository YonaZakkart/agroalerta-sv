# Mapa v2 — plan vigente desde la Parte 3

- **Versión:** 2.0
- **Fecha:** 31 de octubre de 2026
- **Fuente original:** `docs/Mapa_v2.txt`
- **Estado:** vigente. Las Partes 0, 1 y 2 conservan su registro en `Estado_del_Proyecto.txt`.
- **Última revisión de estado:** 14 de noviembre de 2026

> Este documento ordena el Mapa v2 y marca el avance real. El texto original sigue en `Mapa_v2.txt`; ante una contradicción, prevalece el código y se anota aquí.

---

## 0. Por qué cambia el mapa

1. Se pide presentar al menos **dos vistas** del frontend y el frontend no había empezado. En el Mapa v1 todo el frontend quedaba al final (Parte 6).
2. El v2 adelanta la base del frontend y dos vistas (login/registro y dashboard), que solo necesitan endpoints existentes, para avanzar en paralelo con la Parte 3.
3. Agrega **3-0** (preparación de la Parte 3) con los pendientes que la bloqueaban: coordenadas por distrito, eventos y umbrales de lluvia.
4. Reparte los pendientes de 2-END en las partes donde se necesitan.
5. No cambian el stack, el diseño visual base ni la arquitectura orientada a eventos.

**Fechas:** entrega final entre el 13 y el 20 de noviembre; presentación mínima el 6 de noviembre con dos vistas. El Hito 1 se cerró antes de esa fecha.

---

## 1. Punto de partida (31 de octubre de 2026)

**Backend hecho:**

- Autenticación completa: registro, verificación simulada, login, `GET /auth/yo` con distrito y municipio.
- Catálogo de 2 municipios y 26 distritos.
- 312 áreas de viabilidad de CENTA.
- `GET /viabilidad/distritos/:id`.
- Bus de eventos con `AgricultorRegistrado`.

**Frontend hecho:** proyecto Angular generado y bases visuales HTML; sin conexión con el backend.

**Faltaba:** CORS o proxy, listado de distritos, clima, siembra, estimación y todo el frontend real.

---

## 2. Hitos

| Hito | Contenido | Estado al 14/11/2026 |
|---|---|---|
| **Hito 1** — demo mínima con datos reales | 6-0, 6-A, 6-B: login, registro y dashboard con viabilidad real | ✅ cerrado |
| **Hito 2** — clima real | 3-0 a 3-D, 6-D (Clima Zonal) y encabezado con clima | ✅ cerrado (3 completo; 6-D implementado) |
| **Hito 3** — siembra y estimación | 4-A a 4-D, 5-A a 5-D, 6-C (Historial), 6-E (estimación real) | ⏳ pendiente |
| **Hito 4** — cierre | Parte 7 | ⏳ pendiente |

Los hitos 2 y 3 dependen de datos de referencia que no vienen de CENTA (sección 5). Hay que conseguirlos desde ya.

---

## 3. Pistas de trabajo

| Pista | Contenido | Estado |
|---|---|---|
| 1 | Frontend base y autenticación: 6-0, 6-A | ✅ |
| 2 | Frontend dashboard: 6-B, luego 6-D y 6-E | 6-B y 6-D ✅; 6-E ⏳ |
| 3 | Backend de clima: 3-0 y 3-A a 3-D | ✅ |
| 4 | Datos de referencia y siembra: documento de datos, 4-A y 4-C | ⏳ |

---

## 4. Partes

### Parte 3 — Integración climática (Open-Meteo) + eventos

**Dependencias:** 3-0 primero; 3-A necesita coordenadas; 3-B necesita umbrales.

#### 3-0 — Preparación (M, sin dependencias) ✅

- **3-0a — Eventos:** definir en `events/types.ts` nombres y payload de `ActualizacionMeteorologica`, `CondicionClimaticaActualizada` y `SiembraRegistrada`. Una sola persona edita, solo agrega.
- **3-0b — Coordenadas:** revisar las columnas `x`/`y` de los exports de CENTA y su sistema de coordenadas. Si no sirven, definir otra fuente y documentarla. Implica `latitud`/`longitud` en `Distrito`, migración, CSV limpios y seed.
- **3-0c — Umbrales y temporadas:** documento con los rangos de lluvia para clasificar sequía, exceso o invierno aceptable, y las ventanas de primera y postrera.

#### 3-A — Cliente de Open-Meteo por distrito (M) ✅

`fetch` nativo de Node (sin dependencias), timeout, manejo de errores y coordenadas de 3-0b. Verificar términos de uso, atribución y parámetros en la documentación oficial antes de fijar el contrato.

#### 3-B — Clasificación de la condición climática (M) ✅

Función pura con los umbrales de 3-0c; modelo y migración para guardar la última condición y la hora de actualización por distrito.

#### 3-C — Emisión de eventos (S) ✅

`ActualizacionMeteorologica` en cada consulta y `CondicionClimaticaActualizada` solo cuando la condición cambia. La decisión de la cuarta salida se resolvió con `null` y sin evento.

#### 3-D — Actualización periódica y endpoint (M) ✅

Job con `setInterval` que arranca con el servidor y tolera fallos de red; `GET /clima/distritos/:id` protegido con `requireAuth`, que devuelve condición, precipitación y hora de actualización. El job y el manejo de 429/502 se completaron en `feat/pendientes-backend` (PR #44).

**Archivos compartidos:** `schema.prisma` y `migrations/` (3-0b y 3-B), `events/types.ts` (3-0a), `index.ts` (3-D). Migraciones en secuencia, nunca en ramas paralelas.

---

### Parte 4 — Siembra + formulario detallado

**Dependencias:** Usuario y Viabilidad (listos); 4-C necesita precios (F3); 4-B necesita 6-0.

| Punto | Contenido | Tamaño | Estado |
|---|---|---|---|
| 4-A | Modelo de Siembra y migración: usuario, distrito, cultivo, estado, fecha, área en manzanas, semilla, alquiler, maquinaria, riego, inversión | M | ⏳ |
| 4-B | Formulario de siembra en Angular, diseño de `dashboard_base.html`, dos grupos (agronómico y técnico), estimado de inversión previo | L | ⏳ |
| 4-C | Estimación de costos: precios promedio y dosis por manzana, redondeo hacia arriba, con fuente y fecha | M | ⏳ |
| 4-D | Evento `SiembraRegistrada` e historial: `POST /siembras` y `GET /siembras` protegidos | M | ⏳ |

**Archivos compartidos:** `schema.prisma`, `migrations/`, `events/types.ts`, `index.ts`.

**Decisión pendiente:** si el formulario usa el distrito registrado o permite elegir otro.

---

### Parte 5 — Estimación y recomendaciones (núcleo EDA)

**Dependencias:** 3-C, 4-D y datos F1 y F4. El núcleo orientado a eventos no se diluye.

| Punto | Contenido | Tamaño | Estado |
|---|---|---|---|
| 5-A | Listeners de `SiembraRegistrada` y `CondicionClimaticaActualizada` | M | ⏳ |
| 5-B | Proyección de rendimiento base por cultivo y área, más ajuste climático; los porcentajes son supuestos documentados | M | ⏳ |
| 5-C | Recomendaciones por riesgo (verde, amarillo, rojo); la viabilidad de CENTA se cita como referencia distrital, no como veredicto sobre la parcela | M | ⏳ |
| 5-D | Persistencia y exposición: reporte, última estimación e historial | M | ⏳ |

---

### Parte 6 — Frontend (adelantado y repartido por hitos)

**Diseño:** `login_base.html` y `dashboard_base.html` son la referencia visual (colores, Plus Jakarta Sans, espaciado, estructura). El sidebar pasó del “checkbox hack” a estado de componente.

| Punto | Contenido | Tamaño | Estado |
|---|---|---|---|
| 6-0 | Base de Angular: rutas, configuración, estilos, servicio de auth, interceptor, guards, modelos | M | ✅ |
| 6-A | Login y registro conectados: distrito por nombre, detalles del 400, 403/409, verificación simulada | M | ✅ |
| 6-B | Layout y dashboard: sidebar, header con usuario, KPI, viabilidad real, estimación vacía | L | ✅ |
| 6-C | Historial de evaluaciones (depende de 4-D y 5-D) | M | ⏳ |
| 6-D | Clima Zonal y Configuración básica (depende de 3-D) | M | ✅ Clima Zonal; Configuración ⏳ |
| 6-E | Dashboard con estimación real (depende de 5-D) | M | ⏳ |

**Hito 1 = 6-0 + 6-A + 6-B.** ✅

**Archivos compartidos del frontend:** `app.routes.ts`, `app.config.ts`, `styles.css` y `package.json`. Por eso 6-0 se hizo primero y rápido.

**Trabajo posterior al Hito 1:**

- `feat/hito2-clima-zonal` (PR #48): vista `/clima-zonal`, `ClimaService` y clima compacto en el encabezado.
- `feat/frontend-responsive-polish` (PR #49): tokens de espaciado y colores semánticos de clima.
- `fix/ng0203-takeuntil-destroyed` (PR #50): `DestroyRef` en las llamadas a `takeUntilDestroyed`.

---

### Parte 7 — Integración final, Docker y despliegue

**Dependencias:** casi todo lo anterior; 7-A puede empezar tras 6-0.

| Punto | Contenido | Tamaño | Estado |
|---|---|---|---|
| 7-A | Docker Compose con backend, base de datos y frontend | M | ⏳ |
| 7-B | Producción: secretos propios, TLS hacia MySQL (sin `allowPublicKeyRetrieval`), CORS final, rate limiting, `EXPONER_TOKEN_VERIFICACION=false` | M | ⏳ |
| 7-C | Pruebas automatizadas y de flujo completo; separar `app` de `listen` | M | ⏳ |
| 7-D | Documentación final y README de despliegue | M | ⏳ |

---

## 5. Datos de referencia que no están en CENTA

Bloquean 3-B, 4-C y 5-B. Deben documentarse con fuente, fecha, formato y contrato.

| Clave | Dato | Uso |
|---|---|---|
| **F1** | Rendimiento estándar por cultivo (maíz, frijol, maicillo) en qq/mz | 5-B |
| **F2** | Umbrales de lluvia para sequía, exceso o invierno aceptable; ventanas de primera y postrera | 3-B (parcial) |
| **F3** | Precios promedio de insumos, dosis por manzana, jornales, alquiler, maquinaria y riego | 4-C |
| **F4** | Precio de venta por quintal | 5-B |

Fuentes candidatas: guías técnicas de CENTA por cultivo y publicaciones de precios del MAG. Todo valor lleva fuente y fecha. Si un dato no se consigue, se presenta como **supuesto declarado**, nunca como dato oficial.

---

## 6. Pendientes de 2-END y dónde caen

| Pendiente | Dónde cae | Estado |
|---|---|---|
| C1 — Listado de distritos | 6-A si el registro usa select (endpoint público) | ✅ `GET /distritos` |
| C2 — Coordenadas | 3-0b | ✅ |
| C3 — Eventos | 3-0a | ✅ |
| D1 — Capa sensible a mayúsculas y cultivo no | Ajuste en viabilidad | ✅ normalización |
| Bloque E — Pruebas automatizadas | 7-C | ⏳ (hay pruebas unitarias, faltan E2E) |
| Bloque F — Datos de referencia | Sección 5 | ⏳ |
| Bloque G — Documentación | Rama `docs` después de cada hito | ✅ (esta reorganización) |

**Fuera de alcance por ahora:** envío real de correo, validación del dígito verificador del DUI, `GET /health` con verificación de base (ya implementado en PR #44), decisión sobre Prettier.

---

## 7. Reglas de la demo

1. Ningún valor de ejemplo de `dashboard_base.html` (45 qq/mz, +5 %, 180–220 mm, $1,900, $2,970) se muestra como dato real. Mientras no exista la Parte 5, el panel de estimación se rotula como ejemplo ilustrativo o se deja vacío.
2. Lo que se muestre de CENTA se cita como referencia distrital.
3. Lo simulado (verificación sin correo) se declara en la presentación.
4. La atribución de Open-Meteo y GeoNames debe mostrarse donde se usen sus datos.

---

## 8. Riesgos y recortes

Orden de recorte si falta tiempo (de lo primero que se sacrifica a lo último):

1. Pruebas automatizadas completas (se mantienen las manuales documentadas).
2. Configuración y Clima Zonal como vistas propias.
3. Historial.
4. Actualización periódica del clima (se deja la consulta bajo demanda).
5. Recomendaciones con reglas mínimas.

**No se recorta:** Hito 1.

**Puntos calientes de merge:** `schema.prisma` y `migrations/` (Partes 3 y 4 en secuencia), `events/types.ts`, `index.ts` y los cuatro archivos compartidos del frontend. Quien mergee segundo regenera su migración sobre `main`.

---

## 9. Correcciones al texto original

El `Mapa_v2.txt` contiene tres defectos de redacción que no cambian el plan:

- Una frase suelta: “este cambio debe documentarse en Estado_del_Proyecto.txt”.
- “se rebalancea..” al final de las pistas.
- Una línea de fecha entre corchetes.

Se corrigen aquí; el `.txt` se conserva como historia.
