# Release v1.1 — presentación visual

- **Base:** `main` en v1.0 (`agroalerta-v1.0`).
- **Rama de trabajo:** `dev`.
- **Estado:** cambios listos para PR a `main`.

## Cambios

- **SPA en Vercel:** se pasó a `routes` con `handle: filesystem` y fallback `/(.*) → /index.html`; el rewrite de `/api` sigue primero. Corrige el 404 al recargar `/dashboard` o `/historial`.
- **Encabezado climático:** se oculta cuando el distrito no tiene condición evaluada; ya no queda fijo “Sin evaluar”.
- **Estimación:** se quitó la etiqueta textual del color (`VERDE`/`AMARILLO`/`ROJO`) del banner; el color y el título siguen comunicando el riesgo.
- **Datos técnicos de siembra:** los checks ahora son tarjetas en una grilla, con checkbox de 18 px y tres columnas en escritorio.
- **Registro de siembra:** al guardar, redirige directo al dashboard en lugar de mostrar un mensaje arriba.
- **Modo oscuro:** botón sol/luna en el encabezado, persistido en `localStorage` (`agroalerta_tema`) y con preferencia inicial del sistema.
- **Pulido visual:** fondo con degradado suave, botones primarios con degradado, tarjetas con hover y tokens de tema oscuro.

## Verificación

- `npm run typecheck` y `npm test -- --watch=false` (11 archivos, 33 casos) en frontend.
- `npm run build` en verde; se mantienen los avisos de presupuesto de CSS.

## v1.2 — siguiente

- Envío real del código de verificación por correo (SMTP/proveedor) y `VERIFICACION_AUTOMATICA=false`.
- Actualización meteorológica hasta donde alcance la fuente.
- Mejora general del formulario de siembra, sin quedar atado al plan original.
