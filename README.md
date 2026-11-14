# AgroAlerta Morazán

Plataforma web orientada a eventos (EDA) para prevención de riesgos agrícolas en el departamento de Morazán, El Salvador. Combina la viabilidad de cultivo por distrito (referencia CENTA), la condición climática por distrito (Open-Meteo) y los datos de siembra del agricultor para estimar rendimiento, riesgo y recomendaciones.
Avance actual: autenticación, catálogo, viabilidad de cultivo y clima por distrito en el backend; login, registro y dashboard en el frontend. La siembra y la estimación real siguen en partes futuras. El detalle está en `docs/`.

## Stack

- TypeScript
- Node.js + Express (backend, EventEmitter nativo)
- Angular 22 (frontend)
- MySQL 8.4 en Docker
- Prisma 7.10.0 (con `@prisma/adapter-mariadb`; no actualizar sin avisar)

## Requisitos

- Node.js 22.x. El frontend exige 22.22.3 o superior; el backend funciona desde 20.19
- Docker y Docker Compose
- Git, con acceso al repositorio (privado)

## Instalación

Los comandos de `docker compose` se corren desde la raíz del repo; los de `npm` y `npx`, dentro de `backend/` o `frontend/`.

```bash
# 1. Clonar el repositorio
git clone https://github.com/YonaZakkart/agroalerta-sv.git
cd agroalerta-sv

# 2. Levantar MySQL (desde la raíz; el puerto 3306 debe estar libre)
docker compose up -d db

# 3. Backend: instalar dependencias
cd backend
npm install

# 4. Backend: crear .env desde la plantilla (en Windows cmd: copy .env.example .env)
cp .env.example .env

# 5. Generar los dos secretos obligatorios; corre el comando dos veces y pega uno en
#    DUI_PEPPER y otro en JWT_SECRET (mínimo 32 caracteres) dentro de backend/.env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 6. Generar el cliente de Prisma
npx prisma generate

# 7. Crear las tablas en la base de datos
npx prisma migrate dev

# 8. Cargar los datos de viabilidad (debe terminar con: municipios 2, distritos 26, capas 4, clases_capa 12, areas_clase 312)
npm run datos:cargar

# 9. Arrancar el backend (queda en el puerto 3000)
npm run dev

# 10. Frontend, en otra terminal desde la raíz del repo: instalar y arrancar (puerto 4200)
cd frontend
npm install
npx ng serve
```

El frontend llama al backend por `/api`; `frontend/proxy.conf.json` lo reenvía a `localhost:3000` (solo desarrollo).

## Variables de entorno

El backend lee `backend/.env` (plantilla en `backend/.env.example`). El arranque falla con un mensaje claro si `JWT_SECRET` o `DUI_PEPPER` faltan o miden menos de 32 caracteres, o si `JWT_EXPIRES_IN` no es una duración válida (`7200`, `2h`, `7d`...). `EXPONER_TOKEN_VERIFICACION=true` solo vale en desarrollo: con `NODE_ENV=production` el backend no arranca si está activo.

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión MySQL que usan Prisma y el backend. |
| `JWT_SECRET` | Sí | Firma de los tokens de sesión (mínimo 32 caracteres). |
| `DUI_PEPPER` | Sí | Pepper del hash del DUI (mínimo 32 caracteres). No rotarlo: invalida la detección de duplicados. |
| `JWT_EXPIRES_IN` | No | Duración del token; por defecto `2h`. |
| `EXPONER_TOKEN_VERIFICACION` | No | Solo desarrollo: devuelve el token de verificación en la respuesta (todavía no hay envío real de correo). |
| `CORS_ORIGINS` | No | Orígenes permitidos separados por comas. Vacío = sin CORS; el frontend de desarrollo usa el proxy `/api` y no lo necesita. |
| `CLIMA_JOB_INTERVALO_MS` | No | Intervalo del job de clima en milisegundos; mínimo una hora (`3600000`). |
| `PORT` | No | Puerto del backend; por defecto `3000`. |

El servidor SSR del frontend (`npm run serve:ssr:frontend`, tras `npm run build`) acepta por defecto solo `localhost`, `127.0.0.1` y `[::1]`. En un despliegue real hay que definir `NG_ALLOWED_HOSTS` con los dominios separados por comas y `PORT` si no se usa el `4000` por defecto.

## Comprobaciones

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

Según lo que haya cambiado:

- `backend/package.json`: `npm install` dentro de `backend/`.
- `frontend/package.json`: `npm install` dentro de `frontend/`.
- `backend/prisma/schema.prisma` o `backend/prisma/migrations/`: `npx prisma generate` y `npx prisma migrate dev` dentro de `backend/`. Si tu base tiene usuarios anteriores al 30 de octubre, la migración de `distrito_id` falla: desde la raíz, `docker compose down -v` y `docker compose up -d db`, y repite los pasos 6 a 8.
- `backend/data/centa/clean/`: `npm run datos:cargar` dentro de `backend/`.
- `backend/.env.example`: revisa si hay variables nuevas y agrégalas a tu `.env`.

## Verificación

```bash
curl http://localhost:3000/health      # {"status":"ok","baseDatos":"ok"} (503 si MySQL no responde)
curl http://localhost:3000/health/live # {"status":"ok"} (solo confirma que el proceso responde)
curl http://localhost:3000/distritos   # los 26 distritos de Morazán
```

Abre `http://localhost:4200`: debe aparecer el inicio de sesión. Flujo de prueba: Registrarse, pulsar "Simular verificación de correo" (solo con `EXPONER_TOKEN_VERIFICACION=true` en el `.env`, que es el valor de la plantilla), Iniciar sesión y ver el dashboard con la viabilidad de CENTA de tu distrito.

Endpoints: `GET /health` y `GET /health/live` (públicos), `GET /distritos` (público), `POST /auth/registro`, `GET /auth/verificar/:token`, `POST /auth/reenviar-verificacion`, `POST /auth/login`, `GET /auth/yo`, `GET /viabilidad/distritos/:id`, `GET /clima/distritos/:id` y `POST /clima/actualizar`. Los cuatro últimos exigen `Authorization: Bearer <token>`; la viabilidad acepta `?capa=` o `?cultivo=` y la actualización de clima acepta `{ "distritoIds"?: number[] }` (sin cuerpo actualiza todos los distritos). Los errores siguen el formato `{ "error": string, "detalles"?: string | string[] }`; los 429 incluyen `Retry-After`.

## Estructura del proyecto

```
agroalerta-sv/
├── docker-compose.yml        MySQL de desarrollo
├── docker/mysql-init/        privilegios para la shadow database de Prisma
├── docs/                     documentación del proyecto
├── .github/                  plantilla de Pull Request y CI de GitHub Actions
├── backend/
│   ├── prisma/               schema y migraciones
│   ├── prisma7.config.ts     configuración del CLI de Prisma
│   ├── data/centa/           exports crudos (raw/) y CSV limpios (clean/)
│   ├── data/referencia/      coordenadas por distrito y normales de lluvia
│   ├── .env.example          plantilla de variables de entorno
│   └── src/
│       ├── auth/             registro, verificación, login, perfil y JWT
│       ├── viabilidad/       servicio, endpoints y carga de datos CENTA
│       ├── clima/            Open-Meteo, normales, clasificación, job y endpoints
│       ├── comun/            normalización, errores HTTP, seguridad y salud
│       ├── events/           bus de eventos
│       ├── config/           cliente Prisma, puerto y validación de entorno
│       └── siembra/, estimacion/   (vacíos, Partes 4 y 5)
└── frontend/
    ├── proxy.conf.json       /api -> backend (desarrollo)
    └── src/app/
        ├── core/             servicios, interceptor, guards, errores y modelos
        ├── layout/           shell y panel de acceso
        └── pages/            login, registro y dashboard
```

## Documentación y flujo de trabajo

La carpeta `docs/` es la fuente de verdad: `Estado_del_Proyecto.txt` (historial hasta la Parte 2), `Estado_Proyecto_Pt2.txt` (desde la Parte 6 y el Mapa v2), `Mapa_v2.txt` (mapa vigente), `Mapa_inicial.txt`, `Propuesta_Inicial.txt` e `Info_Datos_CENTA.md`. 
Léelos antes de tocar código. Se trabaja siempre en una rama por parte y punto (`feat/`, `fix/`, `chore/` o `docs/`), nunca directo en `main`, y se sube con Pull Request. Los archivos compartidos (`schema.prisma`, `migrations/`, `events/`, `config/prisma.ts`, `backend/src/index.ts` y los `package.json`, además de `app.routes.ts`, `app.config.ts`, `models.ts` y `styles.css` del frontend) requieren coordinación. 

## Problemas frecuentes

El resto está en la sección 7 de `docs/Estado_del_Proyecto.txt`.

- El backend o `prisma migrate` "funcionan" pero no ves las tablas en Docker: otro MySQL (por ejemplo un servicio de Windows) ocupa el puerto 3306. Detén ese servicio y vuelve a crear el contenedor (`docker compose down -v` y `docker compose up -d db`); `docker ps` debe mostrar `0.0.0.0:3306->3306/tcp`.
- `npm install` falla con `Cannot read properties of null (reading 'edgesOut')`: es un bug de npm. Usa `npm install --legacy-peer-deps`.
- `prisma migrate dev` falla con `P3014`: el contenedor es anterior al script de privilegios. Corre `docker compose down -v` y `docker compose up -d db` (borra los datos locales) y repite los pasos 7 y 8.
- El backend aborta al arrancar diciendo que falta `JWT_SECRET` o `DUI_PEPPER`: es a propósito. Complétalos en `backend/.env` (paso 5).