# Datos de referencia — rendimiento y precio de venta (F1/F4)

- **Claves del mapa:** F1 (rendimiento) y F4 (precio de venta)
- **Uso:** proyección de rendimiento e ingresos (5-B)
- **Fuente base:** MAG/DGEA/DEA, *Costos de producción de cultivos agrícolas*, ciclo 2022-2023
- **Fecha de publicación:** 21 de febrero de 2024
- **URL:** <https://www.mag.gob.sv/wp-content/uploads/2024/02/INFORME-DE-COSTOS-DE-PRODUCCIO%CC%81N-2022-2023-FINAL-1.pdf>
- **Implementación:** `backend/src/estimacion/proyeccion.ts`
- **Estado:** ✅ F1 y F4 obtenidos del MAG 2022-2023. El **ajuste por clima es un supuesto declarado**, no un dato oficial.

---

## 1. Qué contiene

5-B necesita tres entradas:

1. **F1 — rendimiento base por cultivo**, en quintales por manzana.
2. **F4 — precio de venta por quintal**, en dólares.
3. **Factor de ajuste por condición climática**, que reduce el rendimiento base.

F1 y F4 salen del mismo informe del MAG que usa 4-C, con las mismas fichas para no mezclar niveles tecnológicos ni temporadas. El factor climático **no** tiene una fuente oficial por cultivo y etapa: es un supuesto del equipo, documentado aquí.

---

## 2. F1 y F4 por cultivo

| Cultivo | Ficha del MAG | Rendimiento (qq/mz) | Precio de venta (USD/qq) | Página del PDF (impresa) |
|---|---|---:|---:|---|
| Maíz | Maíz semitecnificado | 58.22 | 30.74 | 15 (14) |
| Frijol | Frijol de invierno | 18.17 | 70.00 | 12 (11) |
| Maicillo | Sorgo semi-tecnificado | 39.44 | 30.00 | 16 (15) |

**Tipo:** `OFICIAL` (informe del MAG). **Fecha:** 2024-02-21.

Advertencias:

- Son valores del ciclo **2022-2023**; no son un pronóstico de la parcela ni una cotización actual.
- Corresponden a una ficha tecnológica y una temporada concretas. Si el agricultor siembra con otra tecnología o en otra época, el valor base puede no representarlo.
- El rendimiento del MAG es un promedio de productores, no el rendimiento garantizado de una parcela.

---

## 3. Factor de ajuste climático (SUPUESTO)

| Condición guardada | Nivel de sequía | Factor | Tipo |
|---|---|---:|---|
| `INVIERNO_ACEPTABLE` | — | 1.00 | SUPUESTO |
| `EXCESO_LLUVIA` | — | 0.90 | SUPUESTO |
| `SEQUIA` | `DEBIL` | 0.95 | SUPUESTO |
| `SEQUIA` | `MODERADA` | 0.85 | SUPUESTO |
| `SEQUIA` | `FUERTE` | 0.70 | SUPUESTO |
| `SEQUIA` | `SEVERA` | 0.50 | SUPUESTO |
| `SEQUIA` | sin nivel | 0.80 | SUPUESTO |
| `null` (sin evaluación) | — | 1.00 | SUPUESTO |

**Por qué son supuestos:** no hay una tabla oficial que relacione la condición climática distrital con la pérdida de rendimiento de cada cultivo en Morazán. Los factores son una aproximación conservadora para el MVP; deben validarse con CENTA, un agrónomo o datos de campo.

**Decisión importante:** la sequía meteorológica **no equivale a pérdida total del cultivo**. El factor reduce el rendimiento, no lo lleva a cero. 5-C debe redactar las recomendaciones con esa misma cautela.

**Sin evaluación (`null`):** no se aplica ajuste. Es preferible no penalizar un distrito fuera de época que inventar una condición.

---

## 4. Fórmulas

```
rendimientoEstimadoQqPorMz = round2(rendimientoBaseQqPorMz × factorClimatico)
produccionEstimadaQq       = round2(rendimientoEstimadoQqPorMz × areaMz)
ingresoEstimadoUsd         = round2(produccionEstimadaQq × precioVentaQqUsd)
```

- `round2` redondea a dos decimales.
- El rendimiento se redondea **antes** de multiplicar por el área para que el resultado sea reproducible a mano con la tabla.
- El ingreso se calcula en centavos y se redondea a dos decimales.
- No se calculan costos ni margen: 4-C tiene la estimación de costos y 5-C/5-D decidirán cómo combinarla.

### Caso conocido (1 manzana, `INVIERNO_ACEPTABLE`)

| Cultivo | Rendimiento | Producción | Precio | Ingreso |
|---|---:|---:|---:|---:|
| Maíz | 58.22 qq/mz | 58.22 qq | $30.74/qq | **$1 789.68** |
| Frijol | 18.17 qq/mz | 18.17 qq | $70.00/qq | **$1 271.90** |
| Maicillo | 39.44 qq/mz | 39.44 qq | $30.00/qq | **$1 183.20** |

Estos tres ingresos coinciden con el “valor de la producción” del informe del MAG para las mismas fichas. La prueba `backend/src/estimacion/proyeccion.pruebas.ts` los reproduce.

### Caso con sequía

1 manzana de maíz con `SEQUIA` `MODERADA`:

```
rendimiento = round2(58.22 × 0.85) = 49.49 qq/mz
producción  = round2(49.49 × 1)     = 49.49 qq
ingreso     = round2(49.49 × 30.74) = 1 521.32 USD
```

---

## 5. Contrato de la función

```ts
proyectarEstimacion(contexto: ContextoEstimacion): ProyeccionEstimacion
```

Entrada (la arma 5-A):

```ts
{
  siembraId, usuarioId, distritoId, cultivo, estado, areaMz, fechaSiembra,
  condicion, nivelSequia, fechaDatos, actualizadoEn
}
```

Salida:

```ts
{
  siembraId, usuarioId, distritoId, cultivo, estado, areaMz, fechaSiembra,
  condicion, nivelSequia, fechaDatos, actualizadoEn,
  rendimientoBaseQqPorMz,
  factorClimatico,
  rendimientoEstimadoQqPorMz,
  produccionEstimadaQq,
  precioVentaQqUsd,
  ingresoEstimadoUsd,
  supuestos: [
    { clave: "rendimiento_base", valor, unidad: "qq/mz", tipo: "OFICIAL", fuente, fecha, nota },
    { clave: "precio_venta", valor, unidad: "USD/qq", tipo: "OFICIAL", fuente, fecha, nota },
    { clave: "factor_climatico", valor, unidad: "factor", tipo: "SUPUESTO", fuente, fecha, nota }
  ]
}
```

`supuestos` viaja con el resultado para que 5-D y la interfaz puedan explicar de dónde sale cada cifra. No se debe mostrar el ingreso sin la fecha y el tipo de cada supuesto.

---

## 6. Límites conocidos

- **Datos 2022-2023.** Sirven para el MVP y la demo, no para asesorar una venta hoy.
- **Una ficha por cultivo.** No se distingue nivel tecnológico ni temporada.
- **Factor climático no específico por cultivo.** Es una simplificación; maíz, frijol y maicillo no pierden igual.
- **Sin costos ni margen.** 5-B proyecta rendimiento e ingreso; la estimación de costos es 4-C.
- **Sin persistencia.** El resultado se registra en el log; 5-D lo guarda y lo expone.
- **Sin interfaz.** 6-E mostrará la estimación real cuando 5-D exista.
- **Sin evaluación climática = sin ajuste.** No es un dato; es una decisión para no penalizar distritos fuera de época.

---

## 7. Cómo actualizar

1. Conseguir un informe más reciente del MAG/CENTA o datos de campo validados.
2. Editar `backend/src/estimacion/proyeccion.ts`: rendimiento, precio, fuente, fecha y página.
3. Actualizar esta tabla, las fórmulas y el caso conocido.
4. Actualizar `proyeccion.pruebas.ts` con los nuevos totales.
5. Ejecutar `npm run typecheck` y `npm run pruebas:proyeccion` desde `backend/`.

Los factores climáticos se actualizan en el mismo archivo (`FACTORES_CLIMA`, `FACTORES_SEQUIA`, `FACTOR_SEQUIA_BASE`). Si se consigue una tabla oficial por cultivo, se reemplaza el factor único y se documenta la fuente.
