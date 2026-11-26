# Release v1.2 — funcionamiento

- **Rama:** `dev`
- **Estado:** correo real implementado; actualización meteorológica y mejora del formulario pendientes.

## Correo real

- `backend/src/auth/correo.ts` envía el enlace por SMTP (`SMTP_*`, `FRONTEND_URL`).
- `registro.service` envía el correo cuando `VERIFICACION_AUTOMATICA=false`.
- Nueva página pública `/verificar/:token` que llama a `GET /auth/verificar/:token` y muestra el resultado.
- Si SMTP no está configurado, el error se registra y la cuenta queda pendiente; `VERIFICACION_AUTOMATICA=true` sigue siendo el respaldo MVP.

## Actualización meteorológica

- Botón **Actualizar clima** en Clima Zonal: fuerza `POST /clima/actualizar` para todos los distritos y recarga las condiciones.
- Muestra estado de actualización, error con reintento y mensaje de éxito.

## Formulario de siembra

- Ayudas por sección (agronómica y técnica).
- `inputmode="decimal"` en campos numéricos para teclado móvil.
- Se aclara que la estimación se calcula al guardar y aparece en el dashboard.

## Pendiente

- Configurar SMTP en Render y desactivar la verificación automática.
- Fix del 404 al recargar (pospuesto).
- Pulido adicional del formulario si se decide ampliar el alcance.
