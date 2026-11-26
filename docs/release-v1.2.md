# Release v1.2 — funcionamiento

- **Rama:** `dev`
- **Estado:** correo real implementado; actualización meteorológica y mejora del formulario pendientes.

## Correo real

- `backend/src/auth/correo.ts` envía el enlace por SMTP (`SMTP_*`, `FRONTEND_URL`).
- `registro.service` envía el correo cuando `VERIFICACION_AUTOMATICA=false`.
- Nueva página pública `/verificar/:token` que llama a `GET /auth/verificar/:token` y muestra el resultado.
- Si SMTP no está configurado, el error se registra y la cuenta queda pendiente; `VERIFICACION_AUTOMATICA=true` sigue siendo el respaldo MVP.

## Pendiente

- Configurar SMTP en Render y desactivar la verificación automática.
- Actualización meteorológica hasta donde alcance la fuente.
- Mejora general del formulario de siembra.
