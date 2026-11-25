# Reglas de recomendación por riesgo (5-C)

- **Uso:** recomendaciones de 5-C a partir de la proyección de 5-B
- **Implementación:** `backend/src/estimacion/recomendacion.ts`
- **Referencia de viabilidad:** `backend/src/estimacion/viabilidad-referencia.ts`
- **Estado:** ✅ 5-C implementado. El semáforo es una **guía**, no un veredicto sobre la parcela.

---

## 1. Semáforo

| Condición climática | Nivel de sequía | Semáforo | Mensaje corto |
|---|---|---|---|
| `INVIERNO_ACEPTABLE` | — | **VERDE** | Condición favorable; seguimiento normal. |
| `null` (sin evaluación) | — | **AMARILLO** | No hay evaluación reciente; se usa el rendimiento base. |
| `EXCESO_LLUVIA` | — | **AMARILLO** | Exceso de lluvia; revisar drenajes y enfermedades. |
| `SEQUIA` | `DEBIL` | **AMARILLO** | Sequía débil; el rendimiento se reduce, no se anula. |
| `SEQUIA` | `MODERADA` | **AMARILLO** | Sequía moderada; el rendimiento se reduce, no se anula. |
| `SEQUIA` | `FUERTE` | **ROJO** | Sequía fuerte; revisar cultivo y manejo. |
| `SEQUIA` | `SEVERA` | **ROJO** | Sequía severa; revisar cultivo y manejo. |
| `SEQUIA` | sin nivel | **AMARILLO** | Sequía sin nivel; se aplica el factor base. |

**Regla de oro:** la sequía meteorológica **no equivale a pérdida total del cultivo**. Los mensajes de sequía lo dicen explícitamente.

---

## 2. Motivos que acompañan cada recomendación

Cada recomendación devuelve `motivos`, y cada motivo cita el dato que lo origina:

1. **Clima:** condición, nivel de sequía y fecha de los datos (`fechaDatos`).
2. **Factor:** factor climático aplicado, marcado como supuesto declarado.
3. **Proyección:** rendimiento estimado (qq/mz), producción (qq) e ingreso estimado (USD).
4. **CENTA:** capa, clase dominante, porcentaje del distrito, fuente y fecha de extracción. Se cita como **referencia distrital**, no como veredicto sobre la parcela.
5. **Sequía:** recordatorio de que no equivale a pérdida total.

Si la viabilidad de CENTA no está disponible, el motivo lo dice y la recomendación sigue funcionando.

---

## 3. Papel de la viabilidad de CENTA

- Se lee con `consultarViabilidad(distritoId, { capa: "potencial_<cultivo>" })`.
- Se resume en `ViabilidadReferencia`: capa, clase dominante, porcentaje, fuente y fecha.
- **No cambia el semáforo.** El semáforo se decide solo con la condición climática y el factor de 5-B.
- Sirve para contextualizar: una clase dominante baja en el distrito no significa que la parcela vaya a fracasar.

---

## 4. Contrato

```ts
recomendar(
  proyeccion: ProyeccionEstimacion,
  viabilidad: ViabilidadReferencia | null,
): Recomendacion
```

```ts
{
  nivel: "VERDE" | "AMARILLO" | "ROJO";
  titulo: string;
  mensaje: string;
  motivos: string[];
  viabilidad: ViabilidadReferencia | null;
}
```

`leerViabilidadReferencia(distritoId, cultivo, consultar?)` devuelve `ViabilidadReferencia | null`; si CENTA falla, registra un aviso y devuelve `null`.

---

## 5. Límites conocidos

- **Umbrales no oficiales.** La asignación de semáforo por condición/nivel es una decisión del equipo; validarla con CENTA o un agrónomo (B8 en `tasks/pendiente.md`).
- **No es un veredicto de la parcela.** La condición y la viabilidad son distritales; la parcela puede comportarse distinto.
- **Persistencia desde 5-D.** El reporte se guarda en `estimaciones`, se lee con `GET /estimaciones` y el dashboard muestra la última recomendación (6-E); falta la vista de historial (6-C).
- **Sin costos ni margen.** 5-C no combina la estimación de costos de 4-C.
- **La viabilidad puede faltar.** Sin CENTA, la recomendación sigue con clima y proyección.
