# AgroAlerta-SV

Sistema web de prevención de riesgos agrícolas para el departamento de Morazán, El Salvador. Arquitectura orientada a eventos (EDA): combina viabilidad de cultivo por zona (CENTA), clima (Open-Meteo) e inversión del agricultor para generar proyecciones de cosecha, riesgo y recomendaciones.

La documentación de avance y decisiones vive en [`docs/`](docs/): `Propuesta_Inicial.txt`, `Mapa_inicial.txt` y `Estado_del_Proyecto.txt` (fuente de verdad del avance; léelo antes de tocar código).

## Stack

- Backend: Node.js + TypeScript + Express + EventEmitter nativo
- Frontend: Angular
- Base de datos: MySQL 8.4 (Docker) + Prisma 7.10.0
- Autenticación: argon2id (contraseña) + HMAC-SHA256 (DUI)
- Clima: Open-Meteo API

## Requisitos

- Git y acceso al repositorio (privado; el owner debe haberte agregado como colaborador)
- Node.js 22.x (mínimo 20.19.0, requerido por Prisma 7)
- npm actualizado (ver Troubleshooting si `npm install` falla)
- Docker y Docker Compose (para la base de datos de desarrollo)

## Clonar y levantar el entorno

Todos los comandos `docker compose` se corren desde la **raíz del repo** (ahí vive `docker-compose.yml`), nunca desde `backend/`.

### 1. Clonar

```bash
git https://github.com/YonaZakkart/agroalerta-sv.git
cd agroalerta-sv
```

### 2. Base de datos (MySQL en Docker)

```bash
docker compose up -d db
```

Cada integrante usa su propio contenedor local; no hay base compartida.

### 3. Backend

```bash
cd backend
npm install
```

Crear el archivo de entorno a partir de la plantilla (`.env` **no se sube al repo**):

```bash
cp .env.example .env          # Linux 
copy .env.example .env        # Windows (cmd / PowerShell)
```

Generar un `DUI_PEPPER` propio y pegarlo en `.env`, reemplazando el valor de ejemplo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Valores esperados del resto de variables (desarrollo local):

```
DATABASE_URL="mysql://agroalerta:agroalerta@localhost:3306/agroalerta"
DB_HOST=localhost
DB_PORT=3306
DB_USER=agroalerta
DB_PASSWORD=agroalerta
DB_NAME=agroalerta
```

Generar el cliente de Prisma y sincronizar la base (seguimos en `backend/`):

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Levanta en `http://localhost:3000`. Verificar:

```bash
curl http://localhost:3000/health
```

Debe responder `{"status":"ok"}`.

Prueba del registro (opcional):

```bash
curl -i -X POST http://localhost:3000/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombres":"Yona","apellidos":"Sanchez","correo":"yona@email.com","contrasena":"12345678","dui":"000000003","distrito":"Chilanga"}'
```

Debe responder `201` con el usuario, sin hashes.

### 4. Frontend

En otra terminal, desde la raíz del repo:

```bash
cd frontend
npm install
npx ng serve
```

Levanta en `http://localhost:4200`. Si tienes Angular CLI instalado globalmente, puedes usar `ng serve` directo.

## Después de cada `git pull`

Si el pull trae cambios en `backend/prisma/schema.prisma` o en `backend/prisma/migrations/`, desde `backend/` corre de nuevo:

```bash
npx prisma generate
npx prisma migrate dev
```

El cliente generado (`backend/src/generated/`) no se versiona: cada integrante debe regenerarlo. Si cambió `package.json`, corre también `npm install`.

## Flujo de trabajo

- Una rama por parte/punto (`feat/...`, `chore/...`, `docs/...`); nunca se trabaja directo en `main`.
- Se sube con Pull Request y se documenta en `docs/Estado_del_Proyecto.txt`.
- Archivos compartidos que requieren coordinación antes de tocarlos: `backend/prisma/schema.prisma`, `backend/prisma/migrations/`, `backend/src/events/`, `backend/src/config/prisma.ts`, `backend/src/index.ts`.
- Nunca subir `.env`. Sí se versiona `backend/.env.example`.

## Troubleshooting

### `npm install` falla

Probar en este orden, sin borrar `package-lock.json` (fija las versiones que el proyecto necesita):

1. Error `Cannot read properties of null (reading 'edgesOut')`: bug conocido y abierto del resolutor de npm (Arborist), no relacionado con el proyecto.

   ```bash
   npm install --legacy-peer-deps
   ```

2. Si persiste, instalar exactamente lo que dicta el lockfile:

   ```bash
   rm -rf node_modules
   npm ci --legacy-peer-deps
   ```

3. Si sigue fallando, bajar la versión de npm y repetir:

   ```bash
   npm install -g npm@10.8.2
   ```

4. Verifica tu versión de Node (`node -v`): Prisma 7 necesita 20.19.0 o superior.

### No instalar ni actualizar Prisma o TypeScript "a secas"

- `npm install prisma` sin versión instala Prisma Next (línea 8.x, Early Access), incompatible con este proyecto. Síntoma típico: `[CLI.INVALID_ARGUMENTS] No flag registered for --datasource-provider`. Si hay que instalarlo, siempre `prisma@7.10.0` y `@prisma/client@7.10.0`.
- TypeScript en `backend/` está en 5.9.x; TypeScript 7.x es incompatible con `ts-node-dev`. No actualizar sin confirmarlo en `docs/Estado_del_Proyecto.txt`.

### Errores de Prisma / cliente generado

- `Cannot find module './internal/class.js'` al correr `npm run dev`, o TypeScript dice que una propiedad (por ejemplo `usuario`) no existe en `PrismaClient`: el cliente generado está desactualizado o falta.

  ```bash
  cd backend
  npx prisma generate
  ```

  Luego reinicia el servidor de TypeScript del editor (VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"). Si el error `./internal/class.js` persiste, confirma que el bloque `generator` de `schema.prisma` tenga `importFileExtension = ""`.

- Error `P3014` (acceso denegado) al correr `prisma migrate dev`: el usuario de MySQL no recibió los privilegios para la shadow database. El script `docker/mysql-init/grant-shadow.sql` solo se ejecuta la primera vez que el contenedor arranca con el volumen vacío. Solución (**borra los datos locales de la base**):

  ```bash
  docker compose down -v
  docker compose up -d db
  ```

### Errores al iniciar el backend

- `DUI_PEPPER no está definido en .env`: falta esa variable en `backend/.env` (ver paso 3).
- `Access denied` o `ECONNREFUSED` hacia MySQL: confirma que el contenedor esté arriba (`docker compose ps`) y que `.env` coincida con los valores de la sección de arriba.
- El puerto `3306` ya está en uso (por ejemplo, otro MySQL instalado localmente): detén ese servicio, o cambia el puerto publicado en `docker-compose.yml` y ajusta `DATABASE_URL` y `DB_PORT` en tu `.env`.

### `ng` no reconocido / Angular CLI no encontrado

No es necesario instalarlo global. Dentro de `frontend/`, usa `npx ng <comando>` (por ejemplo `npx ng serve`, `npx ng generate component ...`).

## Estructura

```
agroalerta-sv/
├── docker-compose.yml     → MySQL de desarrollo (se ampliará en Parte 7)
├── docker/mysql-init/     → script de privilegios para la shadow database de Prisma
├── docs/                  → Propuesta_Inicial, Mapa_inicial, Estado_del_Proyecto
├── backend/
│   ├── prisma/            → schema.prisma y migraciones
│   ├── .env.example       → plantilla de variables de entorno
│   └── src/
│       ├── auth/          → Parte 1: usuarios, registro, login, perfil
│       ├── viabilidad/    → Parte 2: zonas y granos viables (CENTA)
│       ├── clima/         → Parte 3: integración Open-Meteo
│       ├── siembra/       → Parte 4: registro de siembra
│       ├── estimacion/    → Parte 5: proyección de cosecha y riesgo
│       ├── events/        → Bus de eventos (EventEmitter nativo) y tipos de eventos
│       ├── config/        → Cliente Prisma compartido
│       └── generated/     → Cliente Prisma generado (no se versiona)
└── frontend/              → Angular (dashboard, historial, clima zonal, configuración)
```
