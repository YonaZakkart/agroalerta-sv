# Datos, modelo y migraciones

El backend usa MySQL 8.4 con Prisma 7.10.0. Los datos vienen de tres fuentes:

1. **CENTA** — viabilidad agrícola por distrito, cargada desde CSV versionados.
2. **Open-Meteo** — lluvia diaria y normal de 30 días, consultada en tiempo de ejecución.
3. **Registro de usuarios** — datos personales y sesión.

---

## 1. Modelo Prisma

```
Municipio 1 ─── * Distrito 1 ─── * AreaClase * ─── 1 ClaseCapa * ─── 1 Capa
                     │
                     ├── * Usuario
                     └── 1 CondicionDistrito
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

### Enums

```prisma
enum TipoCapa { POTENCIAL RIESGO }
enum CondicionClima { SEQUIA EXCESO_LLUVIA INVIERNO_ACEPTABLE }
enum NivelSequia { DEBIL MODERADA FUERTE SEVERA }
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

---

## 6. Invariantes

- Un `Distrito` siempre tiene `nombreNormalizado` único.
- Un `Usuario` siempre tiene un `distritoId` válido.
- `correo` y `duiHash` son únicos.
- `AreaClase` es única por (`distritoId`, `claseId`).
- `ClaseCapa` es única por (`capaId`, `valor`).
- `CondicionDistrito` tiene como máximo una fila por distrito.
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
