# Historia — Parte 5: estimación y recomendaciones

- **Periodo:** 24 de noviembre de 2026 en adelante
- **Ramas:** `feat/5-a-listeners`
- **Estado:** 5-A implementado; 5-B, 5-C y 5-D pendientes.
- **Fuente:** `git log` y el código en `main`.

## Resumen

| Punto | Rama | Responsable | PR | Resultado |
|---|---|---|---|---|
| 5-A | `feat/5-a-listeners` | Yona | por abrir | Listeners de siembra y clima, contexto de estimación y recálculo por distrito |

---

## 5-A — Listeners

**Rama:** `feat/5-a-listeners` · **Responsable:** Yona · **24 de noviembre de 2026** · PR por abrir

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

**Alcance de 5-A:** los listeners disparan el recálculo y dejan el contexto listo (`siembraId`, usuario, distrito, cultivo, estado, área, fecha y condición climática). La **proyección real** es 5-B; `solicitarCalculoPendiente` solo registra la solicitud y lo dice en el log. No se inventa un rendimiento ni un ingreso en 5-A.

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

## Archivos compartidos

| Archivo | Punto | Riesgo |
|---|---|---|
| `backend/src/index.ts` | 5-A | Registro de listeners al arrancar. |
| `backend/package.json` | 5-A | Cadena de `npm test`. |

---

## Qué sigue

**5-B — Proyección de rendimiento e ingresos:** consumir `ContextoEstimacion`, aplicar F1 (rendimiento base) y F4 (precio de venta), con supuestos documentados y cálculo reproducible.

**Después:** 5-C (recomendaciones), 5-D (persistencia y reporte), 6-E (estimación real en el dashboard) y 6-C (historial).
