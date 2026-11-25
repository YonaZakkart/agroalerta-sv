# Despliegue — Neon, Render y Vercel

- **Base de datos:** Neon Postgres (`agroalerta-db`, branch `production`).
- **Backend:** Render, servicio web Node.
- **Frontend:** Vercel, SPA Angular.
- **Estado:** 7-A configurado y probado en local contra Neon. Render/Vercel quedan listos para conectar; la verificación en esas plataformas requiere las cuentas.

## 1. Neon

El proyecto quedó vinculado con `neon init` y `neon deploy`. El branch `production` tiene Postgres y sus variables se pull-earon a `.env.local`:

- `DATABASE_URL` — pooled, para la app.
- `DATABASE_URL_UNPOOLED` — directa, solo para migraciones.

En `backend/.env` se copiaron ambas; no se versiona.

```bash
cd backend
npx prisma migrate deploy   # usar DATABASE_URL_UNPOOLED en DATABASE_URL
npm run datos:cargar
```

La migración base de Postgres es `backend/prisma/migrations/20261125_init_postgres`. Las migraciones MySQL anteriores se conservan en `backend/prisma/migrations-mysql/` como histórico, no las usa Prisma.

## 2. Render (backend)

- **Root Directory:** `backend`
- **Build Command:** `npm ci --legacy-peer-deps && npx prisma generate && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

Variables:

```text
DATABASE_URL=postgresql://...-pooler...neon.tech/neondb?sslmode=require
JWT_SECRET=<32+ caracteres>
DUI_PEPPER=<32+ caracteres>
NODE_ENV=production
CORS_ORIGINS=https://<tu-frontend>.vercel.app
EXPONER_TOKEN_VERIFICACION=false
PORT=10000
```

No pongas `DATABASE_URL_UNPOOLED` en Render salvo que ejecutes migraciones desde el build; para migrar, corre `prisma migrate deploy` desde local apuntando a la directa.

## 3. Vercel (frontend)

- **Framework Preset:** Angular (si no lo detecta, Other)
- **Root Directory:** `frontend`
- **Install Command:** `npm install`
- **Build Command:** `npm run build` (equivale a `npx ng build`)
- **Output Directory:** `dist/frontend/browser`

`frontend/vercel.json` redirige `/api/*` a Render. Así el frontend sigue usando `API_URL = '/api'` y no hace falta CORS ni variable `API_URL`.

Si prefieres llamar directo a Render, cambia `API_URL` en `core/api.config.ts` y configura `CORS_ORIGINS` con el dominio de Vercel. La redirección es la opción recomendada.

## 4. Prueba local contra Neon

```bash
cd backend
npm run build
npm start
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/distritos
```

Resultado esperado: `200 {"status":"ok","baseDatos":"ok"}` y 26 distritos.

## 5. Release

Tag previsto: `agroalerta-v1.0`, después de mergear la rama y verificar Render/Vercel.
