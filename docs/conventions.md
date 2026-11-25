# Convenciones de código

Reglas que ya usa el proyecto. No son preferencias personales: varias nacieron de bugs reales y están justificadas en `history/bugs-resueltos.md` o en `gotchas.md`.

---

## 1. Generales

- **Idioma:** español para nombres de dominio, mensajes al usuario, comentarios y documentación. Los términos técnicos universales se mantienen (`token`, `endpoint`, `request`, `middleware`).
- **TypeScript estricto:** no usar `any` si se puede modelar el tipo. El backend compila con `tsc --noEmit`; el frontend con la configuración de Angular 22.
- **Formato:** el repositorio no tiene un script de lint ni Prettier obligatorio. Se respeta el estilo del archivo que se edita: comillas dobles en backend, comillas simples en frontend, punto y coma donde ya existe.
- **Comentarios:** explican **por qué**, no **qué**. Un comentario que repite el código se borra.
- **Sin código muerto:** no dejar funciones “por si acaso”, imports sin usar ni ramas inalcanzables.
- **Sin secretos en el repositorio:** `.env` no se versiona; `.env.example` sí, con valores vacíos o de desarrollo.

---

## 2. Backend

### 2.1 Estructura

```
backend/src/
├── index.ts          composición de la app, montaje de routers y arranque
├── config/           entorno, puerto y cliente Prisma
├── comun/            utilidades compartidas (HTTP, normalización, salud, cierre, rate limit)
├── auth/             registro, login, perfil, JWT y middleware
├── viabilidad/       consulta de CENTA, catálogo de distritos y scripts de datos
├── clima/            Open-Meteo, normales, clasificación, orquestador, job y endpoint
├── events/           bus y contratos de eventos
├── siembra/          validación, servicio y endpoints de 4-D
└── estimacion/       estimación de costos de 4-C (referencia, función pura y pruebas)
```

- Un módulo expone su API pública en `index.ts` cuando otros módulos la consumen (`clima/index.ts`).
- Los routers se exportan con nombre (`export const climaRouter`) y se montan en `index.ts`.
- La lógica de negocio vive en servicios o funciones puras; las rutas solo validan, orquestan y responden.
- Los scripts de datos y de prueba se ejecutan con `ts-node-dev --transpile-only` y no se importan desde la app.

### 2.2 Respuestas HTTP

Contrato único de error:

```json
{ "error": "Datos inválidos", "detalles": ["correo inválido"] }
```

- `detalles` puede ser un string o un array de strings; el frontend acepta ambos.
- Éxito: el cuerpo que corresponda al recurso. No se envuelve todo en `{ success: true }` salvo `/auth/yo`, que ya lo hace por compatibilidad histórica.
- Códigos usados:

| Código | Uso |
|---|---|
| 200 | consulta o login correcto |
| 201 | registro creado |
| 204 | preflight CORS permitido |
| 400 | datos inválidos, JSON mal formado, parámetros incompatibles |
| 401 | falta token, token inválido o expirado, credenciales incorrectas |
| 403 | cuenta no verificada; origen CORS no permitido |
| 404 | recurso o ruta inexistente |
| 409 | correo o DUI ya registrados |
| 429 | límite de peticiones |
| 500 | error no controlado (nunca se devuelve `error.message` interno) |
| 502 / 503 | fallo de Open-Meteo / base de datos no disponible |

- Toda ruta nueva debe probar el caso feliz y cada código de error de su contrato.
- Los 500 se registran con `console.error` y se responde con un mensaje genérico.

### 2.3 Validación

- La validación de entrada vive en la ruta o en una función pura del módulo, no en el servicio de persistencia.
- Los ids numéricos se validan con una función explícita; no confiar en `Number(req.params.id)`.
  - Ejemplo: `validarIdDistrito` exige `/^\d+$/`, entero seguro y mayor que cero.
- Los textos tienen longitud máxima. Los correos se normalizan a minúsculas.
- El DUI se valida como 9 dígitos sin guiones; el dígito verificador todavía no se valida (pendiente).
- El distrito se valida contra el catálogo de la base, no contra una lista hardcodeada.
- Los nombres se comparan con `normalizarNombre` de `comun/normalizar.ts`: sin tildes, sin mayúsculas y con espacios colapsados. **No duplicar esa normalización.**

### 2.4 Prisma

- El cliente se importa siempre desde `config/prisma.ts`; no se crea un `PrismaClient` nuevo en cada módulo.
- El generator usa `moduleFormat = "cjs"` e `importFileExtension = ""`. **No quitar esa línea** (ver `gotchas.md`).
- Las migraciones se generan con `npx prisma migrate dev` desde `backend/`, se revisan y se versionan.
- No se corre `npx prisma format` sobre un archivo compartido si va a reordenar bloques ajenos: ensucia el diff.
- Para sumar áreas `Decimal`, se convierte a milésimas de hectárea (enteros) y se redondea al final. No se suman `number` flotantes de áreas.
- Los montos de la estimación de costos se calculan en centavos enteros y se redondean hacia arriba; no se suman dólares flotantes.
- Las consultas que devuelven datos al cliente seleccionan campos explícitos; nunca se devuelve `contrasenaHash`, `duiHash` ni tokens internos.
- Los scripts de carga son idempotentes y transaccionales.

### 2.5 Autenticación

- Contraseña: Argon2id (`argon2`), nunca texto plano ni hash reversible.
- DUI: HMAC-SHA256 con `DUI_PEPPER`. No es una contraseña; no se usa Argon2 para el DUI (ver `adr/1-A.md`).
- Sesión: JWT HS256 firmado con `JWT_SECRET` (mínimo 32 caracteres), expiración `JWT_EXPIRES_IN` (por defecto `2h`).
- El middleware `requireAuth` extrae `Authorization: Bearer <token>` y deja `req.usuario`.
- El login valida la contraseña **antes** de responder 403 por cuenta no verificada, para no revelar si un correo existe.
- El login usa un hash ficticio cuando el correo no existe, para igualar tiempos.
- No se registra el token ni datos personales en logs.

### 2.6 Eventos

- El bus es una instancia única de `EventEmitter` en `events/bus.ts`.
- Los nombres y payloads viven en `events/types.ts`; una sola persona los edita y solo agrega.
- Se emite con `emitirSeguro(evento, payload)`, que captura el error de un listener y no aborta el trabajo del emisor.
- Se emite **después** de persistir, para que el listener lea el estado nuevo.
- Un evento no se emite si no hay dato válido que publicar (por ejemplo, precipitación `null`).
- Los listeners no deben lanzar; si lo hacen, `emitirSeguro` lo registra y continúa.

### 2.7 Configuración y arranque

- `validarEntorno` falla al arrancar si faltan `JWT_SECRET` o `DUI_PEPPER`; no se espera al primer login.
- `PORT` se interpreta como puerto TCP, no como cadena.
- Los errores de `listen` se manejan en el evento `error` del servidor (puerto ocupado incluido).
- El cierre ordenado (`SIGTERM`/`SIGINT`) detiene el job, cierra el servidor y desconecta Prisma.
- CORS es opt-in por `CORS_ORIGINS`; sin variable, no se agregan cabeceras.
- El límite de peticiones es en memoria y por proceso. No se presenta como solución distribuida.

### 2.8 Pruebas

- Archivos `*.pruebas.ts` o `*.prueba.ts`, ejecutados con `ts-node-dev --transpile-only`.
- Sin dependencias de red ni de MySQL: se usan funciones puras y dobles de prueba.
- Cada prueba imprime el caso y falla con un mensaje claro; el conjunto termina con código distinto de cero si algo falla.
- Se agrega una prueba por cada regla de negocio nueva: clasificación, validación, mapeo de errores, cálculo de áreas.

---

## 3. Frontend

### 3.1 Estructura

```
frontend/src/app/
├── app.ts / app.html / app.css       componente raíz
├── app.config.ts                     providers globales
├── app.routes.ts                     rutas
├── app.routes.server.ts              RenderMode.Client en "**"
├── core/                             servicios, modelos, guards, interceptor, utilidades
├── layout/                           auth-shell y shell
└── pages/                            login, registro, dashboard, clima-zonal, siembra
```

- Componentes **standalone**; no se usan `NgModule`.
- Los archivos nuevos se generan con Angular CLI y se renombran si hace falta, manteniendo el sufijo `.ts`, `.html` y `.css`.
- Un servicio por recurso (`AuthService`, `PerfilService`, `DistritosService`, `ViabilidadService`, `ClimaService`).
- Los modelos de contrato viven en `core/models.ts` o junto al servicio que los usa (`clima.service.ts`).

### 3.2 Estado y reactividad

- Se usan **signals** para el estado de componente y `computed` para los valores derivados.
- Se inyecta con `inject()` en el cuerpo de la clase o en funciones de guard/interceptor.
- Para flujos asíncronos se usa RxJS con `switchMap`, `catchError`, `filter`, `takeUntilDestroyed`.
- **`takeUntilDestroyed()` debe recibir un `DestroyRef` inyectado** cuando se llama fuera del constructor. Llamarlo sin argumento en un método produce `NG0203` (ver `gotchas.md`).
- No se guarda estado de negocio en el componente si lo necesita otra vista: va en un servicio con signal.

### 3.3 Sesión y HTTP

- `API_URL = '/api'`; en desarrollo el proxy reenvía a `http://localhost:3000`.
- El token se guarda en `sessionStorage` bajo `agroalerta_token`.
- El interceptor agrega `Authorization: Bearer <token>` **solo** a peticiones del API propio (`/api` o `/api/...`), nunca a orígenes externos ni a recursos estáticos.
- Ante un 401 con token (fuera de login/registro): se cierra la sesión, se limpia el perfil y se navega a `/login?sesion=expirada|invalida`.
- El interceptor aplica un timeout de 15 s a todas las peticiones.
- `authGuard` protege el área con layout; `invitadoGuard` impide entrar a login/registro con sesión activa.
- Un token vencido no cuenta como sesión: se lee `exp` del JWT sin verificarlo (la firma la valida el backend).
- Los errores se traducen con `mensajesDeError()`; no se muestran códigos crudos al usuario.

### 3.4 Rutas

- `/login` y `/registro` usan `invitadoGuard`.
- El área protegida es un componente `Shell` con `authGuard` y rutas hijas (`/dashboard`, `/clima-zonal`).
- `''` redirige a `/dashboard`; `**` redirige a `''`.
- Todas las rutas usan `RenderMode.Client` en `app.routes.server.ts`; el SSR no ejecuta lógica de sesión.
- Los componentes de página se cargan con `loadComponent` (lazy).

### 3.5 Estilos y accesibilidad

- Mobile-first: el CSS base es de móvil y se amplía con `min-width` (600, 900, 1024 px).
- Se usan las variables CSS de `styles.css` (colores, radios, sombras, espaciado, fuente). No se copian colores a mano.
- Tipografía: Plus Jakarta Sans; iconos: Font Awesome por CDN.
- Campos de formulario de al menos 44 px de alto y 16 px de fuente para evitar el zoom automático en iOS.
- Todo control interactivo tiene etiqueta accesible, foco visible y estado `aria-*` cuando corresponde.
- El menú lateral usa estado de componente, no el “checkbox hack” de los HTML base.
- Los mensajes de error se muestran en el formulario, no solo en consola.
- No se muestran valores de ejemplo como si fueran datos reales: el panel de estimación se rotula como ejemplo hasta la Parte 5.

### 3.6 Pruebas

- Vitest vía `ng test`.
- Se prueban servicios, guards, interceptor y utilidades; los componentes tienen pruebas básicas de creación.
- Las pruebas no dependen de red ni de `sessionStorage` real: se usan dobles y `localStorage`/`sessionStorage` simulados cuando hace falta.

---

## 4. Datos

### 4.1 Archivos de CENTA

- `backend/data/centa/raw/` contiene los exports originales. **No se abren ni se guardan en Excel**: Excel cambia comas, tildes y comillas.
- `backend/data/centa/clean/` se genera con `npm run datos:limpiar`; no se edita a mano.
- Los CSV limpios se versionan. Si cambian, se revisa el diff contra los controles numéricos.
- `backend/data/referencia/` contiene coordenadas y normales de lluvia; también se versiona.

### 4.2 Carga

- `npm run datos:cargar` es idempotente (upsert) y transaccional.
- Debe terminar con: 2 municipios, 26 distritos, 4 capas, 12 clases de capa y 312 áreas.
- Si se actualizan los exports, primero `datos:limpiar` y después `datos:cargar`.
- No se cargan datos de prueba en la base de desarrollo sin avisar: otros integrantes la comparten.

### 4.3 Migraciones

- Nombre descriptivo: `add_usuarios`, `add_verificacion_correo`, `add_viabilidad`, `add_coordenadas_distrito`, `add_condicion_distrito`.
- Una migración por cambio lógico; no mezclar tablas de partes distintas.
- Se revisa el SQL generado antes de aplicarlo.
- Si la migración no es compatible con datos existentes, se documenta el reinicio de la base en `gotchas.md`.

---

## 5. Documentación

- Un archivo `.md` por tema, no un documento gigante.
- Los enlaces internos son relativos y deben funcionar desde el archivo que los contiene.
- Los ejemplos de código son reales o marcados como ilustrativos.
- Los estados se escriben en presente: “el endpoint devuelve”, no “devolverá”.
- Lo que falta se marca como pendiente, no se omite.
- Los `.md` son la fuente viva; si hay contradicción con el código, prevalece el código y se anota en el `.md` correspondiente.
- Los contratos de `data/` no se editan sin acuerdo del equipo.

---

## 6. Git

- Commits en imperativo y con alcance: `fix(clima): …`.
- No mezclar en un commit cambios de formato con cambios de lógica.
- No commitear `.env`, `node_modules/`, `dist/`, `.angular/`, `backend/src/generated/` ni archivos de editor.
- No commitear los CSV crudos si solo cambió el fin de línea. Se descartan con `git restore`.
- Antes de abrir el PR: `git status`, `git diff main --stat` y revisar que solo aparezcan los archivos de la tarea.
