# AgroAlerta Morazán

Plataforma web orientada a eventos (EDA) para prevención de riesgos agrícolas en el departamento de Morazán, El Salvador. Combina la viabilidad de cultivo por distrito (referencia CENTA), el clima (Open-Meteo, pendiente) y los datos de siembra del agricultor para estimar rendimiento, riesgo y recomendaciones.
Avance actual: autenticación, catálogo y viabilidad de cultivo en el backend, y login, registro y dashboard en el frontend (Hito 1). El detalle está en `docs/`.

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

## Después de cada `git pull`

Según lo que haya cambiado:

- `backend/package.json`: `npm install` dentro de `backend/`.
- `frontend/package.json`: `npm install` dentro de `frontend/`.
- `backend/prisma/schema.prisma` o `backend/prisma/migrations/`: `npx prisma generate` y `npx prisma migrate dev` dentro de `backend/`. Si tu base tiene usuarios anteriores al 30 de octubre, la migración de `distrito_id` falla: desde la raíz, `docker compose down -v` y `docker compose up -d db`, y repite los pasos 6 a 8.
- `backend/data/centa/clean/`: `npm run datos:cargar` dentro de `backend/`.
- `backend/.env.example`: revisa si hay variables nuevas y agrégalas a tu `.env`.

## Verificación

```bash
curl http://localhost:3000/health      # {"status":"ok"}
curl http://localhost:3000/distritos   # los 26 distritos de Morazán
```

Abre `http://localhost:4200`: debe aparecer el inicio de sesión. Flujo de prueba: Registrarse, pulsar "Simular verificación de correo" (solo con `EXPONER_TOKEN_VERIFICACION=true` en el `.env`, que es el valor de la plantilla), Iniciar sesión y ver el dashboard con la viabilidad de CENTA de tu distrito.

Endpoints: `GET /health`, `GET /distritos` (público), `POST /auth/registro`, `GET /auth/verificar/:token`, `POST /auth/reenviar-verificacion`, `POST /auth/login`, `GET /auth/yo` y `GET /viabilidad/distritos/:id` (estos dos con `Authorization: Bearer <token>`; la viabilidad acepta `?capa=` o `?cultivo=`). Los errores siguen el formato `{ "error": string, "detalles"?: string | string[] }`.

## Estructura del proyecto

```
agroalerta-sv/
├── docker-compose.yml        MySQL de desarrollo
├── docker/mysql-init/        privilegios para la shadow database de Prisma
├── docs/                     documentación del proyecto
├── backend/
│   ├── prisma/               schema y migraciones
│   ├── data/centa/           exports crudos (raw/) y CSV limpios (clean/)
│   ├── .env.example          plantilla de variables de entorno
│   └── src/
│       ├── auth/             registro, verificación, login, perfil
│       ├── viabilidad/       servicio, endpoints y carga de datos CENTA
│       ├── comun/            utilidades compartidas
│       ├── events/           bus de eventos
│       ├── config/           cliente Prisma
│       └── clima/ siembra/ estimacion/   (vacíos, partes futuras)
└── frontend/
    ├── proxy.conf.json       /api -> backend (desarrollo)
    └── src/app/
        ├── core/             servicios, interceptor, guard y modelos
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