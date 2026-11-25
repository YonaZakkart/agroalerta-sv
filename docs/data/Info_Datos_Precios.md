# Datos de referencia — precios y dosis de insumos (F3)

- **Clave del mapa:** F3
- **Uso:** estimación de costos de siembra (4-C)
- **Fuente:** MAG/DGEA/DEA, *Costos de producción de cultivos agrícolas*, ciclo 2022-2023
- **Fecha de publicación:** 21 de febrero de 2024
- **URL:** <https://www.mag.gob.sv/wp-content/uploads/2024/02/INFORME-DE-COSTOS-DE-PRODUCCIO%CC%81N-2022-2023-FINAL-1.pdf>
- **Implementación:** `backend/src/estimacion/referencia.ts`
- **Cálculo:** `backend/src/estimacion/estimar-costos.ts`
- **Estado:** ✅ F3 obtenido. Los precios son del ciclo 2022-2023 y deben revisarse antes de presentarlos como vigentes.

---

## 1. Qué contiene

El informe del MAG reporta, por manzana (7 000 m²), las cantidades y los precios promedio de agroservicio del ciclo 2022-2023. De ahí se tomaron:

- Dosis por manzana de semilla y fertilizantes.
- Precio unitario de cada insumo.
- Jornales por manzana y precio del jornal.
- Costo de preparación de la tierra (maquinaria).
- Alquiler de la tierra.
- Costo de protección del cultivo (insecticidas, fungicidas y herbicidas).

El informe también trae el rendimiento y el precio de venta por quintal, pero **no se usan en 4-C**: pertenecen a la proyección de ingresos (5-B, F4).

---

## 2. Fichas elegidas y por qué

El formulario de siembra no pregunta nivel tecnológico ni temporada, así que se toma una ficha por cultivo. Las otras fichas quedan como alternativa para una mejora posterior.

| Cultivo del proyecto | Ficha del informe | Página del PDF (impresa) | Por qué |
|---|---|---|---|
| Maíz | Maíz semitecnificado | 15 (14) | La opción intermedia del informe; el proyecto no pregunta nivel tecnológico. |
| Frijol | Frijol de invierno | 12 (11) | Siembra principal de la época lluviosa. |
| Maicillo | Sorgo semi-tecnificado | 16 (15) | Punto medio entre semi-tecnificado y tradicional; CENTA lo llama sorgo. |

**Alternativas disponibles en el mismo informe:** maíz tecnificado (pág. 14), frijol de postrera (pág. 13), sorgo tradicional (pág. 17). Si más adelante se agrega el nivel tecnológico o la temporada al formulario, se puede ampliar la tabla sin cambiar la función.

---

## 3. Tabla de referencia

### 3.1 Maíz semitecnificado (PDF pág. 15)

| Concepto | Dosis por mz | Unidad | Precio unitario | Costo por mz (referencia) | Tipo |
|---|---:|---|---:|---:|---|
| Semilla | 24.21 | lb | $3.91 / lb | $94.66 | OFICIAL |
| Fertilizante formulado | 3.88 | QQ | $50.86 / QQ | $197.34 | OFICIAL |
| Sulfato de amonio | 4.63 | QQ | $30.74 / QQ | $142.33 | OFICIAL |
| Urea | 3.12 | QQ | $44.74 / QQ | $139.59 | OFICIAL |
| Insecticidas y foliares | — | — | — | $15.48 | OFICIAL |
| Herbicidas | — | — | — | $15.81 | OFICIAL |
| Mano de obra | 50 | jornal | $8.11 / jornal | $405.50 | OFICIAL |
| Maquinaria (rastra, surcado y aporco) | — | — | — | $131.91 | OFICIAL |
| Alquiler de la tierra | — | — | — | $63.09 | OFICIAL |
| Riego (cuota de agua) | — | — | — | $63.64 | **SUPUESTO** |

El informe reparte la cosecha del maíz en tarifas de $8.25, $8.54 y $8.26 por jornal. La estimación usa una sola tarifa, la predominante de $8.11, así que su subtotal de mano de obra ($405.50) difiere en $4.15 del total de mano de obra del informe ($409.65). Es una simplificación declarada.

El informe reporta costo directo de $1 087.05 y costos indirectos de $160.92 (administración, imprevistos, intereses y alquiler de $63.09); su costo total es $1 247.97. La estimación del proyecto **no incluye los costos indirectos** (administración, imprevistos e intereses) ni el transporte interno de la cosecha; el alquiler sí va como línea aparte. Por eso su total no coincide con el del MAG.

### 3.2 Frijol de invierno (PDF pág. 12)

| Concepto | Dosis por mz | Unidad | Precio unitario | Costo por mz (referencia) | Tipo |
|---|---:|---|---:|---:|---|
| Semilla | 100.00 | lb | $0.85 / lb | $85.00 | OFICIAL |
| Fertilizante formulado | 2.59 | QQ | $54.67 / QQ | $141.60 | OFICIAL |
| Sulfato de amonio | 2.00 | QQ | $28.00 / QQ | $56.00 | OFICIAL |
| Insecticidas y foliares | — | — | — | $21.00 | OFICIAL |
| Fungicidas | — | — | — | $23.41 | OFICIAL |
| Herbicidas | — | — | — | $11.73 | OFICIAL |
| Mano de obra | 57 | jornal | $8.50 / jornal | $484.50 | OFICIAL |
| Alquiler de la tierra | — | — | — | $62.50 | OFICIAL |
| Riego (cuota de agua) | — | — | — | $63.64 | **SUPUESTO** |

El informe no reporta labores mecánicas de preparación para frijol de invierno. Costo directo del informe: $830.50; indirectos: $137.25 (incluido el alquiler de $62.50); total: $967.75.

### 3.3 Maicillo (sorgo) semi-tecnificado (PDF pág. 16)

| Concepto | Dosis por mz | Unidad | Precio unitario | Costo por mz (referencia) | Tipo |
|---|---:|---|---:|---:|---|
| Semilla | 13.10 | lb | $0.52 / lb | $6.81 | OFICIAL |
| Fertilizante formulado | 3.72 | QQ | $51.33 / QQ | $190.95 | OFICIAL |
| Sulfato de amonio | 3.87 | QQ | $33.00 / QQ | $127.71 | OFICIAL |
| Insecticidas y foliares | — | — | — | $18.01 | OFICIAL |
| Herbicidas | — | — | — | $8.09 | OFICIAL |
| Mano de obra | 37 | jornal | $8.00 / jornal | $296.00 | OFICIAL |
| Maquinaria (rastra y surcado) | — | — | — | $118.34 | OFICIAL |
| Alquiler de la tierra | — | — | — | $63.33 | OFICIAL |
| Riego (cuota de agua) | — | — | — | $63.64 | **SUPUESTO** |

Costo directo del informe: $849.52; indirectos: $139.79 (incluido el alquiler de $63.33); total: $989.31.

---

## 4. Reglas de cálculo

1. **Unidades compradas enteras.** Semilla (lb), fertilizantes (QQ) y mano de obra (jornal) se multiplican por el área y se redondean **hacia arriba**. No se compran fracciones de quintal ni medios jornales.
2. **Servicios por manzana.** Maquinaria, alquiler y riego se cobran por manzana: se multiplican por el área y se redondean a centavos hacia arriba. No se redondean a pases enteros porque una pasada de tractor cubre la parcela completa.
3. **Área.** Se expresa en manzanas y debe ser mayor que cero y menor o igual a 999 999.99, igual que el formulario de siembra.
4. **Costos indirectos fuera.** La estimación cubre costos directos y alquiler; no aplica administración, imprevistos ni intereses.
5. **Riego.** Si el agricultor marca que usa riego, se agrega la cuota de agua de $63.64/mz. Es un **supuesto**: el informe solo trae cuota de agua para arroz bajo riego. No es un dato oficial para maíz, frijol ni maicillo.
6. **Precios no vigentes.** Son promedios del ciclo 2022-2023. La fecha viaja con cada línea para que nadie los presente como precio actual.
7. **Sin redondeo de área.** El área no se redondea; se usa tal como llega. El llamador debe enviarla con dos decimales.

---

## 5. Contrato de la función

```ts
estimarCostos(
  cultivo: "MAIZ" | "FRIJOL" | "MAICILLO",
  areaMz: number,
  opciones: {
    alquilaTerreno: boolean;
    usaMaquinaria: boolean;
    usaRiego: boolean;
  },
): EstimacionCostos
```

Devuelve:

```ts
{
  cultivo: "MAIZ" | "FRIJOL" | "MAICILLO";
  areaMz: number;
  ficha: string;                 // "Maíz semitecnificado", etc.
  lineas: {
    concepto: string;
    tipoCalculo: "UNIDADES" | "POR_MANZANA";
    cantidadPorMz: number;
    unidad: string;              // "lb", "QQ", "jornal" o "mz"
    cantidadCalculada: number;   // dosis × área, sin redondear
    cantidadComprada: number;    // entero hacia arriba para UNIDADES
    precioUnitarioUsd: number;
    subtotalUsd: number;
    fuente: string;
    fecha: string;               // "2024-02-21"
    tipo: "OFICIAL" | "SUPUESTO";
    nota?: string;
  }[];
  totalUsd: number;
  fuentes: { fuente: string; fecha: string }[];
}
```

Las opciones `alquilaTerreno`, `usaMaquinaria` y `usaRiego` excluyen sus rubros cuando están en `false`. Los insumos y la mano de obra siempre se incluyen.

### Caso conocido

1 manzana de maíz semitecnificado con alquiler, maquinaria y riego:

| Concepto | Cálculo | Subtotal |
|---|---|---:|
| Semilla | 24.21 lb → 25 lb × $3.91 | $97.75 |
| Fertilizante formulado | 3.88 QQ → 4 QQ × $50.86 | $203.44 |
| Sulfato de amonio | 4.63 QQ → 5 QQ × $30.74 | $153.70 |
| Urea | 3.12 QQ → 4 QQ × $44.74 | $178.96 |
| Insecticidas y foliares | 1 mz × $15.48 | $15.48 |
| Herbicidas | 1 mz × $15.81 | $15.81 |
| Mano de obra | 50 jornales × $8.11 | $405.50 |
| Maquinaria | 1 mz × $131.91 | $131.91 |
| Alquiler | 1 mz × $63.09 | $63.09 |
| Riego | 1 mz × $63.64 | $63.64 |
| **Total** | | **$1 329.28** |

La prueba `backend/src/estimacion/estimar-costos.pruebas.ts` reproduce este total y los casos de 0.5 mz, frijol y maicillo.

---

## 6. Cómo actualizar F3

1. Conseguir un informe más reciente del MAG o de CENTA con precios y dosis.
2. Editar `backend/src/estimacion/referencia.ts`: cambiar valores, `fuente`, `fecha` y página.
3. Actualizar esta tabla y el caso conocido.
4. Actualizar `backend/src/estimacion/estimar-costos.pruebas.ts` con los nuevos totales.
5. Ejecutar `npm run typecheck` y `npm run pruebas:estimacion` desde `backend/`.

No se edita un precio en la función de cálculo ni en el frontend: la única fuente es `referencia.ts`.

---

## 7. Límites conocidos

- **Precios de 2022-2023.** Sirven para demostrar el cálculo, no para asesorar una compra hoy. Está anotado como pendiente en `tasks/pendiente.md`.
- **Una sola ficha por cultivo.** No se distingue nivel tecnológico ni temporada.
- **Sin conversión de bolsas.** La dosis de semilla está en libras. El formulario permite `BOLSAS`, pero 4-C no las usa; falta definir el peso de una bolsa (D9 en `tasks/pendiente.md`).
- **Jornal único por cultivo.** El MAG usa tarifas distintas en algunas labores de cosecha del maíz; la estimación usa la tarifa predominante.
- **Sin costos indirectos ni transporte de cosecha.** El total es un piso de costos directos, no el costo total del MAG.
- **Riego supuesto.** La cuota de agua es la de arroz de riego; no hay dato oficial para los tres cultivos.
- **Sin interfaz todavía.** El formulario de 4-B muestra el aviso de que el estimado llegará después; falta el endpoint (4-D) o una tabla compartida para mostrarlo.
