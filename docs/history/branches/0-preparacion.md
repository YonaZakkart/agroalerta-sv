# Historia — Parte 0: preparación del repositorio

- **Periodo:** 23 de septiembre de 2026
- **Fuente:** `docs/Estado_del_Proyecto.txt`, sección «Parte 0»
- **Estado:** ✅ cerrada

## Contexto

El repositorio `agroalerta-sv` (privado, GitHub) se creó con cuatro integrantes: Yona, Smith, Requeno y Pocho. Antes de escribir funcionalidad hacía falta una base común: estructura de carpetas, stack decidido, base de datos reproducible y reglas de trabajo.

El principio rector del mapa es que **cada parte interfiera lo menos posible con las demás**. La Parte 0 existe para que las Partes 1 y 2 puedan avanzar casi en paralelo sin pisarse.

## Decisiones de stack

| Pieza | Decisión | Motivo |
|---|---|---|
| Backend | Node.js + Express + TypeScript | Un solo lenguaje con el frontend; Express es suficiente para una API REST pequeña. |
| ORM | Prisma 7.10.0 con `@prisma/adapter-mariadb` | Cliente tipado, migraciones integradas y sin decoradores ni arquitectura Nest. |
| Base de datos | MySQL 8.4 en Docker, un contenedor por integrante | Sin costo, sin credenciales compartidas y sin un punto único de falla para un equipo que trabaja los fines de semana. |
| Frontend | Angular 22 standalone | Requisito del proyecto; standalone y signals simplifican la estructura. |
| Eventos | `EventEmitter` en proceso | La arquitectura es orientada a eventos, pero el alcance no justifica una cola externa. |

## Rama `chore/db-setup`

**Responsable:** Yona · **Fecha:** 23 de septiembre de 2026

Qué se hizo:

- `docker-compose.yml` en la **raíz** del repositorio (no dentro de `backend/`, porque la Parte 7 lo ampliará con los servicios de backend y frontend). Servicio `db` con `mysql:8.4`, base `agroalerta`, usuario `agroalerta` y volumen persistente `db_data`.
- `docker/mysql-init/grant-shadow.sql`: privilegios para que Prisma pueda crear la shadow database de las migraciones. **Solo se ejecuta al crear el volumen por primera vez**; de ahí el error `P3014` cuando el contenedor es viejo.
- `npx prisma init --datasource-provider mysql --output ../src/generated/prisma`, que generó `backend/prisma/schema.prisma` y `backend/prisma7.config.ts`.
- Dependencias fijadas: `prisma@7.10.0`, `@prisma/client@7.10.0`, `@prisma/adapter-mariadb` y `dotenv`.
- `.gitignore` ampliado: `node_modules/`, `dist/`, `.angular/`, `.env`, logs y archivos de editor/SO.
- `backend/tsconfig.json`: `rootDir: "./src"` e `include: ["src/**/*"]`.
- Cliente Prisma compartido en `backend/src/config/prisma.ts`; el adapter se construye desde `DATABASE_URL`.

### Incidencias de esta rama

1. **Prisma 8 RC.** `npx prisma` desde la raíz descargaba una versión suelta sin el comando `migrate`. Se fijaron las versiones 7.10.0 y la regla de correr los comandos desde `backend/`.
2. **`Cannot find module './internal/class.js'`.** Con `moduleFormat = "cjs"`, el cliente generado importaba `.js` mientras el archivo real era `.ts`, y `ts-node` no traduce extensiones. Se agregó `importFileExtension = ""` al generator. **Esa línea no se quita.**
3. **Puerto 3306 ocupado en Windows.** Un MySQL local impedía que Docker publicara el puerto; Prisma hablaba con el MySQL de Windows. Se documentó el diagnóstico con `docker ps`.

## Rama `docs/agregar-documentacion`

**Responsable:** Yona · Se subió después de mergear 1-A.

- Se creó la carpeta `docs/` al mismo nivel que `backend/` y `frontend/`.
- Se agregaron `Propuesta_Inicial.txt`, `Mapa_inicial.txt` y `Estado_del_Proyecto.txt`.
- Nació la convención de que la documentación se actualiza en ramas `docs/`, una por punto.

## Cierre

La Parte 0 dejó:

- Un entorno reproducible con un comando (`docker compose up -d db`).
- Prisma conectado y con migraciones funcionando.
- CI base y reglas de ramas.
- Las trampas de entorno documentadas, que siguen vigentes en `gotchas.md`.

## Lecciones que quedaron

- Los comandos de Prisma van desde `backend/`; `docker compose` va desde la raíz.
- Los secretos (`DUI_PEPPER`, `JWT_SECRET`) viven en `.env`, nunca en el repositorio.
- Un contenedor de base de datos no es «infraestructura de un solo uso»: su volumen guarda el estado y su configuración inicial solo corre una vez.
