# Historia — Parte 6: frontend

- **Periodo:** 31 de octubre a 14 de noviembre de 2026
- **Fuente:** `docs/Estado_Proyecto_Pt2.txt`, sección «Parte 6», y `git log` de `main`
- **Estado:** 6-0, 6-A, 6-B (Hito 1), 6-C, 6-D y 6-E ✅; Configuración ⏳

## Resumen

| Punto | Rama | Resultado |
|---|---|---|
| 6-0 | `feat/6-0-base-angular` | Estructura, rutas, estilos y vistas vacías |
| 6-A backend | `feat/6-a-endpoint-distritos` | `GET /distritos` público |
| 6-A frontend | `feat/6-a-auth-login-registro` | Login y registro conectados |
| 6-A fix | `fix/6-a-styles-duplicado` | Bloque CSS duplicado eliminado |
| 6-B | `feat/6-b-layout-dashboard` | Shell con perfil y dashboard con viabilidad real |
| 6-D | `feat/hito2-clima-zonal` (PR #48) | Vista Clima Zonal y clima en el encabezado |
| 6-E | `feat/6-e-dashboard-estimacion` | PR #62 | Estimación real en el dashboard |
| 6-C | `feat/6-c-historial` | Historial de siembras y estimaciones |
| Pulido | `feat/frontend-responsive-polish` (PR #49) | Tokens de espaciado y colores semánticos |
| Fix | `fix/ng0203-takeuntil-destroyed` (PR #50) | `DestroyRef` en `takeUntilDestroyed` |

---

## 6-0 — Base de Angular

**Rama:** `feat/6-0-base-angular` · **Responsable:** Yona · **31 de octubre de 2026**

El proyecto era el generado por Angular CLI (22.1.8), con el placeholder de bienvenida y sin rutas. Esta rama hizo la base que toca los archivos compartidos, para mergearla primero y rápido.

- `app.html` queda con `<router-outlet />`; se elimina el placeholder y la señal `title`.
- `index.html`: idioma `es`, título, viewport, fuente Plus Jakarta Sans e iconos Font Awesome por CDN.
- `styles.css`: variables CSS de los HTML base, reset y estilos de formulario compartidos; campos de 44 px y 16 px de fuente para evitar el zoom en iOS.
- `app.routes.ts`: `/login`, `/registro`, área con `Shell` y `/dashboard`; `''` → `/dashboard` y `**` → `''`. Sin guard.
- Componentes `AuthShell`, `Shell`, `Login`, `Registro` y `Dashboard`, con formularios que solo hacían `preventDefault`.
- `Shell` con sidebar y menú móvil por estado de componente (no el «checkbox hack»), e historial/clima/configuración deshabilitados.

**Cambio respecto al mapa:** el servicio de autenticación, el interceptor, el guard, la URL del API y los modelos se aplazaron a 6-A. El criterio era conectar con el backend solo cuando existiera una pantalla que lo usara.

**Decisiones de diseño:** los HTML base son solo referencia visual, no responsive; el CSS es mobile-first con `min-width` en 600, 900 y 1024 px. Se quitó la foto de Unsplash del login para no depender de un recurso externo pesado.

---

## 6-A — Login y registro conectados

### Backend: catálogo público

**Rama:** `feat/6-a-endpoint-distritos` · **Responsable:** Yona · **31 de octubre de 2026**

- `GET /distritos` **público** (el registro ocurre antes del login), ordenado por `nombreNormalizado`, con `SELECT_DISTRITO`.
- Cierra el pendiente C1 del Mapa v2.
- 500 sin `error.message`.

### Frontend: autenticación

**Rama:** `feat/6-a-auth-login-registro` · **Responsable:** Yona · **31 de octubre de 2026**

- `core/api.config.ts` con `API_URL = '/api'`.
- `proxy.conf.json`: `/api` → `http://localhost:3000` quitando el prefijo. Solo desarrollo.
- `core/models.ts`: contratos del backend.
- `core/auth.service.ts`: token en un signal persistido en **`sessionStorage`** (`agroalerta_token`), con `try/catch`.
- `core/auth.interceptor.ts`: agrega `Authorization` solo al API propio; ante 401 cierra sesión y navega a `/login?sesion=expirada|invalida`.
- `core/auth.guard.ts`: `authGuard` para el área protegida.
- `core/errores.ts`: `mensajesDeError()`.
- `core/distritos.service.ts`: `GET /distritos`.
- `app.config.ts`: `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))`.
- `app.routes.server.ts`: `RenderMode.Client` en `"**"` (todas las rutas).
- Login y registro con formularios reactivos; el registro usa un **select** de distritos con reintento y envía el **nombre**, no el id. Tras crear la cuenta ofrece «Simular verificación» si el backend devolvió `tokenVerificacion_DEV`.

**Decisiones:** `sessionStorage` sobrevive a F5 y se pierde al cerrar la pestaña; un XSS podría leerlo, pero el acceso está aislado en `AuthService`. Se eligió proxy en lugar de CORS para desarrollo. `RenderMode.Client` en todo porque `/registro` consulta el API al cargarse.

**Incidencias:** `AbortError` del optimizador de Vite en la primera visita (no se repite) y el bloque «Formularios compartidos» duplicado en `styles.css`, corregido en `fix/6-a-styles-duplicado`.

---

## 6-B — Layout y dashboard con viabilidad real

**Rama:** `feat/6-b-layout-dashboard` · **Responsable:** Yona · **1 de noviembre de 2026**

La rama más grande del Hito 1, con un commit por paso.

- `core/viabilidad.service.ts` y `core/perfil.service.ts`; modelos de cultivo y viabilidad.
- `Shell` carga el perfil (`GET /auth/yo`), lo que **valida el token al entrar**; muestra nombre corto, iniciales y cierre de sesión. Si el perfil falla, muestra aviso y avatar genérico.
- `Dashboard`:
  - KPI de distrito, municipio y fuente con fecha de extracción.
  - Selector de cultivo con memoria en `sessionStorage` (`agroalerta_cultivo`).
  - Dos tarjetas por cultivo (potencial y riesgo) con clase dominante, barra apilada y leyenda con porcentaje y manzanas.
  - Estados de carga y error con reintento.
  - Nota fija: la referencia es distrital, no de la parcela.
  - Selector para consultar otro distrito, solo en memoria.
  - Panel de estimación **vacío**, sin cifras de ejemplo.

**Decisiones:** vista por cultivo en lugar de las cuatro capas apiladas; barra con CSS en lugar de una librería de gráficos; color por tipo de capa (potencial mayor = verde, riesgo mayor = rojo); porcentajes y manzanas se muestran tal como llegan del servidor.

**Pruebas:** cierre de sesión, token alterado, `JWT_EXPIRES_IN=5s`, backend caído, cambio de cultivo con F5, distrito sin clases, 375/900 px y respuestas rápidas sin que una vieja pise a la nueva.

---

## 6-D — Clima Zonal y encabezado

**Rama:** `feat/hito2-clima-zonal` · **PR #48** · **noviembre de 2026**

Aunque `Estado_Proyecto_Pt2.txt` lo dejaba pendiente, **6-D está implementado en `main`**.

Commits:

- `76f7929` — `ClimaService` para `GET /clima/distritos/:id`.
- `fc8c935` — vista `/clima-zonal` con lista de distritos y condiciones.
- `5bb2d66` — ruta `/clima-zonal` en el área protegida.
- `c1f0673` — encabezado compacto con datos meteorológicos y Clima Zonal habilitado en la navegación.

La vista muestra condición, nivel de sequía, días secos, acumulado, normal, razón y fechas; `null` se presenta como «Sin evaluar», no como error. El encabezado del `Shell` consulta el clima del distrito del usuario.

**Pendiente dentro de 6-D:** la vista de **Configuración** sigue sin existir.

---

## 6-E — Estimación real en el dashboard

**Rama:** `feat/6-e-dashboard-estimacion` · **Responsable:** Yona · **25 de noviembre de 2026** · PR #62

**Qué se hizo:**

- `core/estimacion.service.ts`: `GET /estimaciones` y mapa del contrato.
- `core/models.ts`: tipos `Estimacion`, `NivelRiesgo`, `SupuestoEstimacion`, `ViabilidadReferencia` y `CULTIVO_A_ENUM`.
- `Dashboard`: carga el historial una vez, filtra la **última estimación del cultivo y distrito seleccionados** y la muestra en el panel.
- El panel muestra semáforo, título/mensaje, producción, ingreso, rendimiento, precio, clima, motivos, referencia CENTA y fecha de cálculo.
- Si no hay estimación, estado vacío con enlace a `/siembra`. Si falla la carga, error con reintento.
- No se usa ninguna cifra de `dashboard_base.html` como dato real.
- Pruebas: `estimacion.service.spec.ts` (1 caso).

**Decisión MVP:** el dashboard no recalcula; lee el reporte persistido por 5-D. La estimación se crea por el listener cuando se registra una siembra o cambia el clima; si aún no existe, el estado vacío lo explica.

**Verificación:** `npm run typecheck`, `npm test` (10 archivos, 31 casos) y `npm run build` en verde. El build mantiene los avisos de presupuesto de CSS de shell y clima-zonal; el dashboard también supera el presupuesto de 4 kB por 733 bytes.

---

## 6-C — Historial de evaluaciones

**Rama:** `feat/6-c-historial` · **Responsable:** Yona · **25 de noviembre de 2026** · PR por abrir

**Qué se hizo:**

- `core/historial.service.ts`: combina `GET /siembras` y `GET /estimaciones`; la primera estimación de cada siembra es la más reciente.
- `SiembraService.listar()` y tipos `Siembra`, `RespuestaSiembras` e `ItemHistorial`.
- Vista `/historial` con una tarjeta por siembra:
  - cultivo, distrito, área, fecha, estado e inversión declarada;
  - última estimación con semáforo, producción, ingreso, rendimiento, precio, clima y motivos;
  - aviso cuando la siembra todavía no tiene estimación.
- Estados de carga, error con reintento y vacío con enlace a `/siembra`. Sin datos de ejemplo.
- Enlace «Historial» habilitado en el sidebar.
- Pruebas: `historial.service.spec.ts` (2 casos).

**Decisión MVP:** el historial no recalcula; lee los reportes persistidos y muestra la última estimación de cada siembra. No hay paginación ni detalle por estimación individual.

**Verificación:** `npm run typecheck`, `npm test` (11 archivos, 33 casos) y `npm run build` en verde.

---

## Pulido responsive

**Rama:** `feat/frontend-responsive-polish` · **PR #49**

- `3dfcf3b` — escala de espaciado y colores semánticos de clima en `styles.css`.
- `2bea6e0`, `c08ff2a`, `f0059a2`, `26796e9` — tokens aplicados en dashboard, clima-zonal, shell, auth-shell y registro.

Es un cambio solo de estilos: no altera comportamiento ni contratos.

---

## Corrección NG0203

**Rama:** `fix/ng0203-takeuntil-destroyed` · **PR #50**

- `a8f4c38` — `DestroyRef` en `ClimaZonal` y `Shell`.
- `6eb928b` — `DestroyRef` en `Dashboard.cargarDistritos` y `recargarPerfil`.
- `f3069a6` — `DestroyRef` en `Login.enviar` y en `Registro.cargarDistritos/enviar/simularVerificacion`.

**Causa:** `takeUntilDestroyed()` se llamaba dentro de un método, fuera del contexto de inyección. En Angular 22 eso lanza `NG0203`. La regla quedó en [`gotchas.md`](../../gotchas.md) y en [`conventions.md`](../../conventions.md).

---

## Estado al 25 de noviembre de 2026

- Seis vistas: login, registro, dashboard, clima zonal, formulario de siembra e historial.
- Sesión con `sessionStorage`, interceptor, guards, timeout y mensajes de error.
- Viabilidad, clima y estimación reales en el dashboard.
- 11 archivos de pruebas y 33 casos.
- Sin pruebas de componentes ni E2E; sin favicon propio; sin atribución visible de Open-Meteo ni GeoNames.
- Pendientes: Configuración.
