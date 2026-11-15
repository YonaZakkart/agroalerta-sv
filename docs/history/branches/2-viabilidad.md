# Historia — Parte 2: viabilidad y zonas de Morazán

- **Periodo:** 4 a 30 de octubre de 2026
- **Fuente:** `docs/Estado_del_Proyecto.txt`, sección «Parte 2»
- **Estado:** ✅ cerrada

## Resumen

| Punto | Rama | Responsable | Resultado |
|---|---|---|---|
| 2-A | `feat/2-a-modelos-viabilidad` | Yona | Modelo `Municipio`/`Distrito`/`Capa`/`ClaseCapa`/`AreaClase` |
| 2-B | `feat/2-b-datos-centa` | Yona | Limpieza y carga: 2 municipios, 26 distritos, 312 áreas |
| 2-C | `feat/2-c-servicio-viabilidad` | — | `consultarViabilidad()` |
| 2-D | `feat/2-d-endpoint-viabilidad` | Pocho | **Rechazada**; rehecha en un `fix` |
| 2-END | `chore/2-end-verificaciones-ajustes` | Smith | Normalización común y D1 |
| 2-END | `chore/2-end-usuario-distrito-catalogo` | Smith | `Usuario.distrito_id` con FK |

---

## 2-A — Modelo de viabilidad

**Rama:** `feat/2-a-modelos-viabilidad` · **Responsable:** Yona · **4 de octubre de 2026**

Se agregaron al final de `schema.prisma`, sin tocar `Usuario`:

- `enum TipoCapa { POTENCIAL, RIESGO }` — en potencial un valor mayor es mejor; en riesgo, peor.
- `Municipio` (2 filas), `Distrito` (26, con `id` = código CENTA y `nombreNormalizado` único).
- `Capa` (4), `ClaseCapa` (3 por capa) y `AreaClase` (distrito × clase, con hectáreas y fuente).
- Migración `add_viabilidad`.

**Decisión clave:** CENTA no tiene API pública. Se usan exportaciones CSV versionadas. Ver [`adr/2-A.md`](../../adr/2-A.md).

El contrato de datos quedó en `docs/data/Info_Datos_CENTA.md` (entonces con otro nombre).

---

## 2-B — Limpieza y carga de datos

**Rama:** `feat/2-b-datos-centa` · **Responsable:** Yona · **6 de octubre de 2026**

Dos programas independientes:

### `npm run datos:limpiar`

- Lee `backend/data/centa/raw/` (exports originales, sin abrir en Excel).
- Valida: departamento 13, códigos 1301–1326, clases coherentes, hectáreas > 0, coherencia km²/ha, duplicados, emparejado de nombres entre capas y totales por distrito.
- Completa las clases ausentes con 0 ha: cada capa queda con 78 filas (26 × 3). Se completaron 38 filas.
- Si hay errores, los lista todos y **no escribe nada**.
- Salida determinista: `clean/distritos.csv` (26) y `clean/areas_clase.csv` (312), UTF-8 sin BOM y saltos LF.

### `npm run datos:cargar`

- Lee solo los CSV limpios y `fuente.json`.
- Valida los conteos esperados (2, 26, 4, 12, 312) antes de escribir.
- Upsert en **una transacción**, en orden: municipio → distrito → capa → clase → área.
- Cuenta las filas antes de confirmar; si no coinciden, revierte.
- Idempotente. Mensajes con pista para `P2021`/`P2022` y `P2039`.

### Resultado con datos reales

| Control | Valor |
|---|---|
| Filas leídas | maíz 78, frijol 76, maicillo 74, sequía 46 |
| Distribución | maíz 26/26/26; frijol 26/26/24; maicillo 26/22/26; sequía 26 moderada, 10 leve, 10 severa |
| Áreas | 312 filas, 38 en cero |
| Diferencia máxima entre capas | 1.100 ha (tolerancia 5 ha) |
| Chilanga en maíz | 2024.138 + 2779.240 + 1195.159 = 5998.537 ha |

**Incidencias:** un archivo con tilde en el nombre no se podía renombrar (forma NFD); se resolvió con un comodín. Regla: nombres de archivo solo ASCII.

---

## 2-C — Servicio de consulta

**Rama:** `feat/2-c-servicio-viabilidad`

- `viabilidad/constantes.ts`: `HA_POR_MANZANA = 0.7`, único lugar de la conversión.
- `viabilidad/service.ts`: `consultarViabilidad(id, { capa?, cultivo? })`.
  - 400 si llegan `capa` y `cultivo` juntos.
  - 404 si el distrito, la capa o el cultivo no existen.
  - Al filtrar por cultivo se incluye siempre `riesgo_sequia`.
  - Suma áreas en milésimas de hectárea (enteros) y redondea al final.
  - La clase dominante se decide con las áreas exactas; en empate gana el menor `valor`.
  - Porcentajes a 1 decimal y manzanas a 2, solo para mostrar.

---

## 2-D — Endpoint de viabilidad

### Primera versión: rechazada

**Rama:** `feat/2-d-endpoint-viabilidad` · **Responsable:** Pocho · **18 de octubre de 2026**

`GET /viabilidad/distritos/:id` con `requireAuth`, validación de id, rechazo de parámetros repetidos y traducción de `ViabilidadError`. El PR **no se mergeó**.

Problemas detectados:

- Un id de 20 dígitos respondía **500** en lugar de 400 (desbordamiento al convertir a número).
- El manejo del error de `listen` de 1-END no estaba en `main`: un puerto ocupado se disfrazaba de arranque exitoso.

### Corrección

**Rama:** `fix(viabilidad): rechazar ids fuera de rango seguro…` · **21 de octubre de 2026**

- `validarIdDistrito` exige `/^\d+$/`, entero seguro y mayor que cero. `99999999999999999999` → 400; `2147483648` → 404; `01304` → 200.
- Se restauró el manejo del error de `listen`.

**Decisión pendiente de confirmar:** la respuesta usa `nombre` en cada clase y `clases` en lugar de `distribucion`. Se documentó la forma real en `Info_Datos_CENTA.md`. El alias «sorgo» no se acepta: 404.

**Incidencias de entorno:** `P3014` (contenedor viejo sin `grant-shadow.sql`), puerto 3306 ocupado por MySQL96 en Windows y `P1001` por resolución IPv6 de `localhost`.

---

## 2-END — Cierre de la Parte 2

Se ejecutó en dos ramas de código y una de documentación. Los bloques C (listado de distritos, coordenadas y eventos) se movieron a la Parte 3; E (pruebas automatizadas) y F (datos de referencia) siguen pendientes.

### `chore/2-end-verificaciones-ajustes`

**Responsable:** Smith · **28–30 de octubre de 2026**

- `comun/normalizar.ts`: `colapsarEspacios` y `normalizarNombre` movidas desde `viabilidad/datos/utilidades.ts` para que las use también autenticación.
- D1: `capa` y `cultivo` se comparan sin mayúsculas ni tildes.

### `chore/2-end-usuario-distrito-catalogo`

**Responsable:** Smith · **30 de octubre de 2026**

- `Usuario.distrito` (texto) → `distritoId` con clave foránea a `Distrito`.
- Migración `20261030231036` (la carpeta quedó sin sufijo, solo cosmético).
- `auth/distrito.select.ts`: `SELECT_DISTRITO` compartido por registro, login y perfil.
- El registro sigue recibiendo el **nombre** del distrito y lo resuelve con `normalizarNombre`; si no existe, 400. La búsqueda ocurre **antes** de `argon2.hash` para no pagar el costo con datos inválidos.
- `AgricultorRegistrado` agrega `distritoId`.

**Decisión:** reiniciar las bases de desarrollo (`docker compose down -v`) porque la columna obligatoria no se puede agregar a una tabla con filas. Se documentó en `gotchas.md`.

**Pruebas:** 11 variantes de nombre con tilde, mayúsculas y espacios; 400 para distritos inválidos; flujo completo hasta viabilidad; `INSERT` con FK inexistente rechazado por MySQL.

**Incidencias:** la carpeta de la migración sin sufijo y los CSV marcados como modificados por fin de línea.

---

## Estado al cerrar la Parte 2

- Catálogo de 2 municipios y 26 distritos, con 312 áreas de CENTA.
- `Usuario` relacionado con el catálogo; municipio derivado en el perfil.
- `GET /viabilidad/distritos/:id` y `GET /distritos` (este último llegó en 6-A).
- Normalización única en `comun/normalizar.ts`.
- Sin temporadas, sin coordenadas (llegaron en 3-0b), sin pruebas automatizadas.
