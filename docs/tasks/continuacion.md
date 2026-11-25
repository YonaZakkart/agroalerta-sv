# Continuación — próximos pasos en orden

- **Estado del proyecto:** Partes 0–4 cerradas, Hito 1 cerrado, 6-D implementado y 5-A hecho. Siguiente: 5-B.
- **Última actualización:** 24 de noviembre de 2026
- **Regla:** cada punto se cierra con su rama, su PR, sus pruebas y su registro en `history/branches/`.

---

## 0. Antes de empezar cualquier punto

1. `git pull origin main` y crear la rama desde `main`.
2. Leer `architecture/backend.md`, `architecture/frontend.md` o `architecture/data.md` según el área.
3. Revisar `gotchas.md` y `conventions.md`.
4. Confirmar quién toca los archivos compartidos: `schema.prisma`, `migrations/`, `events/types.ts`, `index.ts`, `app.routes.ts`, `app.config.ts`, `styles.css`, `models.ts` y `package.json`.

---

## 1. Decisión de la Parte 4 — aprobada

**D1 (14/11/2026):** la siembra **permite elegir el distrito**, con el del perfil como valor inicial.

- Una siembra ocurre en un lugar concreto; heredar el distrito que el usuario estaba explorando en el dashboard es riesgoso.
- **Consecuencia:** 4-A pudo comenzar porque el modelo de siembra incluye `distritoId` de todos modos. La decisión solo afectaba al formulario de 4-B, ya implementado.
- **Estado:** resuelta. No bloquea la Parte 4.

---

## 2. Parte 4 — Siembra (Hito 3)

### 4-A — Modelo de Siembra

**Depende de:** nada nuevo (Usuario y Distrito existen). **Estado:** ✅ hecho (PR #53). **Tamaño:** M.

- Agregar al final de `schema.prisma`, bajo un comentario de sección:
  - `Siembra`: `id`, `usuarioId`, `distritoId`, `cultivo`, `estado`, `fechaSiembra`, `areaMz`, y los campos de inversión (semilla, alquiler, maquinaria, riego, otros).
  - Enums de cultivo y estado, o cadenas validadas si el equipo prefiere no migrar enums.
- Migración nueva sobre `main` actualizado. No reutilizar nombres de migraciones existentes.
- Relaciones inversas en `Usuario` y `Distrito`.
- **Criterio de aceptación:** `npx prisma migrate dev` limpio, `npx tsc --noEmit` sin errores y una siembra de prueba creada por SQL o Prisma Studio.
- **Archivos compartidos:** `schema.prisma`, `migrations/`.

### 4-B — Formulario de siembra

**Depende de:** 4-A y 6-0 (listo). **Estado:** ✅ hecho (PR #55); el estimado de inversión previo queda pendiente de integración. **Tamaño:** L.

- Vista nueva en `pages/siembra/`, ruta hija del `Shell` protegida por `authGuard`.
- Dos grupos: datos agronómicos (cultivo, distrito, fecha, área) y datos técnicos (semilla, alquiler, maquinaria, riego).
- Selector de distrito con el del perfil como valor inicial; no heredar el distrito que se está explorando en el dashboard (D1).
- Estimado de inversión previo, calculado en el cliente con los mismos supuestos que 4-C, o mostrado solo cuando 4-C exista.
- Mobile-first, con los tokens de `styles.css`; no copiar colores.
- **Criterio de aceptación:** el formulario valida, muestra errores del backend y no inventa cifras.
- **Archivos compartidos:** `app.routes.ts`, `models.ts`.

### 4-C — Estimación de costos

**Depende de:** F3 (precios y dosis). **Estado:** ✅ hecho. F3 obtenido del MAG 2022-2023; contrato en `data/Info_Datos_Precios.md`. **Tamaño:** M.

- Tabla o archivo de referencia con precios promedio, dosis por manzana, jornales, alquiler, maquinaria y riego.
- Cada valor con **fuente y fecha**; lo que no se consiga se declara supuesto.
- Redondeo hacia arriba en unidades compradas.
- Función pura y pruebas sin red.
- **Criterio de aceptación:** un caso conocido de manzanas produce el mismo total a mano y en la prueba.

### 4-D — Endpoints y evento

**Depende de:** 4-A (listo). **Estado:** ✅ hecho. **Tamaño:** M.

- `POST /siembras` y `GET /siembras` con `requireAuth`; solo el dueño ve sus siembras.
- Validación de entrada con el contrato `{ error, detalles }`.
- Emitir `SiembraRegistrada` **después** de persistir, con `emitirSeguro`.
- **Criterio de aceptación:** 201/200/400/401/404 probados; el evento se emite con el payload de `events/types.ts`.
- **Archivos compartidos:** `index.ts`, `events/types.ts` (solo si falta algún campo).

---

## 3. Parte 5 — Estimación y recomendaciones (núcleo EDA)

### 5-A — Listeners

**Depende de:** 4-D y 3-C (listos). **Estado:** ✅ hecho. **Tamaño:** M.

- Escuchar `SiembraRegistrada` y `CondicionClimaticaActualizada`.
- Un listener no debe lanzar: `emitirSeguro` captura el error, pero el listener debe registrar y continuar.
- **Decisiones ya tomadas:** D2 mantiene `null` para la cuarta salida de clima; D3 emite `CondicionClimaticaActualizada` en la primera clasificación de cada distrito, una sola vez; D4 no exige persistencia de N días porque el margen de 0.05 amortigua.
- **Criterio de aceptación:** una siembra nueva dispara el cálculo; un cambio de clima recalcula solo los distritos afectados.
- **Resultado:** los listeners arman `ContextoEstimacion` y llaman a `solicitarCalculo`. La proyección real es 5-B; 5-A no inventa rendimiento ni ingresos.

### 5-B — Proyección de rendimiento e ingresos

**Depende de:** F1 (rendimiento estándar) y F4 (precio de venta). **Estado:** siguiente. **Tamaño:** M.

- Rendimiento base por cultivo y área, ajustado por condición climática.
- Los porcentajes de ajuste son **supuestos documentados**, no datos oficiales.
- Guardar el resultado con la fecha y los insumos usados, para poder explicarlo.
- **Criterio de aceptación:** el cálculo es reproducible y no depende de la interfaz.

### 5-C — Recomendaciones

**Depende de:** 5-B. **Tamaño:** M.

- Semáforo verde/amarillo/rojo según riesgo.
- La viabilidad de CENTA se cita como referencia distrital, **no** como veredicto sobre la parcela.
- La sequía meteorológica no equivale a pérdida de cultivo: redactarlo así.
- **Criterio de aceptación:** cada recomendación cita el dato que la origina.

### 5-D — Persistencia y reporte

**Depende de:** 5-B y 5-C. **Tamaño:** M.

- Guardar el reporte, la última estimación y el historial.
- Exponer `GET /estimaciones` (o el recurso que se acuerde) con `requireAuth`.
- **Criterio de aceptación:** el dashboard y el historial pueden leer el reporte sin recalcular.

---

## 4. Frontend restante

### 6-C — Historial de evaluaciones

**Depende de:** 4-D y 5-D. **Tamaño:** M.

- Vista nueva con la lista de siembras y sus estimaciones.
- Estados de carga, vacío y error; sin datos de ejemplo.
- **Archivos compartidos:** `app.routes.ts`, `models.ts`.

### 6-E — Estimación real en el dashboard

**Depende de:** 5-D. **Tamaño:** M.

- Reemplazar el panel vacío del dashboard por la última estimación real.
- Si no hay estimación, mantener el estado vacío con un enlace a siembra.
- **Criterio de aceptación:** no aparece ninguna cifra de `dashboard_base.html` como dato real.

### Configuración (dentro de 6-D)

- Vista con datos del perfil y cierre de sesión.
- Edición de perfil no está en el alcance; solo lectura salvo que el equipo decida lo contrario.

---

## 5. Parte 7 — Cierre y despliegue

### 7-A — Docker Compose completo

- Servicios `db`, `backend` y `frontend`; el frontend servido por Nginx o por el SSR.
- Variables por entorno; secretos fuera de la imagen.
- **Criterio:** `docker compose up` levanta el sistema desde cero y `/health` responde.

### 7-B — Producción

- Secretos propios y TLS hacia MySQL (sin `allowPublicKeyRetrieval`).
- `CORS_ORIGINS` con los orígenes reales.
- `EXPONER_TOKEN_VERIFICACION=false`.
- Rate limit compartido si hay más de una instancia.
- **Criterio:** una revisión de configuración no encuentra secretos en el repositorio ni valores de desarrollo.

### 7-C — Pruebas de flujo completo

- E2E de registro → verificación → login → siembra → estimación → historial.
- Separar `app` de `listen` para poder probar la API sin abrir puerto.
- **Criterio:** el flujo corre en CI.

### 7-D — Documentación de despliegue

- README de despliegue, variables, respaldo y rollback.
- Actualizar `architecture/api.md` y `architecture/data.md` con lo que cambie.

---

## 6. Orden recomendado si el tiempo aprieta

1. 5-B con supuestos declarados.
2. 6-E (una sola cifra real vale más que tres vistas).
3. 5-C y 6-C.
4. Parte 7.

5-A ya está hecho: los eventos disparan el recálculo y dejan el contexto listo.

**No se recorta:** Hito 1, que ya está cerrado.

---

## 7. Checklist de cierre de cada punto

- [ ] Rama desde `main` y PR con la plantilla.
- [ ] `npm run typecheck` y `npm test` en verde (backend y frontend).
- [ ] Pruebas nuevas para la lógica de negocio.
- [ ] Contrato `{ error, detalles }` respetado.
- [ ] Sin datos de ejemplo presentados como reales.
- [ ] Documentación actualizada: `architecture/`, `history/branches/` y este archivo.
- [ ] Archivos compartidos anotados en el PR.
- [ ] Sin CSV crudos ni `.env` en el commit.
