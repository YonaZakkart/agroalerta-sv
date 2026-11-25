# Historia — Parte 5: estimación y recomendaciones

- **Periodo:** 24 de noviembre de 2026 en adelante
- **Ramas:** `feat/5-a-listeners`, `feat/5-b-proyeccion`
- **Estado:** 5-A y 5-B implementados; 5-C y 5-D pendientes.
- **Fuente:** `git log` y el código en `main`.

## Resumen

| Punto | Rama | Responsable | PR | Resultado |
|---|---|---|---|---|
| 5-A | `feat/5-a-listeners` | Yona | #58 | Listeners de siembra y clima, contexto de estimación y recálculo por distrito |
| 5-B | `feat/5-b-proyeccion` | Yona | por abrir | Proyección pura de rendimiento e ingresos con F1/F4 y factores climáticos supuestos |

---

## 5-A — Listeners

**Rama:** `feat/5-a-listeners` · **Responsable:** Yona · **24 de noviembre de 2026** · PR #58

**Qué se hizo:**

- `backend/src/estimacion/listeners.ts`: fábrica pura de listeners y registro en un bus inyectable.
  - `SiembraRegistrada` → `recalcularSiembra(payload.siembraId)`.
  - `CondicionClimaticaActualizada` → `recalcularDistrito(payload.distritoId)`.
  - Cada listener envuelve su tarea con `ejecutarSeguro`, que captura el error síncrono y el rechazo de la promesa. `emitirSeguro` no captura rechazos asíncronos; por eso el listener no devuelve la promesa.
- `backend/src/estimacion/recalculo.ts`: arma el contexto que necesita 5-B.
  - `recalcularSiembra` busca la siembra y su condición climática guardada.
  - `recalcularDistrito` consulta solo las siembras del distrito afectado y procesa cada una.
  - Un fallo en una siembra no impide procesar las demás.
- `backend/src/estimacion/registro.ts`: une el bus real con `recalcularSiembra` y `recalcularDistrito`.
- `backend/src/index.ts`: llama `iniciarListenersEstimacion()` una sola vez antes de abrir el puerto.
- Pruebas: 6 casos de listeners y 6 de recálculo, sin red ni base de datos.

**Alcance de 5-A:** los listeners disparan el recálculo y dejan el contexto listo (`siembraId`, usuario, distrito, cultivo, estado, área, fecha y condición climática). En 5-A `solicitarCalculoPendiente` solo registraba la solicitud; 5-B lo reemplazó por el cálculo real.

**Decisiones MVP:**

1. **Fire-and-forget:** el evento no espera el cálculo. La respuesta HTTP de `POST /siembras` no se bloquea.
2. **Un listener nunca lanza:** captura errores síncronos y rechazos asíncronos; registra y continúa.
3. **Solo el distrito afectado:** `CondicionClimaticaActualizada` ya se emite solo cuando la condición cambia; el listener consulta las siembras de ese `distritoId`, no de todo Morazán.
4. **Todas las siembras del distrito:** se procesan `POR_SEMBRAR` y `SEMBRADO`; 5-B decidirá si el estado cambia la proyección.
5. **Sin persistencia:** 5-A no guarda resultados; eso es 5-D.
6. **Bus en proceso:** si el proceso se reinicia, los eventos en vuelo se pierden (A4 en `tasks/pendiente.md`).

**Verificación:** `npm run typecheck`, `npm run pruebas:listeners` (12/12), `npm test` (23 archivos) y `npm run build` en verde. El servidor arranca y registra los listeners sin errores.

**Pendientes que deja:**

- 5-B: proyección de rendimiento e ingresos con F1 y F4.
- 5-C: recomendaciones por riesgo.
- 5-D: persistencia y reporte.
- Prueba de integración con MySQL real y eventos reales.
- Persistencia o reintentos del bus si se quiere entrega garantizada.

---

## 5-B — Proyección de rendimiento e ingresos

**Rama:** `feat/5-b-proyeccion` · **Responsable:** Yona · **24 de noviembre de 2026** · PR por abrir

**Qué se hizo:**

- `backend/src/estimacion/proyeccion.ts`: función pura `proyectarEstimacion(contexto)`.
  - F1 y F4 salen de las mismas fichas del MAG 2022-2023 que usa 4-C: maíz semitecnificado 58.22 qq/mz y $30.74/qq; frijol de invierno 18.17 qq/mz y $70.00/qq; maicillo semi-tecnificado 39.44 qq/mz y $30.00/qq.
  - Ajuste climático declarado: invierno aceptable 1.00, exceso de lluvia 0.90, sequía 0.95/0.85/0.70/0.50 según nivel y 0.80 sin nivel; `null` no se ajusta.
  - Fórmulas: rendimiento = round2(base × factor); producción = round2(rendimiento × área); ingreso = round2(producción × precio).
  - El resultado viaja con `supuestos` (fuente, fecha y tipo `OFICIAL`/`SUPUESTO`) y con los datos del clima usados.
- `backend/src/estimacion/recalculo.ts`: `solicitarCalculo` ahora calcula con `proyectarEstimacion` y registra el resultado en el log. No persiste: 5-D.
- `backend/src/estimacion/proyeccion.pruebas.ts`: 14 casos, incluidos los tres valores de producción del MAG para 1 mz y los factores de sequía.
- `docs/data/Info_Datos_Estimacion.md`: contrato de F1/F4, tabla de factores y límites.

**Decisiones MVP:**

1. **Datos base oficiales, ajuste supuesto.** F1/F4 son del MAG 2022-2023; los factores climáticos no tienen fuente oficial y se declaran como `SUPUESTO`.
2. **Una ficha por cultivo.** Se reutilizan las fichas de 4-C para no mezclar tecnología ni temporada.
3. **Sin evaluación climática = sin ajuste.** No se penaliza un distrito fuera de época.
4. **La sequía reduce, no anula.** El factor más severo es 0.50; la sequía meteorológica no equivale a pérdida total.
5. **Sin costos ni margen.** 5-B proyecta rendimiento e ingreso; 4-C tiene los costos y 5-C/5-D decidirán cómo combinarlos.
6. **Sin persistencia.** El resultado se registra en el log; 5-D lo guarda y lo expone.

**Verificación:** `npm run typecheck`, `npm run pruebas:proyeccion` (14/14), `npm run pruebas:listeners` (13/13 con el caso de integración 5-A→5-B), `npm test` (24 archivos) y `npm run build` en verde.

**Pendientes que deja:**

- 5-C: recomendaciones por riesgo.
- 5-D: persistencia, reporte e historial.
- Validar los factores climáticos con CENTA, un agrónomo o datos de campo.
- Actualizar rendimiento y precio a un ciclo más reciente.

---

## Archivos compartidos

| Archivo | Punto | Riesgo |
|---|---|---|
| `backend/src/index.ts` | 5-A | Registro de listeners al arrancar. |
| `backend/package.json` | 5-A / 5-B | Cadena de `npm test`. |

---

## Qué sigue

**5-C — Recomendaciones:** semáforo verde/amarillo/rojo, citando el dato que lo origina y sin presentar la viabilidad de CENTA como veredicto de la parcela.

**Después:** 5-D (persistencia y reporte), 6-E (estimación real en el dashboard) y 6-C (historial).
