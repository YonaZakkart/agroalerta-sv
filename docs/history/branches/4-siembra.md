# Historia — Parte 4: siembra y estimación de costos

- **Periodo:** 15 a 24 de noviembre de 2026
- **Ramas:** `feat/4-a-modelo-siembra`, `feat/4-b-formulario-siembra`, `feat/4-c-estimacion-costos`, `feat/4-d-endpoints-siembra`
- **Estado:** 4-A, 4-B y 4-C cerrados; 4-D implementado en esta rama, se cierra al mergear.
- **Fuente:** `git log`, `docs/4-A-doc.txt` y el código en `main`.

## Resumen

| Punto | Rama | Responsable | PR | Resultado |
|---|---|---|---|---|
| 4-A | `feat/4-a-modelo-siembra` | Requeno | #53 | Modelo `Siembra`, tres enums y migración `add_siembras` |
| 4-A docs | `docs/4-a-modelo-siembra` | Requeno | #54 | Documentación en `.txt`; se integra a `.md` en esta rama |
| 4-B | `feat/4-b-formulario-siembra` | Josué | #55 | Ruta `/siembra`, servicio y formulario Angular |
| 4-C | `feat/4-c-estimacion-costos` | Yona | #56 | Tabla F3, función pura y pruebas |
| 4-D | `feat/4-d-endpoints-siembra` | Yona | #57 | `POST /siembras`, `GET /siembras` y `SiembraRegistrada` |

**Decisión previa:** D1 (14/11/2026) aprobó que la siembra permita elegir el distrito, con el del perfil como valor inicial. No se hereda el distrito que se explora en el dashboard.

---

## 4-A — Modelo de Siembra

**Rama:** `feat/4-a-modelo-siembra` · **Responsable:** Requeno · **15 de noviembre de 2026** · PR #53

Se agregó al final de `backend/prisma/schema.prisma`, bajo el comentario «Parte 4 — Siembra (4-A)»:

- Enums `Cultivo` (`MAIZ`, `FRIJOL`, `MAICILLO`), `EstadoSiembra` (`POR_SEMBRAR`, `SEMBRADO`) y `UnidadSemilla` (`LIBRAS`, `BOLSAS`).
- Modelo `Siembra` → tabla `siembras`: usuario, distrito, cultivo, estado, fecha, área en manzanas, semilla opcional, tres banderas (`alquilaTerreno`, `usaMaquinaria`, `usaRiego`), inversión total obligatoria y desglose opcional (semilla, alquiler, maquinaria, riego, otros).
- Relaciones inversas `siembras Siembra[]` en `Usuario` y `Distrito`.
- Índice (`usuarioId`, `creadoEn`) para el futuro `GET /siembras`.
- Migración `20261116035128_add_siembras`.

**Decisiones de diseño:**

1. Enums y no cadenas: son tres granos fijos y el mapa permitía cualquiera de las dos opciones.
2. `cantidadSemilla` y `unidadSemilla` son opcionales en la base; la obligatoriedad conjunta se valida en 4-D.
3. `inversionTotalUsd` es obligatoria y el desglose opcional, para que el total y las partes no se contradigan en el esquema. 4-D valida que la suma del desglose no exceda el total.
4. Moneda en dólares, con sufijo `Usd`.
5. Las FK usan `ON DELETE RESTRICT`: no se puede borrar un usuario o distrito con siembras.

**Verificación:** `npx prisma migrate dev --name add_siembras` limpio, `npx tsc --noEmit` y `npm run build` sin errores, e inserción de prueba por SQL con FK inválida rechazada. En Windows, `npm test` se cortaba por un fallo de libuv en `pruebas:http` ajeno al punto; en Linux la cadena corre completa.

**Pendiente de 4-A:** confirmar con el equipo el modelo ampliado (semilla, banderas y total declarado). El peso de una «bolsa» de semilla sigue sin definirse; 4-C no lo usa porque trabaja en libras.

---

## 4-B — Formulario de siembra

**Rama:** `feat/4-b-formulario-siembra` · **Responsable:** Josué · **23 de noviembre de 2026** · PR #55

Esta rama no había quedado documentada; se registra aquí.

**Qué se hizo:**

- Ruta hija `/siembra` del `Shell`, protegida por `authGuard`.
- `SiembraService` con `POST /siembras` (el endpoint llega en 4-D).
- Tipos `CULTIVOS_SIEMBRA`, `Distrito`, `EstadoSiembra` y `DatosSiembra` en `core/models.ts`.
- Componente `pages/siembra/` con formulario reactivo de dos grupos:
  - **Agronómico:** cultivo, distrito, estado, fecha y área en manzanas.
  - **Técnico:** banderas de alquiler, maquinaria y riego; inversión total y desglose opcional.
- El distrito del perfil es el valor inicial; el usuario puede cambiarlo (D1).
- Validaciones: fecha coherente con el estado (`SEMBRADO` no futura, `POR_SEMBRAR` no pasada), semilla completa (cantidad y unidad juntas), área entre 0.01 y 999 999.99 y aviso si el desglose supera el total.
- `fix(frontend): formulario de siembra compila con ReactiveFormsModule` agregó `ReactiveFormsModule` a los imports; sin él, `formGroup`, `formControlName` y `ngValue` fallaban con `NG8002`.

**Lo que no se hizo:** el estimado de inversión previo. El formulario muestra el aviso «El estimado de inversión estará disponible cuando existan los precios de referencia del proyecto». Con 4-C ya existen los precios y con 4-D el registro funciona, pero todavía no hay endpoint ni tabla compartida para mostrar el estimado; queda para una rama de frontend posterior.

**Archivos compartidos tocados:** `frontend/src/app/app.routes.ts` y `frontend/src/app/core/models.ts`.

---

## 4-C — Estimación de costos

**Rama:** `feat/4-c-estimacion-costos` · **Responsable:** Yona · **24 de noviembre de 2026**

**Fuente F3:** MAG/DGEA/DEA, *Costos de producción de cultivos agrícolas*, ciclo 2022-2023, publicado el 21 de febrero de 2024. Es el informe oficial más reciente que se consiguió. Se usaron tres fichas:

- Maíz semitecnificado (PDF pág. 15).
- Frijol de invierno (PDF pág. 12).
- Sorgo semi-tecnificado / maicillo (PDF pág. 16).

**Qué se hizo:**

- `backend/src/estimacion/referencia.ts`: tabla F3 con dosis por manzana, precio unitario, fuente, fecha y tipo (`OFICIAL` / `SUPUESTO`). Es la única fuente de valores.
- `backend/src/estimacion/estimar-costos.ts`: función pura `estimarCostos(cultivo, areaMz, opciones)`.
  - Semilla (lb), fertilizantes (QQ) y mano de obra (jornal) se redondean hacia arriba.
  - Maquinaria, alquiler y riego se prorratean por manzana y se redondean a centavos hacia arriba.
  - `alquilaTerreno`, `usaMaquinaria` y `usaRiego` excluyen sus rubros cuando están en `false`.
  - El total se calcula en centavos.
- `backend/src/estimacion/index.ts`: API pública del módulo.
- `backend/src/estimacion/estimar-costos.pruebas.ts`: 13 casos sin red ni base.
- `backend/package.json`: script `pruebas:estimacion` y su lugar en `npm test`.
- `docs/data/Info_Datos_Precios.md`: contrato de F3, tablas, reglas y caso conocido.

**Decisiones:**

1. Una ficha por cultivo porque el formulario no pregunta nivel tecnológico ni temporada. Las otras fichas del informe quedan documentadas como alternativa.
2. El riego es un **supuesto**: el informe solo trae cuota de agua para arroz bajo riego ($63.64/mz). Se usa como referencia y se marca `SUPUESTO`.
3. No se incluyen costos indirectos (administración, imprevistos, intereses) ni transporte interno de la cosecha. La estimación es un piso de costos directos, no el total del MAG.
4. No se guarda en la base: 4-C no agrega columnas ni migraciones. Si el equipo quiere persistir el estimado (`inversionEstimadaUsd`), es otra migración.
5. No se declara el peso de una bolsa de semilla. La estimación usa la dosis en libras; `BOLSAS` sigue siendo una unidad válida del formulario, pero 4-C no la convierte.

**Verificación:** `npm run typecheck`, `npm test` completo y `npm run build` sin errores; `npm run pruebas:estimacion` con 13/13. El caso conocido de 1 mz de maíz semitecnificado con todos los rubros da $1 329.28, reproducible a mano con la tabla.

**Pendientes que deja:**

- Precios de 2022-2023: sirven para demostrar el cálculo, no como cotización actual.
- Falta el endpoint o la integración para mostrar el estimado en el formulario.
- Falta decidir si se persiste el estimado en `Siembra`.
- Falta el peso de una bolsa de semilla si se quiere convertir `BOLSAS` a libras.

---

## 4-D — Endpoints y evento

**Rama:** `feat/4-d-endpoints-siembra` · **Responsable:** Yona · **24 de noviembre de 2026** · PR #57

**Qué se hizo:**

- `backend/src/siembra/siembra.validacion.ts`: validación pura de `POST /siembras` con el contrato `{ error, detalles }`.
- `backend/src/siembra/siembra.dto.ts`: mapeo de `Decimal` y fechas al contrato público.
- `backend/src/siembra/siembra.service.ts`:
  - Comprueba que el distrito exista (404 si no).
  - Persiste la siembra con el `usuarioId` del token.
  - Emite `SiembraRegistrada` **después** del insert con `emitirSeguro`.
  - `GET /siembras` filtra por `usuarioId` y ordena por `creadoEn` descendente.
- `backend/src/siembra/siembra.routes.ts`: `POST /siembras` y `GET /siembras` con `requireAuth`. El router se crea con dependencias para probar el contrato HTTP sin MySQL.
- `backend/src/index.ts`: monta `/siembras` y aplica un límite de 30 peticiones por minuto por IP.
- Pruebas: `siembra.pruebas.ts` (20 casos de validación, DTO y servicio) y `siembra.routes.pruebas.ts` (8 casos HTTP: 201/200/400/401/404/500 y JSON mal formado).

**Decisiones MVP:**

1. **El desglose puede superar la inversión total.** El formulario ya lo advierte y permite guardar; rechazarlo obligaría al agricultor a inventar un total. Solo se validan montos no negativos.
2. **La fecha se compara en `America/El_Salvador`**, no en UTC, para que “hoy” coincida con el `<input type="date">` del agricultor.
3. **404 si el distrito no existe**, incluida una carrera con la FK (`P2003`).
4. **Sin paginación y sin `GET /siembras/:id`.** La colección ya viene filtrada por dueño; el historial de 6-C puede pedir todo.
5. **El evento lleva la fecha de siembra** (`fechaSiembra`), no la de creación del registro.
6. **Si un listener falla, la siembra ya guardada se devuelve igual.** `emitirSeguro` captura el error y el servicio no revierte la transacción.

**Verificación:** `npm run typecheck`, `npm test` (21 grupos) y `npm run build` en verde. No se probó contra MySQL real: las pruebas usan servicios falsos y un token firmado, como el resto del proyecto.

**Pendientes que deja:**

- Prueba de integración con MySQL real y un usuario verificado.
- Paginación de `GET /siembras` si el historial crece.
- Endpoint o integración para mostrar el estimado de 4-C en el formulario.

---

## Archivos compartidos

| Archivo | Punto | Riesgo |
|---|---|---|
| `backend/prisma/schema.prisma` | 4-A | Conflictos con otras ramas que toquen `Usuario` o `Distrito`. |
| `backend/prisma/migrations/` | 4-A | Las migraciones van en secuencia. |
| `frontend/src/app/app.routes.ts` | 4-B | Rutas hijas del `Shell`. |
| `frontend/src/app/core/models.ts` | 4-B | Contratos del frontend. |
| `backend/src/index.ts` | 4-D | Montaje de routers y limitadores. |
| `backend/package.json` | 4-C / 4-D | Cadena de `npm test`. |

---

## Qué sigue

**5-A — Listeners:** escuchar `SiembraRegistrada` y `CondicionClimaticaActualizada`, sin lanzar y sin frenar el emisor.

**Después:** 5-B (proyección con F1 y F4), 5-C (recomendaciones), 5-D (persistencia), 6-E (estimación real en el dashboard) y 6-C (historial).
