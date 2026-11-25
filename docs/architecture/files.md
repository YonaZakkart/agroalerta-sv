# Árbol de archivos y orden de carga

Estado real del repositorio al 24 de noviembre de 2026. No se listan `node_modules/`, `dist/`, `.angular/` ni `backend/src/generated/` porque no se versionan.

---

## 1. Raíz del repositorio

```
agroalerta-sv/
├── README.md                     instalación, stack, endpoints y comprobaciones
├── .gitignore
├── .gitattributes                normalización de finales de línea (PR #46)
├── docker-compose.yml            MySQL 8.4 de desarrollo (servicio "db")
├── docker/
│   └── mysql-init/
│       └── grant-shadow.sql      privilegios para la shadow database de Prisma
├── .github/
│   └── workflows/                CI: typecheck, pruebas y build
├── docs/                         esta documentación
├── backend/
└── frontend/
```

---

## 2. Backend

```
backend/
├── package.json                  scripts de desarrollo, pruebas, datos y Prisma
├── package-lock.json
├── tsconfig.json                 rootDir ./src, include src/**/*
├── prisma7.config.ts             configuración del CLI de Prisma (fuera de src/)
├── .env.example                  plantilla; DUI_PEPPER y JWT_SECRET vacíos y obligatorios
├── data/
│   ├── centa/
│   │   ├── raw/                  exports originales de CENTA (no editar)
│   │   │   ├── Potencial_maiz.csv
│   │   │   ├── Potencial_frijol.csv
│   │   │   ├── Potencial_sorgo.csv
│   │   │   ├── Riesgo_sequia.csv
│   │   │   ├── division_territorial_morazan.csv
│   │   │   └── fuente.json
│   │   └── clean/                generado por datos:limpiar
│   │       ├── distritos.csv     26 filas, con latitud y longitud desde 3-0b
│   │       └── areas_clase.csv   312 filas
│   └── referencia/
│       ├── coordenadas_distritos.csv   26 coordenadas con fuente y fecha
│       └── normales_lluvia_30d.json    normal de lluvia por distrito (365 claves)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20260923233440_add_usuarios/
│       ├── 20260927210046_add_verificacion_correo/
│       ├── 20261004212446_add_viabilidad/
│       ├── 20261030231036/              Usuario.distrito_id con FK
│       ├── 20261102032958_add_coordenadas_distrito/
│       ├── 20261107143412_add_condicion_distrito/
│       ├── 20261116035128_add_siembras/
│       └── migration_lock.toml
└── src/
    ├── index.ts                  composición de Express y arranque
    ├── config/
    │   ├── prisma.ts             cliente Prisma compartido + adapter MariaDB
    │   ├── entorno.ts            validación de variables obligatorias
    │   └── puerto.ts             lectura de PORT como puerto TCP
    ├── comun/
    │   ├── normalizar.ts         colapsarEspacios y normalizarNombre
    │   ├── http-errores.ts       404 JSON y manejador de errores
    │   ├── http-seguridad.ts     CORS opt-in, cabeceras y límite de cuerpo
    │   ├── rate-limit.ts         limitador en memoria por IP
    │   ├── salud.ts              /health con verificación de base
    │   └── cierre.ts             cierre ordenado SIGTERM/SIGINT
    ├── auth/
    │   ├── registro.routes.ts    POST /auth/registro, verificar, reenviar
    │   ├── registro.service.ts   hashing, creación y evento
    │   ├── login.routes.ts       POST /auth/login
    │   ├── perfil.routes.ts      GET /auth/yo
    │   ├── auth.middleware.ts    requireAuth
    │   ├── jwt.ts                firma y verificación HS256
    │   └── distrito.select.ts    select compartido de distrito
    ├── viabilidad/
    │   ├── service.ts            consultarViabilidad()
    │   ├── constantes.ts         HA_POR_MANZANA
    │   ├── origen.ts             fuente y fecha de la extracción
    │   ├── viabilidad.routes.ts  GET /viabilidad/distritos/:id
    │   ├── distritos.routes.ts   GET /distritos (público)
    │   └── datos/
    │       ├── capas.config.ts
    │       ├── utilidades.ts
    │       ├── limpiar-centa.ts
    │       └── cargar-centa.ts
    ├── clima/
    │   ├── index.ts              API pública del módulo
    │   ├── config.ts             URLs, timeouts, ventanas y atribución
    │   ├── tipos.ts              PuntoDistrito, DiaLluvia, SerieLluviaDistrito…
    │   ├── errores.ts            ErrorOpenMeteo y tipos de error
    │   ├── open-meteo.client.ts  consultas de pronóstico e histórico
    │   ├── normales.ts           cálculo de la normal de 30 días
    │   ├── normales-archivo.ts   lectura de normales_lluvia_30d.json
    │   ├── clima-actual.ts       serie actual por distrito
    │   ├── puntos.ts             coordenadas de los distritos
    │   ├── generar-normales.ts   npm run clima:normales
    │   ├── probar-open-meteo.ts  npm run clima:probar
    │   ├── umbrales.ts           todos los umbrales, con su tipo
    │   ├── resumen-lluvia.ts     acumulado, razón y días secos
    │   ├── clasificacion.ts      clasificarLluvia()
    │   ├── condicion.repo.ts     persistencia de la condición
    │   ├── condicion-cambio.ts   detección de cambio
    │   ├── condicion.dto.ts      contrato de salida y validación de id
    │   ├── clasificar-probar.ts  npm run clima:clasificar
    │   ├── distritos-solicitados.ts  validación de distritoIds
    │   ├── errores-http.ts       mapeo de errores a 400/429/502
    │   ├── orquestador.ts        consulta → clasifica → guarda → emite
    │   ├── job.ts                job periódico
    │   └── clima.routes.ts       GET /clima/distritos/:id y POST /clima/actualizar
    ├── events/
    │   ├── bus.ts                instancia única de EventEmitter
    │   ├── emitir.ts             emitirSeguro()
    │   └── types.ts              nombres y payloads de eventos
    ├── siembra/                  vacío: 4-D agrega rutas y servicio
    └── estimacion/
        ├── referencia.ts         tabla F3 con fuente, fecha y tipo
        ├── estimar-costos.ts     función pura estimarCostos()
        ├── index.ts              API pública del módulo
        └── estimar-costos.pruebas.ts
```

### Archivos de prueba del backend

```
src/config/puerto.pruebas.ts, entorno.pruebas.ts
src/comun/http-errores.pruebas.ts, http-seguridad.pruebas.ts,
         rate-limit.pruebas.ts, salud.pruebas.ts, cierre.pruebas.ts
src/events/emitir.pruebas.ts
src/viabilidad/origen.pruebas.ts
src/clima/clima.pruebas.ts, clasificacion.pruebas.ts,
         condicion-cambio.pruebas.ts, condicion.dto.pruebas.ts,
         distritos-solicitados.pruebas.ts, errores-http.pruebas.ts,
         job.pruebas.ts, normales-archivo.pruebas.ts,
         orquestador.prueba.ts
src/estimacion/estimar-costos.pruebas.ts
```

---

## 3. Frontend

```
frontend/
├── package.json                  Angular 22, scripts de dev/build/test/typecheck
├── package-lock.json
├── angular.json
├── proxy.conf.json               /api → http://localhost:3000
├── tsconfig.json, tsconfig.app.json, tsconfig.spec.json
├── public/                       favicon
└── src/
    ├── index.html                idioma es, fuente y Font Awesome por CDN
    ├── styles.css                variables CSS, reset, formularios y alertas
    ├── main.ts, main.server.ts, server.ts
    └── app/
        ├── app.ts, app.html, app.css, app.spec.ts
        ├── app.config.ts         HttpClient con fetch + interceptor
        ├── app.config.server.ts
        ├── app.routes.ts         /login, /registro y área protegida
        ├── app.routes.server.ts  RenderMode.Client en "**"
        ├── core/
        │   ├── api.config.ts     API_URL = '/api'
        │   ├── models.ts         contratos del backend
        │   ├── auth.service.ts
        │   ├── auth.interceptor.ts
        │   ├── auth.guard.ts     authGuard e invitadoGuard
        │   ├── token.ts          expiración y vigencia del JWT
        │   ├── perfil.service.ts
        │   ├── distritos.service.ts
        │   ├── viabilidad.service.ts
        │   ├── clima.service.ts
        │   ├── siembra.service.ts
        │   ├── errores.ts        mensajesDeError()
        │   └── *.spec.ts         pruebas de servicios, guards y utilidades
        ├── layout/
        │   ├── auth-shell/       panel de login y registro
        │   └── shell/            sidebar, header, perfil y clima compacto
        └── pages/
            ├── login/
            ├── registro/
            ├── dashboard/        viabilidad real y panel de estimación vacío
            ├── clima-zonal/      condición por distrito
            └── siembra/          formulario de siembra (4-B)
```

---

## 4. Orden de carga del backend

1. `index.ts` importa `dotenv/config`.
2. Se valida el entorno (`JWT_SECRET`, `DUI_PEPPER`) antes de crear la app. Si falta algo, el proceso termina con código 1.
3. Se crea la app Express y se aplican, en orden:
   - `cabecerasSeguridad`
   - `crearCors(leerOrigenesPermitidos(CORS_ORIGINS))`
   - `express.json({ limit: "100kb" })`
   - limitadores de `/auth/login`, `/auth/registro`, `/auth/reenviar-verificacion`, `/clima/actualizar` y `/clima`
4. Rutas:
   - `GET /health/live`
   - `GET /health` (verifica MySQL)
   - `/auth` → registro, login y perfil
   - `/viabilidad` → viabilidad
   - `/distritos` → catálogo público
   - `/clima` → clima
5. `rutaNoEncontrada` y `manejarErrores` al final.
6. `app.listen`; en el callback se inicia el job de clima si `CLIMA_JOB_ACTIVO !== "false"`.
7. `servidor.on("error")` maneja puerto ocupado y otros fallos de arranque.
8. `SIGTERM`/`SIGINT` ejecutan el cierre ordenado.

## 5. Orden de carga del frontend

1. `main.ts` arranca la aplicación con `appConfig`.
2. `app.config.ts` registra el router, la hidratación del cliente y `HttpClient` con `withFetch()` y `authInterceptor`.
3. `app.routes.ts` resuelve la ruta:
   - `/login` y `/registro` con `invitadoGuard`.
   - Área protegida con `Shell` y `authGuard`; hijos `/dashboard`, `/clima-zonal` y `/siembra`.
   - `''` redirige a `/dashboard`; `**` redirige a `''`.
4. `Shell` carga el perfil (`GET /auth/yo`) y el clima del distrito del usuario para el encabezado.
5. Cada página carga sus datos con su servicio; el interceptor agrega el token y maneja el 401.
6. `app.routes.server.ts` fuerza `RenderMode.Client` en todas las rutas; el SSR no ejecuta lógica de sesión.

---

## 6. Archivos que no se versionan

- `backend/.env`
- `node_modules/` (backend y frontend)
- `dist/` y `.angular/`
- `backend/src/generated/`
- Archivos de editor y de sistema operativo

---

## 7. Dónde está cada responsabilidad

| Responsabilidad | Archivo principal |
|---|---|
| Composición de la API | `backend/src/index.ts` |
| Validación de entorno | `backend/src/config/entorno.ts` |
| Conexión a MySQL | `backend/src/config/prisma.ts` |
| Registro y login | `backend/src/auth/` |
| Viabilidad CENTA | `backend/src/viabilidad/service.ts` |
| Catálogo de distritos | `backend/src/viabilidad/distritos.routes.ts` |
| Open-Meteo | `backend/src/clima/open-meteo.client.ts` |
| Clasificación climática | `backend/src/clima/clasificacion.ts` |
| Orquestación y eventos | `backend/src/clima/orquestador.ts` |
| Job periódico | `backend/src/clima/job.ts` |
| Estimación de costos (4-C) | `backend/src/estimacion/estimar-costos.ts` |
| Precios y dosis F3 | `backend/src/estimacion/referencia.ts` |
| Contratos de eventos | `backend/src/events/types.ts` |
| Sesión en el cliente | `frontend/src/app/core/auth.service.ts` |
| Interceptor y 401 | `frontend/src/app/core/auth.interceptor.ts` |
| Rutas y guards | `frontend/src/app/app.routes.ts`, `core/auth.guard.ts` |
| Dashboard | `frontend/src/app/pages/dashboard/` |
| Clima Zonal | `frontend/src/app/pages/clima-zonal/` |
| Formulario de siembra | `frontend/src/app/pages/siembra/` |
| Estilos globales | `frontend/src/styles.css` |
