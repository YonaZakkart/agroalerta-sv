# Arquitectura del frontend

Aplicación Angular 22 standalone, con signals, HttpClient con `fetch`, interceptor funcional y guards funcionales. Consume el backend a través de `/api` (proxy en desarrollo).

---

## 1. Arranque

```
main.ts
  └── bootstrapApplication(App, appConfig)
        ├── provideRouter(routes)
        ├── provideClientHydration()
        └── provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
```

`app.routes.server.ts` declara `RenderMode.Client` para `"**"`. El SSR existe en el proyecto, pero no ejecuta lógica de sesión ni de datos.

---

## 2. Rutas

| Ruta | Componente | Guard | Render |
|---|---|---|---|
| `/login` | `Login` | `invitadoGuard` | Client |
| `/registro` | `Registro` | `invitadoGuard` | Client |
| `/` → `/dashboard` | `Shell` + `Dashboard` | `authGuard` | Client |
| `/clima-zonal` | `Shell` + `ClimaZonal` | `authGuard` | Client |
| `**` | redirige a `''` | — | Client |

- `authGuard`: si no hay sesión vigente, redirige a `/login`.
- `invitadoGuard`: si hay sesión, redirige a `/dashboard`.
- Las páginas se cargan con `loadComponent` (lazy).

---

## 3. Capa `core/`

| Archivo | Responsabilidad |
|---|---|
| `api.config.ts` | `API_URL = '/api'`. |
| `models.ts` | Contratos del backend: `Usuario`, `Distrito`, `RespuestaLogin`, `RespuestaViabilidad`, etc. |
| `auth.service.ts` | Login, registro, verificación, cierre de sesión y signal del token. |
| `token.ts` | Lee `exp` del JWT y decide si está vigente. |
| `auth.interceptor.ts` | Agrega el token al API propio, aplica timeout y maneja 401. |
| `auth.guard.ts` | `authGuard` e `invitadoGuard`. |
| `perfil.service.ts` | `GET /auth/yo`, signal del perfil y estado de error. |
| `distritos.service.ts` | `GET /distritos`. |
| `viabilidad.service.ts` | `GET /viabilidad/distritos/:id?cultivo=…`. |
| `clima.service.ts` | `GET /clima/distritos/:id` y `POST /clima/actualizar`. |
| `errores.ts` | `mensajesDeError()` y timeout HTTP. |

### Sesión

```
login() → POST /api/auth/login
        → guarda token en sessionStorage (agroalerta_token)
        → actualiza signal
        → navega a /dashboard

authInterceptor
        → si hay token y la URL es /api, agrega Authorization
        → timeout 15 s
        → si 401 con token (fuera de login/registro):
             cierra sesión, limpia perfil, navega a /login?sesion=expirada|invalida
```

- Un token sin `exp` o vencido no cuenta como sesión.
- `sessionStorage` sobrevive a F5 y se pierde al cerrar la pestaña.
- El token nunca se envía a orígenes externos.

---

## 4. Layout

### `AuthShell`

Panel de acceso para login y registro: lado visual con degradado, pestañas y proyección de contenido (`ng-content`). Mobile-first; a partir de 900 px muestra el panel lateral.

### `Shell`

Área protegida:

- Sidebar con navegación (`Dashboard`, `Clima Zonal`, y entradas futuras deshabilitadas).
- Header con nombre corto, iniciales, clima compacto del distrito y cierre de sesión.
- Carga el perfil una vez y el clima del distrito para el encabezado.
- Si `/auth/yo` falla, muestra un aviso con reintento.
- El menú móvil usa estado de componente (`menuAbierto`), no el “checkbox hack”.

---

## 5. Páginas

### `Login`

- Formulario de correo y contraseña.
- Muestra los `detalles` del 400 y traduce 401/403.
- Si llega `?sesion=expirada|invalida`, muestra el aviso correspondiente.
- Con sesión activa, `invitadoGuard` redirige al dashboard.

### `Registro`

- Campos: nombres, apellidos, correo, contraseña, DUI y distrito.
- El distrito se elige de un select alimentado por `GET /distritos`.
- Si el catálogo falla, muestra “No se pudieron cargar los distritos” con reintento.
- Envía el **nombre** del distrito, no el id.
- Con `EXPONER_TOKEN_VERIFICACION=true`, ofrece “simular verificación” y muestra el token de desarrollo.
- Maneja correo/DUI duplicados (409) y errores de validación (400).

### `Dashboard`

- Carga el perfil y el catálogo de distritos.
- Selector de cultivo (maíz, frijol, maicillo) con persistencia en `sessionStorage` (`agroalerta_cultivo`).
- Selector de distrito; por defecto, el del perfil.
- Consulta la viabilidad del distrito y cultivo, con `switchMap` para descartar respuestas viejas.
- Muestra KPI, capas, clases, clase dominante, área en ha/mz y porcentaje.
- El panel de estimación está vacío y rotulado como pendiente: **no muestra valores de ejemplo como reales**.
- Si `/auth/yo` falla, muestra un aviso con reintento.
- Navegación por teclado en el radiogroup de cultivos.

### `ClimaZonal`

- Carga el catálogo de distritos y consulta la condición de cada uno.
- Muestra condición (`Sequía`, `Exceso de lluvia`, `Invierno aceptable`, `Sin evaluar`), nivel de sequía, días secos, acumulado, normal, razón y fechas.
- Maneja carga y error por distrito, con reintento individual.
- `null` se muestra como “Sin evaluar”, no como error.

---

## 6. Estilos

- `styles.css` define variables CSS: colores, radios, sombras, espaciado y tipografía.
- Tokens de espaciado y colores semánticos de clima se agregaron en `feat/frontend-responsive-polish` (PR #49).
- Mobile-first: base móvil y `min-width` en 600, 900 y 1024 px.
- Fuente Plus Jakarta Sans e iconos Font Awesome por CDN.
- Campos de 44 px mínimo y 16 px de fuente para evitar zoom en iOS.
- Cada componente tiene su CSS propio; no se copian colores a mano.

---

## 7. Manejo de errores

`mensajesDeError()` convierte cualquier error en mensajes legibles:

- `TimeoutError` → “El servidor tardó demasiado…”.
- Cuerpo `{ error, detalles }` → usa los mensajes del backend.
- `status 0` → no se pudo conectar.
- `403` → permiso o correo sin verificar.
- `413` → solicitud demasiado grande.
- `429` → demasiadas solicitudes, con `Retry-After` si existe.
- `5xx` → el servidor no responde.
- Otro → `Error <código>.`

Los formularios muestran los mensajes en pantalla; no se usan `alert()`.

---

## 8. Pruebas

- Vitest vía `ng test`.
- 9 archivos y 30 casos: `app.spec.ts`, `auth.guard.spec.ts`, `auth.interceptor.spec.ts`, `auth.service.spec.ts`, `errores.spec.ts`, `perfil.service.spec.ts`, `token.spec.ts`, `hosts.spec.ts` y `puerto.spec.ts`.
- Se prueban servicios, guards, interceptor y utilidades; no hay E2E.
- No dependen de red ni de almacenamiento real.

---

## 9. Límites conocidos

- El token vive en `sessionStorage`: un XSS podría leerlo.
- El logout no revoca el token en el servidor.
- No hay refresh token.
- El SSR no se usa para datos.
- Faltan pruebas de componentes y E2E.
- `6-C` (Historial), `6-E` (estimación real) y la vista de Configuración siguen pendientes.
- La atribución de Open-Meteo debe mostrarse en la interfaz (pendiente).
