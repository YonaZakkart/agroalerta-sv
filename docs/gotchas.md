# Trampas y problemas conocidos

Cosas que ya costaron tiempo en este proyecto. Léalas antes de depurar desde cero. Cada entrada tiene **síntoma → causa → solución**.

---

## 1. Base de datos y Prisma

### 1.1 `Cannot find module './internal/class.js'` al arrancar

- **Síntoma:** `npm run dev` falla con `Cannot find module './internal/class.js'` y la pila pasa por `generated/prisma/client.ts`.
- **Causa:** el generator de Prisma usa `moduleFormat = "cjs"` y, sin `importFileExtension`, genera imports con `.js` mientras el archivo real es `.ts`. `ts-node` no traduce `.js` a `.ts`.
- **Solución:** el generator de `schema.prisma` debe tener `importFileExtension = ""`. No quitar esa línea. Después: `npx prisma generate`.

### 1.2 `P2039` o “pool timeout” al conectar con MySQL 8.4

- **Síntoma:** el backend arranca pero cualquier consulta falla con `P2039` o timeout del pool.
- **Causa:** MySQL 8.4 usa `caching_sha2_password`; sin TLS, el conector MariaDB necesita `allowPublicKeyRetrieval`.
- **Solución:** `config/prisma.ts` construye el adapter parseando `DATABASE_URL` y activa `allowPublicKeyRetrieval` salvo `NODE_ENV=production`. No pasar la cadena directamente al constructor sin esa opción.

### 1.3 El puerto 3306 lo ocupa otro MySQL (Windows)

- **Síntoma:** `docker ps` muestra el contenedor con `3306/tcp` pero **sin** `0.0.0.0:3306->3306/tcp`; `docker compose exec … SHOW TABLES` no lista las tablas que el backend sí usa; Prisma habla con un MySQL instalado en Windows.
- **Causa:** un servicio MySQL local (MySQL80, MySQL96, etc.) ocupa el puerto. Docker publica el puerto pero no puede asignarlo.
- **Solución:** detener el servicio y dejarlo en inicio manual (`sc config <servicio> start= demand`), sin borrar datos. Comprobar con `docker ps`. Después: `docker compose down -v`, `docker compose up -d db` y repetir migraciones y carga.

### 1.4 `P3014` al correr `prisma migrate dev`

- **Síntoma:** la migración falla con `P3014` por la shadow database.
- **Causa:** el contenedor se creó antes de `docker/mysql-init/grant-shadow.sql`; ese script solo corre al crear el volumen por primera vez.
- **Solución:** `docker compose down -v` y `docker compose up -d db`. Se pierden los datos locales; después se repiten migraciones y `datos:cargar`.

### 1.5 La migración de `distrito_id` falla con usuarios existentes

- **Síntoma:** `prisma migrate dev` no puede convertir `usuarios.distrito` (texto) en `distrito_id` (FK obligatoria).
- **Causa:** hay usuarios con un distrito que no existe en el catálogo o la columna nueva es obligatoria.
- **Solución:** reiniciar la base (`docker compose down -v`, `up -d db`) y repetir migraciones y carga. Los usuarios de prueba se registran de nuevo. Está advertido en el encabezado de la migración.

### 1.6 `npx prisma` desde la raíz descarga Prisma 8 RC

- **Síntoma:** `npx prisma migrate dev` desde la raíz del repo no reconoce `migrate` o instala una versión distinta.
- **Causa:** el `package.json` de Prisma está en `backend/`; desde la raíz, `npx` descarga la última versión (línea 8.0.0-rc).
- **Solución:** correr todos los comandos `npm`/`npx` desde `backend/`. `docker compose` sí va desde la raíz.

### 1.7 Los CSV aparecen modificados sin cambios reales

- **Síntoma:** `git status` marca `backend/data/centa/raw/*.csv` como modificados después de correr `datos:limpiar` en Windows.
- **Causa:** `core.autocrlf=true` cambia CRLF por LF; `git diff --ignore-cr-at-eol` no muestra diferencias.
- **Solución:** `git restore` sobre esos archivos y **no stagearlos**. `.gitattributes` normaliza finales de línea desde la rama transversal, pero los archivos ya versionados pueden seguir mostrando ruido.

### 1.8 `npm install` falla con `Cannot read properties of null (reading 'edgesOut')`

- **Causa:** conflicto de dependencias de npm.
- **Solución:** `npm install --legacy-peer-deps`. Si el `node_modules` queda incompleto: `npm ci --legacy-peer-deps` y luego `npx prisma generate`.

---

## 2. TypeScript, Node y herramientas

### 2.1 TypeScript 7 rompe `ts-node-dev`

- **Síntoma:** el backend no arranca o `ts-node-dev` falla tras actualizar TypeScript.
- **Causa:** TypeScript 7.0.2 (compilador nativo) es incompatible con `ts-node-dev` a la fecha.
- **Solución:** mantener `typescript` en `^5.9.0` en `backend/`. No actualizar sin probar `npm run dev`.

### 2.2 `node` es alias de `winpty` en Git Bash

- **Síntoma:** dentro de `$(...)` o de un pipe, `node` no devuelve nada (“stdout is not a tty”) y los tokens quedan vacíos.
- **Causa:** alias de Git Bash para programas interactivos.
- **Solución:** usar `node.exe` en esos comandos. Los comandos con `require('dotenv/config')` o `require('jsonwebtoken')` se corren dentro de `backend/`.

### 2.3 `JWT_EXPIRES_IN` vacío no usa el valor por defecto

- **Síntoma:** el token se firma sin expiración o falla la firma.
- **Causa:** `??` no cubre la cadena vacía.
- **Solución:** el código usa `process.env.JWT_EXPIRES_IN?.trim()` y cae en `"2h"` si está vacío. Mantener ese patrón.

### 2.4 El backend “funciona” pero `docker compose exec` no ve las tablas

- **Causa:** casi siempre es el puerto 3306 ocupado (ver 1.3), no el código.
- **Solución:** revisar `docker ps`, `netstat`/`ss` y la cadena `DATABASE_URL` antes de tocar Prisma.

### 2.5 `npm test` se corta en `pruebas:http` en Windows

- **Síntoma:** `npm run pruebas:http` imprime sus casos y termina con `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94`; como `npm test` encadena con `&&`, la cadena se corta.
- **Causa:** `http-errores.pruebas.ts` llama `process.exit()` justo después de `servidor.close()`; en Windows eso dispara la aserción de libuv. No es un fallo del código de la prueba.
- **Solución:** correr los grupos por separado en Windows. La corrección (`process.exitCode` en lugar de `process.exit`) está pendiente en un PR aparte; en Linux la cadena corre completa.

### 2.6 El editor guarda una versión vieja de `schema.prisma`

- **Síntoma:** el editor muestra un schema sin el último bloque, o al guardar avisa “El contenido del archivo es más reciente”; `prisma migrate dev` dice “in sync” y no crea la migración.
- **Causa:** después de cambiar de rama, el editor conserva una copia en memoria desactualizada.
- **Solución:** elegir “Revertir”/“Comparar” (no “Sobrescribir”), cerrar las pestañas de `schema.prisma`, `git restore backend/prisma/schema.prisma`, reabrir y editar. Antes de migrar, `git diff --stat backend/prisma/schema.prisma` debe mostrar solo inserciones. Si `migrate dev` no dice “Applying migration …”, la migración nueva no se creó.

### 2.7 Repositorio dentro de OneDrive

- **Síntoma:** Git ve copias viejas, bloqueos o cambios que no se guardaron.
- **Causa:** OneDrive sincroniza en segundo plano y puede interferir con `.git`.
- **Solución:** mover el repositorio fuera de OneDrive (por ejemplo `C:\dev\agroalerta-sv`) o pausar la sincronización mientras se trabaja.

---

## 3. Frontend

### 3.1 `NG0203: takeUntilDestroyed() can only be used within an injection context`

- **Síntoma:** la app falla al entrar a `/dashboard`, `/clima-zonal`, login o registro.
- **Causa:** `takeUntilDestroyed()` se llamó dentro de un método (no en el constructor) sin pasar un `DestroyRef`. En Angular 22 eso ya no está permitido.
- **Solución:** inyectar `DestroyRef` en la clase y llamar `takeUntilDestroyed(this.destroyRef)` en los métodos. Corregido en `fix/ng0203-takeuntil-destroyed` (PR #50).
- **Regla:** si el método puede ejecutarse después del constructor, pasar siempre el `DestroyRef`.

### 3.2 El token se envía a orígenes externos

- **Síntoma:** el interceptor agrega `Authorization` a cualquier petición.
- **Causa:** no se filtraba por URL.
- **Solución:** el interceptor solo agrega el encabezado si la URL es `API_URL` o empieza por `API_URL/`. No ampliar ese filtro sin revisar la seguridad.

### 3.3 La sesión sigue “activa” con un token vencido

- **Síntoma:** el guard deja entrar y la primera petición devuelve 401.
- **Causa:** el token seguía en `sessionStorage` después de expirar.
- **Solución:** `tokenVigente()` lee `exp` del JWT; `AuthService` descarta tokens vencidos al construirse y el `authGuard` usa `autenticado` (computed), no solo la existencia del token.

### 3.4 Después de un 401 se ve el distrito del usuario anterior

- **Síntoma:** al cerrar sesión por token inválido, el dashboard muestra datos del perfil anterior hasta recargar.
- **Causa:** el interceptor cerraba la sesión pero no limpiaba el `PerfilService`.
- **Solución:** el interceptor llama `perfil.limpiar()` antes de navegar a `/login`. Cualquier nuevo estado global de sesión debe limpiarse ahí también.

### 3.5 El dashboard muestra datos obsoletos al cambiar de distrito o cultivo

- **Síntoma:** durante la carga se ve la viabilidad del distrito anterior.
- **Causa:** no se limpiaba el estado antes de la nueva petición.
- **Solución:** el `tap` previo al `switchMap` pone `datos` en `null` y `cargando` en `true`. Mantener ese orden.

### 3.6 `sessionStorage` no está disponible en SSR

- **Síntoma:** error al renderizar en el servidor.
- **Causa:** el token vive en `sessionStorage`, que no existe en Node.
- **Solución:** todas las rutas usan `RenderMode.Client` en `app.routes.server.ts`. No cambiar a prerender sin rediseñar la sesión.

### 3.7 El frontend no llega al backend en desarrollo

- **Síntoma:** 404 en `/api/...` desde `ng serve`.
- **Causa:** falta el proxy o el backend no está en el puerto 3000.
- **Solución:** `proxy.conf.json` reenvía `/api` a `http://localhost:3000`; `ng serve` debe arrancar con esa configuración. En producción se reemplaza por CORS o por un proxy inverso (Parte 7).

### 3.8 El clima muestra “Sin evaluar” y parece un error

- **Causa:** `condicion` es `null` fuera de la época evaluable (después del 15 de noviembre) o cuando no hay días completos.
- **Solución:** es un estado válido. La interfaz debe mostrarlo como “Sin evaluar” o “Fuera de la época lluviosa”, no como fallo. No convertirlo a `0` ni a “sin datos” genérico.

---

## 4. Clima y Open-Meteo

### 4.1 No se emite `ActualizacionMeteorologica` aunque la consulta fue bien

- **Causa:** el último día completo no tiene precipitación (`null`). El contrato actual exige `precipitacionMm: number`, así que el orquestador omite el evento y avisa por consola.
- **Solución:** es intencional. Cambiar el contrato a `number | null` requiere acuerdo del equipo y tocar `events/types.ts`, `orquestador.ts` y los listeners.

### 4.2 El job no actualiza al arrancar

- **Causa:** la primera ejecución ocurre después del primer intervalo, para que el arranque no dependa de Open-Meteo.
- **Solución:** usar `POST /clima/actualizar` para forzar una actualización, o esperar el intervalo (`CLIMA_JOB_INTERVALO_MS`, mínimo 1 hora). El job se desactiva con `CLIMA_JOB_ACTIVO=false`.

### 4.3 Un 429 de Open-Meteo se repite en cada ciclo

- **Causa:** el límite es por hora; reintentar al siguiente intervalo vuelve a fallar.
- **Solución:** el job pausa dos ciclos ante un 429 (`esperaTrasError`). No reducir la pausa sin revisar el límite de la API.

### 4.4 Los umbrales parecen arbitrarios

- **Causa:** varios son **SUPUESTOS** declarados en `Info_Datos_Clima.md` (día seco < 1 mm, cortes de sequía/exceso, guarda de 20 mm, ventanas de época).
- **Solución:** todos viven en `clima/umbrales.ts`, con su tipo (`OFICIAL_MARN` / `SUPUESTO`) y su sección. No poner valores sueltos en las funciones. Confirmarlos con CENTA, un agrónomo o datos reales antes de presentarlos como oficiales.

### 4.5 Falsos positivos de sequía en octubre–noviembre

- **Causa:** la lluvia de 30 días cae de forma natural en la transición de lluviosa a seca.
- **Solución:** el margen anti-oscilación (0.05) y la época evaluable (01-05 a 15-11) reducen el riesgo, pero el equipo debe revisar los resultados en esa ventana. Está anotado como pendiente.

### 4.6 Atribución de Open-Meteo

- **Requisito:** la licencia CC BY 4.0 exige mostrar “Weather data by Open-Meteo.com” con enlace donde se muestren sus datos.
- **Estado:** el backend devuelve `atribucion` en `GET /clima/distritos/:id`; la interfaz debe mostrarla (pendiente en 6-D/7-D).

---

## 5. Documentación y proceso

### 5.1 La documentación vigente está en `.md`

- **Causa:** los antiguos `.txt` se retiraron al consolidar la documentación.
- **Solución:** el estado actual se lee en `INDEX.md`, `architecture/` y `tasks/`; `history/` y `roadmap/` guardan el contexto histórico.

### 5.2 `Info_Datos_Clima.md` dice `EXCESO`, el código dice `EXCESO_LLUVIA`

- **Causa:** el contrato se escribió antes de alinear el enum.
- **Solución:** el valor válido en código y en la API es `EXCESO_LLUVIA`. No cambiar el enum sin migración y sin actualizar el contrato.

### 5.3 `Info_Datos_CENTA.md` presenta las coordenadas como pendientes

- **Causa:** el contrato es anterior a 3-0b.
- **Solución:** las coordenadas ya existen en `Distrito.latitud`/`longitud` y en `data/referencia/coordenadas_distritos.csv`. El contrato no se edita sin acuerdo; la aclaración vive en `architecture/data.md`.

### 5.4 No editar `docs/data/Info_Datos_*.md` en una rama de código

- **Regla:** son contratos de datos. Si el código necesita un cambio, se propone y se aprueba; no se ajusta el contrato para que coincida con la implementación.

### 5.5 No stagear los CSV crudos

- **Regla:** los cambios de fin de línea en `backend/data/centa/raw/*.csv` no forman parte de ninguna tarea. `git restore` y seguir.

### 5.6 `docs/4-A-doc.txt` sigue en el repositorio

- **Causa:** la documentación de 4-A se entregó como `.txt` después de que el proyecto acordara que los `.md` son la única fuente viva.
- **Solución:** su contenido se integró en `history/branches/4-siembra.md`. El `.txt` queda pendiente de retirar (DOC5 en `tasks/pendiente.md`); no usarlo como fuente nueva.

---

## 6. Seguridad y dependencias

### 6.1 `npm audit` reporta vulnerabilidades

- **Estado:** al 28 de octubre de 2026, 9 en backend (3 moderadas, 6 altas); con `--omit=dev`, 4. En frontend, 18 (incluidas 2 críticas), en su mayoría de herramientas de desarrollo.
- **Regla:** **no** correr `npm audit fix` ni `--force`: mueve versiones fijadas (Prisma 7.10.0, TypeScript 5.9, Argon2). La revisión se hace en una rama aparte y con acuerdo del equipo.

### 6.2 El rate limit no es distribuido

- **Causa:** el limitador es un `Map` en memoria por proceso.
- **Solución:** sirve para un solo proceso y para frenar abuso simple. En producción con varias instancias hace falta un almacén compartido (Parte 7). No presentarlo como protección completa.

### 6.3 `EXPONER_TOKEN_VERIFICACION=true` es solo para desarrollo

- **Riesgo:** devuelve el token de verificación en la respuesta del registro.
- **Solución:** en producción debe estar en `false` (o ausente). El flujo real de correo sigue pendiente.

---

## 7. Datos y precios

### 7.1 Los precios F3 son del ciclo 2022-2023

- **Causa:** el informe más reciente que se consiguió del MAG es el de costos de producción 2022-2023, publicado el 21 de febrero de 2024.
- **Solución:** la fecha viaja en cada línea de la estimación. No presentar el total como cotización actual; actualizar `backend/src/estimacion/referencia.ts` cuando haya un informe más nuevo.

### 7.2 El riego de 4-C es un supuesto

- **Causa:** el informe del MAG solo trae cuota de agua para arroz bajo riego; no hay dato oficial para maíz, frijol ni maicillo.
- **Solución:** la línea de riego se marca `SUPUESTO` y lleva su nota. No cambiarla a `OFICIAL` sin una fuente para los tres cultivos.

### 7.3 El estimado no incluye costos indirectos ni transporte de cosecha

- **Causa:** 4-C cubre costos directos y alquiler; administración, imprevistos, intereses y transporte interno quedan fuera.
- **Solución:** no comparar el total de la estimación con el “costo total” del MAG como si fueran equivalentes. El detalle está en `data/Info_Datos_Precios.md`.
