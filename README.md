# AgroAlerta-SV

Sistema web de prevención de riesgos agrícolas para el departamento de Morazán, El Salvador. Arquitectura orientada a eventos (EDA): combina viabilidad de cultivo por distrito (CENTA), clima (Open-Meteo) e inversión del agricultor para generar proyecciones de cosecha, riesgo y recomendaciones.

La documentación de avance y decisiones vive en [`docs/`](docs/): `Propuesta_Inicial.txt`, `Mapa_inicial.txt`, `Estado_del_Proyecto.txt` (fuente de verdad del avance; léelo antes de tocar código) e `Info_Datos_CENTA.md` (contrato de los datos de viabilidad).

## Stack

- Backend: Node.js + TypeScript + Express + EventEmitter nativo
- Frontend: Angular
- Base de datos: MySQL 8.4 (Docker) + Prisma 7.10.0 (con `@prisma/adapter-mariadb`)
- Autenticación: argon2id (contraseña), HMAC-SHA256 (DUI) y JWT HS256 (sesión)
- Viabilidad: datos de CENTA (potencial de maíz, frijol y maicillo, y riesgo de sequía) a nivel de distrito
- Clima: Open-Meteo API (Parte 3, pendiente)

## Estado actual

Backend: Parte 1 (autenticación) completa; Parte 2-A y 2-B (modelos y carga de datos de viabilidad) completas. Pendientes: servicio y endpoint de viabilidad (2-C y 2-D), clima, siembra, estimación, integración del frontend con el backend y despliegue. Detalle en `docs/Estado_del_Proyecto.txt`.

## Requisitos

- Git y acceso al repositorio (privado; el owner debe haberte agregado como colaborador)
- Node.js 22.x (mínimo 20.19.0, requerido por Prisma 7)
- npm actualizado (ver Troubleshooting si `npm install` falla)
- Docker y Docker Compose (para la base de datos de desarrollo)

## Clonar y levantar el entorno

Todos los comandos `docker compose` se corren desde la **raíz del repo** (ahí vive `docker-compose.yml`), nunca desde `backend/`.

### 1. Clonar

```bash
git clone https://github.com/YonaZakkart/agroalerta-sv.git
cd agroalerta-sv
```

### 2. Base de datos (MySQL en Docker)

```bash
docker compose up -d db
```

Cada integrante usa su propio contenedor local; no hay base compartida.

### 3. Backend: dependencias

```bash
cd backend
npm install
```

### 4. Backend: variables de entorno

Crear el archivo de entorno a partir de la plantilla (`.env` **no se sube al repo**):

```bash
cp .env.example .env          # Linux / macOS
copy .env.example .env        # Windows (cmd / PowerShell)
```

La plantilla trae vacíos `DUI_PEPPER` y `JWT_SECRET`, y **el servidor no arranca si faltan** (JWT_SECRET debe tener al menos 32 caracteres). Genera uno para cada variable (corre el comando dos veces) y pégalos en `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

El resto de variables, para desarrollo local:

```
DATABASE_URL="mysql://agroalerta:agroalerta@localhost:3306/agroalerta"
DB_HOST=localhost
DB_PORT=3306
DB_USER=agroalerta
DB_PASSWORD=agroalerta
DB_NAME=agroalerta
JWT_EXPIRES_IN=2h
EXPONER_TOKEN_VERIFICACION=true
```

`EXPONER_TOKEN_VERIFICACION=true` es solo para desarrollo: hace que el registro devuelva el token de verificación (no hay envío real de correo todavía). En cualquier entorno real debe ser `false` o no existir.

### 5. Backend: Prisma y datos de viabilidad

Seguimos en `backend/`:

```bash
npx prisma generate
npx prisma migrate dev
npm run datos:cargar
```

`npm run datos:cargar` carga en MySQL los CSV limpios de `backend/data/centa/clean/` (ya vienen en el repo). Es idempotente: se puede repetir sin duplicar. Debe terminar con: municipios 2, distritos 26, capas 4, clases_capa 12, areas_clase 312. No necesitas correr `datos:limpiar` salvo que se actualicen los exports de CENTA (ver más abajo).

### 6. Backend: arrancar y verificar

```bash
npm run dev
```

Debe imprimir `Backend corriendo en puerto 3000`. Verificar en otra terminal:

```bash
curl http://localhost:3000/health
```

Debe responder `{"status":"ok"}`. Si el puerto 3000 está ocupado, el backend aborta con `No se pudo iniciar el backend en el puerto ...`.

### 7. Prueba del flujo de autenticación (opcional)

Registro (con `EXPONER_TOKEN_VERIFICACION=true` la respuesta incluye `tokenVerificacion_DEV`; nunca incluye hashes):

```bash
curl -i -X POST http://localhost:3000/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombres":"Yona","apellidos":"Sanchez","correo":"yona@email.com","contrasena":"12345678","dui":"000000003","distrito":"Chilanga"}'
```

Verificar el correo con el token recibido (un usuario sin verificar no puede iniciar sesión):

```bash
curl http://localhost:3000/auth/verificar/<tokenVerificacion_DEV>
```

Iniciar sesión y consultar el perfil con el token JWT devuelto:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"yona@email.com","contrasena":"12345678"}'

curl http://localhost:3000/auth/yo -H "Authorization: Bearer <token>"
```

### 8. Frontend

En otra terminal, desde la raíz del repo:

```bash
cd frontend
npm install
npx ng serve
```

Levanta en `http://localhost:4200`. Si tienes Angular CLI instalado globalmente, puedes usar `ng serve` directo. Por ahora el frontend no está conectado al backend (CORS y login en Angular pendientes).

## Endpoints disponibles

- `GET /health`
- `POST /auth/registro`
- `GET /auth/verificar/:token`
- `POST /auth/reenviar-verificacion`
- `POST /auth/login`
- `GET /auth/yo` (requiere `Authorization: Bearer <token>`)

Los errores de `/auth` siguen el formato `{ "error": string, "detalles"?: string | string[] }`. Los 500 nunca devuelven el mensaje interno. El endpoint de viabilidad (2-D) aún no existe.

## Después de cada `git pull`

Desde `backend/`, según lo que haya cambiado:

- `package.json`: `npm install --legacy-peer-deps`.
- `prisma/schema.prisma` o `prisma/migrations/`: `npx prisma generate` y `npx prisma migrate dev`.
- `data/centa/clean/`: `npm run datos:cargar`.
- Variables nuevas en `.env.example`: agrégalas a tu `.env`.

El cliente generado (`backend/src/generated/`) no se versiona: cada integrante debe regenerarlo.

## Datos de viabilidad (CENTA)

CENTA no expone API pública. Los datos salen de la herramienta de consulta de su mapa (un CSV por capa, todo Morazán, todas las clases) y se versionan en el repo:

- `backend/data/centa/raw/`: exports crudos (`Potencial_maiz.csv`, `Potencial_frijol.csv`, `Potencial_sorgo.csv`, `Riesgo_sequia.csv`), `division_territorial_morazan.csv` y `fuente.json` con la fuente y la fecha de extracción. **No abrirlos ni guardarlos en Excel**: puede cambiar separador, codificación y formato numérico. Nombres de archivo solo ASCII.
- `backend/data/centa/clean/`: `distritos.csv` y `areas_clase.csv`, generados por script. No se editan a mano.

Si CENTA actualiza el mapa, desde `backend/`:

1. Reemplazar los crudos de `raw/` (con los mismos nombres) y actualizar `fuente.json`.
2. `npm run datos:limpiar`: valida todo y solo escribe los CSV limpios si no hay ningún error.
3. Revisar con `git diff` los CSV limpios.
4. `npm run datos:cargar`.
5. Subir crudos y limpios juntos en el mismo commit.

Para agregar una capa: nueva entrada en `src/viabilidad/datos/capas.config.ts`, su export en `raw/` y actualizar la constante `ESPERADO` en `cargar-centa.ts`. El contrato completo está en `docs/Info_Datos_CENTA.md`.

## Flujo de trabajo

- Una rama por parte/punto (`feat/...`, `fix/...`, `chore/...`, `docs/...`); nunca se trabaja directo en `main`.
- Se sube con Pull Request y se documenta en `docs/Estado_del_Proyecto.txt` (lo ya escrito de cada rama no se modifica).
- Archivos compartidos que requieren coordinación antes de tocarlos: `backend/prisma/schema.prisma`, `backend/prisma/migrations/`, `backend/src/events/`, `backend/src/config/prisma.ts`, `backend/src/index.ts`, `backend/package.json`.
- Routers nuevos: seguir el contrato de error `{ error, detalles }` y no devolver `error.message` en los 500.
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

### `Cannot find module 'jsonwebtoken'` (u otro paquete declarado en `package.json`)

El `node_modules` local quedó incompleto. Desde `backend/`:

```bash
npm ci --legacy-peer-deps
npx prisma generate
```

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

  Después repite `npx prisma migrate dev` y `npm run datos:cargar` dentro de `backend/`.

- Error `P2039` ("pool timeout") o `P2021`/`P2022` (tablas o columnas inexistentes): `P2021`/`P2022` se resuelven con `npx prisma generate` y `npx prisma migrate dev`. `P2039` esconde la causa real: prueba la conexión con el paquete `mariadb` directamente. La causa conocida es `ER_CANNOT_RETRIEVE_RSA_KEY` (MySQL 8.4 sin TLS); ya se maneja en `src/config/prisma.ts`, así que si aparece, revisa que tu copia de `main` esté actualizada. Detalle en RAMA 10 de `docs/Estado_del_Proyecto.txt`.

### Errores al iniciar el backend

- El servidor aborta indicando que falta `JWT_SECRET` o `DUI_PEPPER`, o que `JWT_SECRET` tiene menos de 32 caracteres: completa esas variables en `backend/.env` (paso 4). Aborta a propósito.
- `No se pudo iniciar el backend en el puerto ...`: el puerto 3000 está ocupado, a menudo por un contenedor de otro proyecto. Revisa con `docker ps` y `sudo ss -ltnp | grep :3000`.
- `Access denied` o `ECONNREFUSED` hacia MySQL: confirma que el contenedor esté arriba (`docker compose ps`) y que `.env` coincida con los valores de la sección 4.
- El puerto `3306` ya está en uso (por ejemplo, otro MySQL instalado localmente): detén ese servicio, o cambia el puerto publicado en `docker-compose.yml` y ajusta `DATABASE_URL` y `DB_PORT` en tu `.env`.
- Ruido informativo normal al correr scripts: `npm notice ...`, `[INFO] ts-node-dev ...` y `injected env (N) from .env`. No son errores.

### `npm run datos:cargar` falla

- "la tabla de ... quedó con N filas y se esperaban M": hay filas ajenas a la carga en esa tabla (por ejemplo, insertadas a mano). La transacción ya se revirtió y no quedó nada a medias.
- Ejecuta siempre los scripts desde `backend/` (dotenv lee el `.env` del directorio actual).

### `ng` no reconocido / Angular CLI no encontrado

No es necesario instalarlo global. Dentro de `frontend/`, usa `npx ng <comando>` (por ejemplo `npx ng serve`, `npx ng generate component ...`).

## Estructura

```
agroalerta-sv/
├── docker-compose.yml     → MySQL de desarrollo (se ampliará en Parte 7)
├── docker/mysql-init/     → script de privilegios para la shadow database de Prisma
├── docs/                  → Propuesta_Inicial, Mapa_inicial, Estado_del_Proyecto, Info_Datos_CENTA
├── backend/
│   ├── prisma/            → schema.prisma y migraciones
│   ├── data/centa/        → raw/ (exports de CENTA) y clean/ (CSV generados)
│   ├── .env.example       → plantilla de variables de entorno
│   └── src/
│       ├── auth/          → Parte 1: registro, verificación, login, JWT, perfil
│       ├── viabilidad/    → Parte 2: datos/ (limpieza y carga CENTA); servicio y endpoint pendientes
│       ├── clima/         → Parte 3: integración Open-Meteo
│       ├── siembra/       → Parte 4: registro de siembra
│       ├── estimacion/    → Parte 5: proyección de cosecha y riesgo
│       ├── events/        → Bus de eventos (EventEmitter nativo) y tipos de eventos
│       ├── config/        → Cliente Prisma compartido
│       └── generated/     → Cliente Prisma generado (no se versiona)
└── frontend/              → Angular (dashboard, historial, clima zonal, configuración)
```
