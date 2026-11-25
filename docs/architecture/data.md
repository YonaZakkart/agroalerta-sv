# Datos, modelo y migraciones

El backend usa MySQL 8.4 con Prisma 7.10.0. Los datos vienen de cuatro fuentes:

1. **CENTA** — viabilidad agrícola por distrito, cargada desde CSV versionados.
2. **Open-Meteo** — lluvia diaria y normal de 30 días, consultada en tiempo de ejecución.
3. **Registro de usuarios, siembras y estimaciones** — datos personales, sesión, siembras y reportes del agricultor.
4. **MAG** — precios y dosis de referencia para la estimación de costos (F3), versionados como tabla TypeScript.

---

## 1. Modelo Prisma

```
Municipio 1 ─── * Distrito 1 ─── * AreaClase * ─── 1 ClaseCapa * ─── 1 Capa
                     │
                     ├── * Usuario
                     ├── * Siembra
                     └── 1 CondicionDistrito

Usuario 1 ─── * Siembra * ─── 1 Distrito
Siembra 1 ─── * Estimacion
Usuario 1 ─── * Estimacion
```

### `Usuario` → `usuarios`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, autoincrement | |
| `nombres`, `apellidos` | VarChar(100) | |
| `correo` | VarChar(255), unique | Se guarda en minúsculas. |
| `contrasenaHash` | VarChar(255) | Argon2id. |
| `duiHash` | Char(64), unique | HMAC-SHA256 con `DUI_PEPPER`. |
| `distritoId` | Int, FK → `Distrito.id` | Antes era texto libre; cambió en 2-END. |
| `verificado` | Boolean, default false | |
| `tokenVerificacion` | VarChar(64), unique, nullable | SHA-256 del token que viaja al usuario. |
| `tokenVerificacionExpira` | DateTime, nullable | 24 h. |
| `fechaRegistro` | DateTime, default now | |

### `Municipio` → `municipios`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, autoincrement | |
| `nombre` | VarChar(100), unique | Morazán Norte y Morazán Sur. |

### `Distrito` → `distritos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, **sin autoincrement** | Código CENTA (`Id_Muni`, 1301–1326). |
| `nombre` | VarChar(100) | Nombre canónico con tildes. |
| `nombreNormalizado` | VarChar(100), unique | Clave de comparación. |
| `municipioId` | Int, FK → `Municipio.id` | |
| `latitud` | Decimal(9,6), nullable | Agregado en 3-0b. |
| `longitud` | Decimal(9,6), nullable | Agregado en 3-0b. |

### `Capa` → `capas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, autoincrement | |
| `codigo` | VarChar(50), unique | `potencial_maiz`, `potencial_frijol`, `potencial_sorgo`, `riesgo_sequia`. |
| `nombre` | VarChar(100) | |
| `tipo` | `TipoCapa` | `POTENCIAL` (mayor = mejor) o `RIESGO` (mayor = peor). |
| `cultivo` | VarChar(50), nullable | `null` en riesgo de sequía (aplica a todos). |

### `ClaseCapa` → `clases_capa`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, autoincrement | |
| `capaId` | Int, FK → `Capa.id` | |
| `valor` | Int | Orden de la clase. |
| `nombre` | VarChar(50) | Bajo, medio, alto, etc. |
| — | unique(`capaId`, `valor`) | |

### `AreaClase` → `areas_clase`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, autoincrement | |
| `distritoId` | Int, FK → `Distrito.id` | |
| `claseId` | Int, FK → `ClaseCapa.id` | |
| `areaHa` | Decimal(12,3) | Hectáreas. |
| `fuente` | VarChar(50) | CENTA. |
| `fechaExtraccion` | Date | Fecha de la exportación. |
| — | unique(`distritoId`, `claseId`) | |

### `CondicionDistrito` → `condiciones_distrito`

| Campo | Tipo | Notas |
|---|---|---|
| `distritoId` | Int, PK, FK → `Distrito.id` | Una fila por distrito. |
| `condicion` | `CondicionClima?` | `null` = sin evaluación. |
| `nivelSequia` | `NivelSequia?` | `DEBIL` no se produce todavía. |
| `diasSecosConsecutivos` | Int | |
| `acumulado30Mm` | Decimal(8,2), nullable | `null` si falta un día de la ventana. |
| `normal30Mm` | Decimal(8,2), nullable | |
| `razon30` | Decimal(6,3), nullable | Acumulado / normal. |
| `fechaDatos` | Date | Último día completo, no la fecha de consulta. |
| `actualizadoEn` | DateTime | Momento de la consulta. |
| `condicionDesde` | DateTime, nullable | Cuándo empezó la condición vigente. |

### `Siembra` → `siembras`

Agregada en 4-A. Una siembra pertenece a un usuario y a un distrito; el distrito se elige en el formulario (D1), no se hereda del dashboard.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, autoincrement | |
| `usuarioId` | Int, FK → `Usuario.id` | ON DELETE RESTRICT. |
| `distritoId` | Int, FK → `Distrito.id` | ON DELETE RESTRICT. |
| `cultivo` | `Cultivo` | `MAIZ`, `FRIJOL` o `MAICILLO`. |
| `estado` | `EstadoSiembra` | `POR_SEMBRAR` o `SEMBRADO`. |
| `fechaSiembra` | Date | Cuándo sembró o cuándo planea sembrar, según `estado`. |
| `areaMz` | Decimal(8,2) | Manzanas. |
| `cantidadSemilla` | Decimal(10,2), nullable | Opcional; si existe, `unidadSemilla` también. |
| `unidadSemilla` | `UnidadSemilla?` | `LIBRAS` o `BOLSAS`. |
| `alquilaTerreno` | Boolean, default false | |
| `usaMaquinaria` | Boolean, default false | |
| `usaRiego` | Boolean, default false | |
| `inversionTotalUsd` | Decimal(10,2) | Obligatoria; lo que declara el agricultor, todo incluido. |
| `costoSemillaUsd` | Decimal(10,2), nullable | Desglose opcional. |
| `costoAlquilerUsd` | Decimal(10,2), nullable | Desglose opcional. |
| `costoMaquinariaUsd` | Decimal(10,2), nullable | Desglose opcional. |
| `costoRiegoUsd` | Decimal(10,2), nullable | Desglose opcional. |
| `costoOtrosUsd` | Decimal(10,2), nullable | Desglose opcional. |
| `creadoEn` | DateTime, default now | |
| — | index(`usuarioId`, `creadoEn`) | Para `GET /siembras` por dueño (4-D). |

El esquema no obliga a que `cantidadSemilla` y `unidadSemilla` vayan juntas ni a que la suma del desglose no supere `inversionTotalUsd`: esas reglas se validan en 4-D. La suma del desglose **puede** superar el total (decisión MVP); solo se validan montos no negativos.

`POST /siembras` guarda una fila y emite `SiembraRegistrada` después del insert. `GET /siembras` filtra por `usuarioId`; no hay lectura de siembras ajenas.

Los listeners de 5-A leen la siembra junto con `CondicionDistrito` de su distrito para armar `ContextoEstimacion`; no modifican ninguna tabla. 5-B usa ese contexto para proyectar rendimiento e ingreso; 5-C lee la viabilidad de CENTA del distrito como referencia. 5-D guarda el reporte en `estimaciones`.


### `Estimacion` → `estimaciones`

Agregada en 5-D. Es una **instantánea** del reporte: guarda la siembra, la proyección de 5-B y la recomendación de 5-C para leerlas sin recalcular.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int, PK, autoincrement | |
| `siembraId` | Int, FK → `Siembra.id` | ON DELETE RESTRICT. |
| `usuarioId` | Int, FK → `Usuario.id` | ON DELETE RESTRICT; filtra el historial. |
| `distritoId` | Int | Snapshot, **sin FK**: conserva el reporte aunque cambie el catálogo. |
| `cultivo` | `Cultivo` | Snapshot. |
| `estado` | `EstadoSiembra` | Snapshot. |
| `areaMz` | Decimal(8,2) | Snapshot. |
| `fechaSiembra` | Date | Snapshot. |
| `condicion` | `CondicionClima?` | `null` = sin evaluación. |
| `nivelSequia` | `NivelSequia?` | |
| `fechaDatos` | Date, nullable | Fecha de los datos climáticos usados. |
| `actualizadoEn` | DateTime, nullable | Momento de la consulta climática. |
| `rendimientoBaseQqPorMz` | Decimal(8,2) | F1 aplicado. |
| `factorClimatico` | Decimal(5,3) | Supuesto aplicado. |
| `rendimientoEstimadoQqPorMz` | Decimal(8,2) | |
| `produccionEstimadaQq` | Decimal(12,2) | |
| `precioVentaQqUsd` | Decimal(10,2) | F4 aplicado. |
| `ingresoEstimadoUsd` | Decimal(12,2) | |
| `nivelRiesgo` | `NivelRiesgo` | `VERDE`, `AMARILLO` o `ROJO`. |
| `titulo`, `mensaje` | VarChar(100/500) | Texto de la recomendación. |
| `motivos` | Json | Array de strings que citan los datos. |
| `viabilidad` | Json, nullable | Referencia CENTA (capa, clase, porcentaje, fuente, fecha). |
| `supuestos` | Json | Array de supuestos de 5-B. |
| `calculadoEn` | DateTime, default now | Orden del historial. |
| — | index(`usuarioId`, `calculadoEn`) | Historial por dueño. |
| — | index(`siembraId`, `calculadoEn`) | Última estimación por siembra. |

Cada recálculo crea una fila nueva: el historial son todas las filas y la última estimación es la más reciente de cada `siembraId`.

### Enums

```prisma
enum TipoCapa { POTENCIAL RIESGO }
enum CondicionClima { SEQUIA EXCESO_LLUVIA INVIERNO_ACEPTABLE }
enum NivelSequia { DEBIL MODERADA FUERTE SEVERA }
enum Cultivo { MAIZ FRIJOL MAICILLO }
enum EstadoSiembra { POR_SEMBRAR SEMBRADO }
enum UnidadSemilla { LIBRAS BOLSAS }
enum NivelRiesgo { VERDE AMARILLO ROJO }
```

---

## 2. Migraciones

| Carpeta | Qué agrega |
|---|---|
| `20260923233440_add_usuarios` | Tabla `usuarios`. |
| `20260927210046_add_verificacion_correo` | Token y expiración de verificación. |
| `20261004212446_add_viabilidad` | Municipios, distritos, capas, clases y áreas. |
| `20261030231036` | `usuarios.distrito` (texto) → `distrito_id` con FK. |
| `20261102032958_add_coordenadas_distrito` | `latitud` y `longitud` en `distritos`. |
| `20261107143412_add_condicion_distrito` | `condiciones_distrito` y sus enums. |
| `20261116035128_add_siembras` | `siembras` y sus enums (`Cultivo`, `EstadoSiembra`, `UnidadSemilla`). |
| `20261125201048_add_estimaciones` | `estimaciones`, `NivelRiesgo` y sus índices. |

Reglas:

- Se generan con `npx prisma migrate dev` desde `backend/`.
- Se revisa el SQL antes de aplicarlo.
- Se versionan; no se editan a mano después de aplicadas.
- La migración de `distrito_id` no se puede aplicar sobre una base con usuarios incompatibles: reiniciar el volumen (ver `gotchas.md`).

---

## 3. Archivos de datos

### `backend/data/centa/raw/`

Exports originales de CENTA. **No editar ni abrir en Excel.**

- `Potencial_maiz.csv`
- `Potencial_frijol.csv`
- `Potencial_sorgo.csv`
- `Riesgo_sequia.csv`
- `division_territorial_morazan.csv`
- `fuente.json`

### `backend/data/centa/clean/`

Generados por `npm run datos:limpiar`:

- `distritos.csv` — 26 filas, con latitud y longitud desde 3-0b.
- `areas_clase.csv` — 312 filas.

### `backend/data/referencia/`

- `coordenadas_distritos.csv` — 26 coordenadas con fuente y fecha.
- `normales_lluvia_30d.json` — normal de lluvia de 30 días por distrito; 365 claves por distrito.

### Precios y dosis de referencia (F3)

No hay CSV ni JSON: la tabla vive en `backend/src/estimacion/referencia.ts`, porque cada rubro necesita su tipo (`OFICIAL` / `SUPUESTO`), su fuente y su fecha. El contrato completo está en [`docs/data/Info_Datos_Precios.md`](../data/Info_Datos_Precios.md).

- Fuente: MAG/DGEA/DEA, *Costos de producción de cultivos agrícolas*, ciclo 2022-2023 (publicado el 21 de febrero de 2024).
- Fichas usadas: maíz semitecnificado, frijol de invierno y sorgo semi-tecnificado (maicillo).
- La estimación se calcula con `estimarCostos()` en `backend/src/estimacion/estimar-costos.ts`.
- No se guarda en la base: 4-C no agrega columnas ni migraciones.

### Ciclo de actualización

```bash
cd backend
npm run datos:limpiar     # solo si cambiaron los exports crudos
npm run datos:cargar      # idempotente y transaccional
```

Resultado esperado:

| Entidad | Cantidad |
|---|---|
| Municipios | 2 |
| Distritos | 26 |
| Capas | 4 |
| Clases de capa | 12 |
| Áreas de clase | 312 |

---

## 4. Normalización

`backend/src/comun/normalizar.ts` es la única normalización de nombres:

- Quita tildes.
- Pasa a minúsculas.
- Colapsa espacios.

Se usa para:

- Guardar y comparar `distrito.nombreNormalizado`.
- Validar el distrito en el registro.
- Comparar `capa` y `cultivo` en la consulta de viabilidad.

**No duplicar** esta lógica en otros módulos.

---

## 5. Unidades y redondeo

- La base guarda hectáreas (`Decimal(12,3)`).
- El servicio convierte a manzanas con `HA_POR_MANZANA = 0.7` (`viabilidad/constantes.ts`).
- Las sumas se hacen en milésimas de hectárea (enteros) para evitar errores de coma flotante.
- Los porcentajes se redondean a 1 decimal; las manzanas, a 2.
- La clase dominante se decide con las áreas exactas, no con porcentajes redondeados. En empate gana la clase de menor `valor`.

### Estimación de costos (4-C)

- La dosis de cada insumo se multiplica por el área en manzanas.
- Semilla (lb), fertilizantes (QQ) y mano de obra (jornal) se redondean **hacia arriba** a la unidad comprada.
- Maquinaria, alquiler y riego se cobran por manzana: se prorratean por el área y se redondean a centavos hacia arriba. No se redondean a pases enteros.
- El total se calcula en centavos para evitar ruido de coma flotante.
- La estimación no incluye costos indirectos (administración, imprevistos, intereses) ni el transporte interno de la cosecha. Es un piso de costos directos, no el costo total del MAG.

---

## 6. Invariantes

- Un `Distrito` siempre tiene `nombreNormalizado` único.
- Un `Usuario` siempre tiene un `distritoId` válido.
- `correo` y `duiHash` son únicos.
- `AreaClase` es única por (`distritoId`, `claseId`).
- `ClaseCapa` es única por (`capaId`, `valor`).
- `CondicionDistrito` tiene como máximo una fila por distrito.
- Una `Siembra` siempre tiene `usuarioId` y `distritoId` válidos.
- `inversionTotalUsd` es obligatoria; el desglose es opcional y no puede tener montos negativos. Puede superar el total (decisión MVP).
- Una siembra solo es visible para el usuario que la creó.
- Una `Estimacion` siempre pertenece a una siembra y a un usuario existentes.
- `estimaciones` es un historial: cada recálculo inserta una fila; no se actualiza la anterior.
- El historial de estimaciones solo es visible para su usuario.
- La carga de CENTA no debe dejar distritos sin sus 12 áreas esperadas.

---

## 7. Inconsistencias documentales conocidas

| Documento | Dice | Realidad |
|---|---|---|
| `data/Info_Datos_CENTA.md` | Las coordenadas están pendientes. | Ya existen desde 3-0b. |
| `data/Info_Datos_Clima.md` | Usa `EXCESO`. | El enum y la API usan `EXCESO_LLUVIA`. |

Los contratos no se editan sin acuerdo del equipo; estas notas viven aquí y en `gotchas.md`.

---

## 8. Respaldo y reinicio

- Para desarrollo, `docker compose down -v` borra el volumen y deja la base limpia.
- Después: `docker compose up -d db`, `npx prisma migrate dev` y `npm run datos:cargar`.
- No hay respaldo automático. En producción (Parte 7) hace falta una estrategia explícita.
