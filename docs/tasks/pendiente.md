# Pendientes abiertos

- **Corte:** 24 de noviembre de 2026
- **Qué entra aquí:** lo que falta, lo que está bloqueado y lo que necesita una decisión del equipo.
- **Qué NO entra aquí:** el plan ordenado (está en `continuacion.md`) ni las mejoras opcionales (están en `ideas.md`).

Cada pendiente indica **qué bloquea**, **quién decide** y **dónde está el detalle**.

---

## 1. Decisiones del equipo

| # | Decisión | Bloquea | Propuesta | Estado |
|---|---|---|---|---|
| D1 | ¿La siembra usa el distrito del perfil o permite elegir otro? | 4-B | Permitir elegir, con el del perfil como valor inicial. | ✅ Aprobada (14/11/2026) |
| D2 | ¿Se mantiene la cuarta salida de clima como `null` o se agrega `SIN_EVALUACION` al enum? | 3-B, 5-A | Mantener `null`; cambiar el enum obliga a migración y a tocar el payload del evento. | ✅ Aprobada (14/11/2026) |
| D3 | ¿La primera clasificación de un distrito emite `CondicionClimaticaActualizada`? | 5-A | Sí, pero solo una vez por distrito; documentarlo. | ✅ Aprobada (14/11/2026) |
| D4 | ¿Se exige persistencia de N días antes de emitir un cambio de condición? | 5-A | No por ahora; el margen de 0.05 ya amortigua. | ✅ Aprobada (14/11/2026) |
| D5 | ¿Se conserva el SSR o se retira? | Parte 7 | Retirarlo: todas las rutas son `RenderMode.Client` y el servidor no aporta. | ⏳ Pendiente |
| D6 | ¿Se adopta Prettier? | Todo el código | No por ahora; el formato se respeta por archivo. | ⏳ Pendiente |
| D7 | ¿Se acepta el alias `sorgo` para `cultivo`? | API de viabilidad | No; CENTA lo llama sorgo y el proyecto maicillo. Si se acepta, va en la ruta. | ⏳ Pendiente |
| D8 | ¿Se cambia `GET /auth/verificar/:token` por `POST`? | Seguridad | Sí, antes de producción: un GET queda en historiales y logs. | ⏳ Pendiente |
| D9 | ¿Se define el peso de una bolsa de semilla? | 4-D, estimación en `BOLSAS` | Declarar un supuesto con fuente o restringir la unidad a `LIBRAS`. 4-C usa libras y no convierte. | ⏳ Pendiente |
| D10 | ¿Se guarda `inversionEstimadaUsd` en `Siembra`? | 4-D / 5-B | No por ahora: 4-C no persiste. Si se guarda, es otra migración. | ⏳ Pendiente |

**D1–D4 quedaron aprobadas el 14 de noviembre de 2026** con la propuesta indicada. D1 desbloqueó la Parte 4: 4-A, 4-B y 4-C ya están hechos; el siguiente es 4-D. El detalle de ejecución está en `continuacion.md` y en `history/branches/4-siembra.md`.

---

## 2. Datos de referencia

F1 y F4 ya existen (MAG 2022-2023); F2 sigue parcial. Los factores climáticos de 5-B son supuestos declarados. Deben tener **fuente, fecha, formato y contrato**.

| Clave | Dato | Uso | Estado |
|---|---|---|---|
| **F1** | Rendimiento estándar por cultivo (maíz, frijol, maicillo) en qq/mz | 5-B | ✅ Obtenido (MAG 2022-2023); revisar vigencia |
| **F2** | Umbrales de lluvia y ventanas de primera/postrera | 3-B | ⚠️ Parcial: solo supuestos |
| **F3** | Precios de insumos, dosis por manzana, jornales, alquiler, maquinaria y riego | 4-C | ✅ Obtenido (MAG 2022-2023); revisar vigencia |
| **F4** | Precio de venta por quintal | 5-B | ✅ Obtenido (MAG 2022-2023); revisar vigencia |

**F1/F4:** contrato en `data/Info_Datos_Estimacion.md`; implementación en `backend/src/estimacion/proyeccion.ts`. Los valores base son oficiales del ciclo 2022-2023; los factores de ajuste climático son **supuestos del equipo** y deben validarse con CENTA, un agrónomo o datos de campo.

**F3:** contrato en `data/Info_Datos_Precios.md`; implementación en `backend/src/estimacion/referencia.ts`. Los precios son promedios del ciclo 2022-2023, no una cotización actual. Actualizarlos a un ciclo más reciente sigue pendiente.

**Fuentes candidatas:** guías técnicas de CENTA por cultivo y publicaciones de precios del MAG.

**Regla:** si un dato no se consigue, se presenta como **supuesto declarado**, nunca como oficial. Un valor inventado presentado como real es peor que un pendiente.

---

## 3. Clima

| # | Pendiente | Detalle |
|---|---|---|
| C1 | Confirmar los supuestos de `Info_Datos_Clima.md` | Día seco < 1 mm, cortes 0.60/1.50, guarda de 20 mm, margen 0.05 y época 01-05 a 15-11. Requiere CENTA, un agrónomo o datos reales. |
| C2 | Límite inferior de la sequía «débil» | `DSC_DEBIL_MIN = null`; el MARN no lo confirma. Por eso `DEBIL` nunca se produce. |
| C3 | Umbrales oficiales de inicio de época lluviosa | Hoy son supuestos. |
| C4 | Requerimientos hídricos por etapa de maíz y frijol | Están en figuras de boletines del MARN; no se extrajeron. |
| C5 | Falsos positivos de sequía en la transición | Revisar resultados entre el 15 de octubre y el 15 de noviembre. |
| C6 | Alinear `EXCESO` con `EXCESO_LLUVIA` en `Info_Datos_Clima.md` | El contrato no se edita sin acuerdo; el código ya usa `EXCESO_LLUVIA`. |
| C7 | Verificar la clasificación fuera de época | Repetir `npm run clima:clasificar` después del 16 de noviembre y confirmar `condicion = null`. |
| C8 | Confirmar el conteo de condiciones guardadas | `SELECT COUNT(*) FROM condiciones_distrito` debe dar 26. |
| C9 | Revisar el sesgo normal vs. lluvia reciente | ERA5 (25 km) frente a modelos de pronóstico; la razón se concentra por debajo de 1. |

---

## 4. Datos y base de datos

| # | Pendiente | Detalle |
|---|---|---|
| B1 | Coordenadas: segunda fuente para 15 distritos | Cacaopera, Corinto, Chilanga, Delicias de Concepción, Jocoaitique, Lolotiquillo, Meanguera, Osicala, Perquín, San Carlos, San Fernando, San Francisco Gotera, San Isidro, Sociedad y Yoloaiquín. |
| B2 | `Info_Datos_CENTA.md` sigue diciendo que las coordenadas están pendientes | Ya existen desde 3-0b; el contrato no se edita sin acuerdo. |
| B3 | Temporadas en la viabilidad | 2-C no cubre primera ni postrera. |
| B4 | Alias de cultivo y normalización | Ya resuelto con `normalizarNombre`; falta decidir el alias «sorgo». |
| B5 | Respaldo y restauración | No hay estrategia; hace falta para la Parte 7. |
| B6 | Pruebas de integración con MySQL real | Hoy las pruebas no tocan base de datos. |
| B7 | Validar los factores climáticos de 5-B | Son supuestos del equipo (sequía 0.50–0.95, exceso 0.90); contrastar con CENTA, un agrónomo o datos de campo. |
| B8 | Validar el semáforo de 5-C | Verde/amarillo/rojo por condición y nivel es una decisión del equipo; contrastar con CENTA o un agrónomo. |

---

## 5. Seguridad

| # | Pendiente | Riesgo |
|---|---|---|
| S1 | Validar el dígito verificador del DUI | Hoy solo se valida el formato de 9 dígitos. |
| S2 | Revocación de sesión o refresh token | Un token robado es válido hasta expirar; el logout es solo del cliente. |
| S3 | Rate limit compartido entre instancias | El actual es un `Map` en memoria por proceso. |
| S4 | Envío real de correo | La verificación es simulada; `EXPONER_TOKEN_VERIFICACION` nunca debe estar activo en producción. |
| S5 | Rotación de `DUI_PEPPER` y `JWT_SECRET` | Rotar el pepper invalida los hashes; rotar el secreto invalida las sesiones. Falta un plan. |
| S6 | Revisión de `npm audit` | 9 vulnerabilidades en backend y 18 en frontend (mayoría de desarrollo). No usar `npm audit fix` sin acuerdo. |
| S7 | Scripts bloqueados por `allowScripts` | Cuatro paquetes del frontend; revisar si alguna vez falla `ng build`. |
| S8 | CORS y hosts reales | `CORS_ORIGINS` y `NG_ALLOWED_HOSTS` están implementados, pero sin los valores de producción. |
| S9 | TLS hacia MySQL | En producción no se usa `allowPublicKeyRetrieval`. |

---

## 6. Frontend

| # | Pendiente | Detalle |
|---|---|---|
| F-3 | Vista de Configuración | Parte de 6-D; solo lectura salvo decisión contraria. |
| F-4 | Atribución de Open-Meteo y GeoNames | Requisito de licencia; el backend ya devuelve la de Open-Meteo. |
| F-5 | Favicon y logotipo propios | Hoy se usa el favicon por defecto de Angular. |
| F-6 | Pruebas de componentes y E2E | Solo hay pruebas de servicios, guards e interceptor. |
| F-7 | Prueba en teléfono real, Safari/iOS y lector de pantalla | No se ha hecho. |
| F-8 | Decidir el guard inverso y la validación de vigencia | `invitadoGuard` y descarte de tokens vencidos ya existen; falta revisar el caso de token vencido al entrar al dashboard. |
| F-9 | Mostrar el estimado de inversión en el formulario de siembra | Depende de un endpoint de estimación o de una tabla compartida; 4-D ya registra siembras, pero el formulario sigue mostrando el aviso. |
| F-10 | Enlace a `/siembra` en el sidebar | La ruta y el formulario existen desde 4-B, pero no hay entrada de navegación. |

---

## 7. Backend y API

| # | Pendiente | Detalle |
|---|---|---|
| A1 | Unificar las respuestas exitosas de `/auth` | Conviven `{ token, usuario }`, `{ mensaje, usuario }`, `{ success, usuario }` y objeto directo. Los errores ya están unificados. |
| A2 | `GET /auth/verificar/:token` como `POST` | Ver D8. |
| A3 | Contrato de `precipitacionMm` nulo | Hoy el evento se omite; decidir si el tipo admite `null`. |
| A4 | Persistencia del bus de eventos | Si el proceso se reinicia, los eventos en vuelo se pierden. |
| A5 | Job y cerrojo compartidos | El job y el cerrojo funcionan en un solo proceso. |
| A6 | Validación de longitud de `DUI_PEPPER` | Ya se valida el mínimo de 32 al arrancar (PR #44); confirmar que la documentación lo refleja. |
| A7 | Separar `app` de `listen` | Necesario para pruebas de API sin abrir puerto (Parte 7). |
| A8 | Endpoint de estimación de costos | 4-C es una función pura; falta exponerla o integrarla para que el formulario muestre el estimado. |
| A9 | Paginación de `GET /siembras` | Hoy devuelve todas las siembras del usuario; suficiente para el MVP, revisar si el historial crece. |
| A10 | Paginación de `GET /estimaciones` | Hoy devuelve todo el historial del usuario; suficiente para el MVP. |

---

## 8. Documentación

| # | Pendiente | Detalle |
|---|---|---|
| DOC1 | Actualizar `docs/data/Info_Datos_Clima.md` (`EXCESO`) | Requiere acuerdo del equipo. |
| DOC2 | Actualizar `docs/data/Info_Datos_CENTA.md` (coordenadas) | Requiere acuerdo del equipo. |
| DOC3 | Registrar cada punto cerrado en `history/branches/` | Regla de mantenimiento. 4-A, 4-B y 4-C ya están en `4-siembra.md`. |
| DOC4 | Revisar este archivo en cada cierre de hito | Lo que se cumple se elimina y queda en el historial. |
| DOC5 | Retirar `docs/4-A-doc.txt` | Su contenido se integró en `history/branches/4-siembra.md`; el `.txt` contradice la regla de que los `.md` son la única fuente viva. |
| DOC6 | Actualizar F3 a un ciclo más reciente | Hoy los precios son del ciclo 2022-2023; ver `data/Info_Datos_Precios.md`. |

---

## 9. Lo que NO es un pendiente

Para evitar confusiones:

- **La verificación simulada** es una decisión consciente, no un olvido.
- **La estimación del dashboard** es la última persistida del cultivo y distrito seleccionados; si no hay, el estado vacío con enlace a siembra es correcto.
- **El clima «Sin evaluar»** es un estado válido fuera de época.
- **Los precios F3 de 2022-2023** son un dato oficial con su fecha; lo que falta es actualizarlos, no inventarlos.
- **La estimación sin costos indirectos** es una decisión de 4-C: es un piso de costos directos, no el total del MAG.
- **Los factores climáticos de 5-B** son supuestos declarados con fecha; no se presentan como dato oficial.
- **El semáforo de 5-C** es una guía basada en el clima; no es un veredicto sobre la parcela.
- **Los CSV crudos marcados como modificados** son ruido de fin de línea, no un cambio.
- **La ausencia de lint** es una decisión del equipo, no un fallo de configuración.
