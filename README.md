<p align="center">
  <img src="frontend/public/logo-mark.svg" width="88" alt="AgroAlerta Morazán">
</p>

<h1 align="center">AgroAlerta Morazán</h1>

<p align="center">
  <a href="https://agroalerta-sv-beta.vercel.app"><img alt="Vercel" src="https://img.shields.io/badge/Vercel-Ver%20app-000?logo=vercel&logoColor=white"></a>
  <a href="https://agroalerta-api.onrender.com/health"><img alt="Render" src="https://img.shields.io/badge/Render-API-46E3B7?logo=render&logoColor=white"></a>
  <a href="https://console.neon.tech"><img alt="Neon" src="https://img.shields.io/badge/Neon-Postgres-00E599?logo=neon&logoColor=white"></a>
</p>

Plataforma web orientada a eventos (EDA) para prevención de riesgos agrícolas en el departamento de Morazán, El Salvador. Combina la viabilidad de cultivo por distrito (referencia CENTA), la condición climática por distrito (Open-Meteo) y los datos de siembra del agricultor para estimar rendimiento, riesgo y recomendaciones.
**v1.2 en `dev`.** v1.0 y v1.1 están desplegadas. Incluye autenticación, viabilidad CENTA, clima por distrito, siembra, estimación de costos, proyección, recomendaciones, reporte persistido, historial, modo oscuro y correo real (desactivado por configuración).

**Despliegue:** frontend en Vercel, backend en Render y Postgres en Neon. Detalle en [`docs/deployment.md`](docs/deployment.md). El resto de la documentación está en [`docs/INDEX.md`](docs/INDEX.md).

> Capturas de login, registro y dashboard pendientes de añadir; no hay imágenes en el repositorio todavía.

## Stack

- TypeScript
- Node.js + Express (backend, EventEmitter nativo)
- Angular 22 (frontend)
- Postgres en Neon (producción y desarrollo)
- Prisma 7.10.0 con `@prisma/adapter-pg`

## Requisitos

- Node.js 22.x. El frontend exige 22.22.3 o superior; el backend funciona desde 20.19
- Docker solo si se usa la base MySQL histórica; el flujo actual usa Neon
- Git, con acceso al repositorio (privado)

## Instalación

Los comandos de `docker compose` se corren desde la raíz del repo; los de `npm` y `npx`, dentro de `backend/` o `frontend/`. La guía ampliada del entorno está en [`docs/workflow.md`](docs/workflow.md), sección 5.

```bash
# 1. Clonar el repositorio (privado)
git clone git@github.com:YonaZakkart/agroalerta-sv.git
# Alternativa por HTTPS, con un token de acceso personal:
# git clone https://github.com/YonaZakkart/agroalerta-sv.git
cd agroalerta-sv

# 2. Backend: instalar dependencias
cd backend
npm install

# 3. Backend: crear .env desde la plantilla (en Windows cmd: copy .env.example .env)
cp .env.example .env
# Usa DATABASE_URL pooled de Neon y DATABASE_URL_UNPOOLED para migraciones.

# 4. Generar los dos secretos obligatorios; corre el comando dos veces y pega uno en
#    DUI_PEPPER y otro en JWT_SECRET (mínimo 32 caracteres) dentro de backend/.env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 5. Generar el cliente de Prisma
npx prisma generate

# 6. Crear las tablas en la base de datos
npx prisma migrate dev

# 7. Cargar los datos de viabilidad (debe terminar con: municipios 2, distritos 26, capas 4, clases_capa 12, areas_clase 312)
npm run datos:cargar

# 8. Arrancar el backend (queda en el puerto 3000)
npm run dev

# 9. Frontend, en otra terminal desde la raíz del repo: instalar y arrancar (puerto 4200)
cd frontend
npm install
npx ng serve
```

El frontend llama al backend por `/api`; `frontend/proxy.conf.json` lo reenvía a `localhost:3000` (solo desarrollo).

## Variables de entorno

El backend lee `backend/.env` (plantilla en `backend/.env.example`). El arranque falla con un mensaje claro si `JWT_SECRET` o `DUI_PEPPER` faltan o miden menos de 32 caracteres, o si `JWT_EXPIRES_IN` no es una duración válida (`7200`, `2h`, `7d`...). `EXPONER_TOKEN_VERIFICACION=true` solo vale en desarrollo: con `NODE_ENV=production` el backend no arranca si está activo.

Las obligatorias son:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión Postgres pooled de Neon. |
| `DATABASE_URL_UNPOOLED` | Conexión directa para `prisma migrate`. |
| `JWT_SECRET` | Firma de los tokens de sesión (mínimo 32 caracteres). |
| `DUI_PEPPER` | Pepper del hash del DUI (mínimo 32 caracteres). No rotarlo: invalida la detección de duplicados. |

La referencia completa, incluidas `JWT_EXPIRES_IN`, `EXPONER_TOKEN_VERIFICACION`, `CORS_ORIGINS`, `CLIMA_JOB_INTERVALO_MS` y `PORT`, está en [`docs/architecture/api.md`](docs/architecture/api.md), sección 7, y en `backend/.env.example`.

El servidor SSR del frontend (`npm run serve:ssr:frontend`, tras `npm run build`) acepta por defecto solo `localhost`, `127.0.0.1` y `[::1]`. En un despliegue real hay que definir `NG_ALLOWED_HOSTS` con los dominios separados por comas y `PORT` si no se usa el `4000` por defecto.

## Comprobaciones

El detalle de cada suite y de las pruebas manuales está en [`docs/workflow.md`](docs/workflow.md), sección 4.

```bash
# Backend
cd backend
npm run typecheck
npm test
npm run build

# Frontend (no hay script de lint; Angular 22 no lo incluye por defecto)
cd frontend
npm run typecheck
npx ng test --watch=false
npm run build
```

`npm test` del backend es offline: no usa red, base de datos ni `.env`. Las pruebas del frontend corren con Vitest y jsdom.

## Después de cada `git pull`

Trabaja sobre `main` actualizado y crea la rama del punto antes de tocar código (ver [`docs/workflow.md`](docs/workflow.md), sección 1):

```bash
git switch main
git pull --ff-only origin main
```

Según lo que haya cambiado:

- `backend/package.json`: `npm install` dentro de `backend/`.
- `frontend/package.json`: `npm install` dentro de `frontend/`.
- `backend/prisma/schema.prisma` o `backend/prisma/migrations/`: `npx prisma generate` y `npx prisma migrate dev` dentro de `backend/`. Si tu base tiene usuarios anteriores al 30 de octubre, la migración de `distrito_id` falla: desde la raíz, `docker compose down -v` y `docker compose up -d db`, y repite los pasos 6 a 8.
- `backend/data/centa/clean/`: `npm run datos:cargar` dentro de `backend/`.
- `backend/.env.example`: revisa si hay variables nuevas y agrégalas a tu `.env`.

Si algo falla, revisa [`docs/gotchas.md`](docs/gotchas.md) antes de depurar desde cero.

## Verificación

```bash
curl http://localhost:3000/health      # {"status":"ok","baseDatos":"ok"} (503 si Postgres no responde)
curl http://localhost:3000/health/live # {"status":"ok"} (solo confirma que el proceso responde)
curl http://localhost:3000/distritos   # los 26 distritos de Morazán
```

El contrato completo de la API —métodos, autenticación, cuerpos y errores— está en [`docs/architecture/api.md`](docs/architecture/api.md).

Abre `http://localhost:4200`: debe aparecer el inicio de sesión. Flujo de prueba: Registrarse, pulsar "Simular verificación de correo" (solo con `EXPONER_TOKEN_VERIFICACION=true` en el `.env`, que es el valor de la plantilla), Iniciar sesión y ver el dashboard con la viabilidad de CENTA de tu distrito.

## Estructura del proyecto

```text
agroalerta-sv/
├── docker-compose.yml        MySQL histórico (ya no se usa en producción)
├── docker/                   privilegios para la shadow database de Prisma
├── docs/                     documentación del proyecto
├── backend/                  API, Prisma, datos CENTA y pruebas
├── frontend/                 Angular 22
└── .github/                  plantilla de Pull Request y CI de GitHub Actions
```

El árbol detallado, archivo por archivo, está en [`docs/architecture/files.md`](docs/architecture/files.md).

## Documentación y flujo de trabajo

La carpeta `docs/` es la fuente de verdad; entra por [`docs/INDEX.md`](docs/INDEX.md).

| Documento | Contenido |
| --- | --- |
| [`docs/INDEX.md`](docs/INDEX.md) | Estado del proyecto, mapa de documentos y glosario. |
| [`docs/workflow.md`](docs/workflow.md) | Ramas, PR, pruebas, cierre de un punto y archivos compartidos. |
| [`docs/conventions.md`](docs/conventions.md) | Reglas de código, API, datos y frontend. |
| [`docs/gotchas.md`](docs/gotchas.md) | Trampas activas y problemas conocidos. |
| [`docs/architecture/`](docs/architecture/) | Cómo funciona hoy el backend, el frontend, la API, los datos y los archivos. |
| [`docs/tasks/`](docs/tasks/) | Qué sigue, pendientes y decisiones abiertas. |
| [`docs/history/`](docs/history/) | Qué se hizo y por qué. |
| [`docs/roadmap/`](docs/roadmap/) | Plan vigente e histórico. |

Se trabaja siempre en una rama por parte y punto (`feat/`, `fix/`, `chore/` o `docs/`), nunca directo en `main`, y se integra con Pull Request. El ciclo completo y la lista de archivos que requieren coordinación están en [`docs/workflow.md`](docs/workflow.md).

## Problemas frecuentes

El catálogo completo está en [`docs/gotchas.md`](docs/gotchas.md). Los más comunes al levantar el entorno:

- Si usas la base MySQL histórica, revisa que el puerto 3306 no esté ocupado por otro MySQL. El flujo actual usa Neon/Postgres.
- `npm install` falla con `Cannot read properties of null (reading 'edgesOut')`: es un bug de npm. Usa `npm install --legacy-peer-deps`.
- `prisma migrate dev` falla con `P3014`: el contenedor es anterior al script de privilegios. Corre `docker compose down -v` y `docker compose up -d db` (borra los datos locales) y repite los pasos 7 y 8.
- El backend aborta al arrancar diciendo que falta `JWT_SECRET` o `DUI_PEPPER`: es a propósito. Complétalos en `backend/.env` (paso 5).

## Despliegue

- **Frontend:** https://agroalerta-sv-beta.vercel.app
- **Backend:** https://agroalerta-api.onrender.com/health
- **Base de datos:** Neon Postgres, branch `production`
- **Documentación:** [`docs/deployment.md`](docs/deployment.md), [`docs/architecture/`](docs/architecture/) y [`docs/tasks/`](docs/tasks/).

- **Neon Postgres** (branch `production`): `DATABASE_URL` pooled y `DATABASE_URL_UNPOOLED` para migraciones.
- **Render** (backend): root `backend`, build `npm ci --legacy-peer-deps && npx prisma generate && npm run build`, start `npm start`, health `/health`.
- **Vercel** (frontend): root `frontend`, build `npm run build`, output `dist/frontend/browser`; `vercel.json` redirige `/api` a Render.
- Detalle y variables: [`docs/deployment.md`](docs/deployment.md).
