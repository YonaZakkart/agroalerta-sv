# Bugs resueltos

Incidencias reales del proyecto, con **síntoma → causa → solución → cómo evitarlo**. Las trampas que siguen activas están en [`gotchas.md`](../gotchas.md); este archivo es el registro histórico.

---

## 1. Backend y base de datos

### 1.1 `Cannot find module './internal/class.js'` al arrancar

- **Dónde:** Parte 1, rama `feat/auth-registro-usuario`.
- **Síntoma:** `npm run dev` falla; la pila pasa por `src/generated/prisma/client.ts`.
- **Causa:** el generator usaba `moduleFormat = "cjs"` y generaba imports con `.js`, pero el archivo real es `.ts`. `ts-node` en CommonJS no traduce `.js` a `.ts`.
- **Solución:** agregar `importFileExtension = ""` al generator de `schema.prisma` y correr `npx prisma generate`.
- **Prevención:** no quitar esa línea. Como `src/generated/` no se versiona, cada integrante regenera el cliente después de un `pull` que toque el schema.

### 1.2 `P2039` / «pool timeout» con MySQL 8.4

- **Dónde:** Parte 1, 1-D y 1-END (`fix/prisma-mariadb-rsa-key`).
- **Síntoma:** cualquier consulta falla con `P2039 pool timeout (active=0 idle=0 limit=10)`; Prisma oculta la causa en `cause: [Object]`.
- **Causa real:** al conectar con el paquete `mariadb` directamente apareció `ER_CANNOT_RETRIEVE_RSA_KEY`. MySQL 8.4 usa `caching_sha2_password`; si la cuenta no está en la caché del servidor y no hay TLS, el cliente necesita la clave pública RSA, y el conector solo la pide con `allowPublicKeyRetrieval`.
- **Diagnóstico descartado:** no era incompatibilidad del adapter MariaDB, ni `mysql2://`, ni los secretos, ni `node_modules`.
- **Solución:** en `config/prisma.ts`, parsear `DATABASE_URL` y construir el adapter con `allowPublicKeyRetrieval = (NODE_ENV !== "production")`.
- **Prevención:** ante un `P2039`, probar primero la conexión con el driver directo. En producción, usar TLS hacia MySQL en lugar de esa opción.

### 1.3 El puerto 3306 lo ocupa otro MySQL (Windows)

- **Dónde:** 2-D y 2-END.
- **Síntoma:** `docker ps` muestra el contenedor con `3306/tcp` pero sin `0.0.0.0:3306->3306/tcp`; `docker compose exec … SHOW TABLES` no ve las tablas que el backend sí usa.
- **Causa:** un servicio MySQL local (MySQL80, MySQL96…) ocupa el puerto. Docker no puede publicarlo y Prisma habla con el MySQL de Windows.
- **Solución:** detener el servicio y dejarlo en inicio manual (`sc config <servicio> start= demand`), sin borrar datos. Después `docker compose down -v`, `up -d db`, migraciones y carga.
- **Prevención:** revisar `docker ps` y la cadena `DATABASE_URL` antes de tocar Prisma.

### 1.4 `P3014` al correr `prisma migrate dev`

- **Dónde:** 2-D.
- **Síntoma:** la migración falla por la shadow database.
- **Causa:** el contenedor se creó antes de `docker/mysql-init/grant-shadow.sql`; ese script solo corre al crear el volumen por primera vez.
- **Solución:** `docker compose down -v` y `up -d db`. Se pierden los datos locales; después se repiten migraciones y `datos:cargar`.

### 1.5 La migración de `distrito_id` falla con usuarios existentes

- **Dónde:** 2-END (`chore/2-end-usuario-distrito-catalogo`).
- **Síntoma:** no se puede convertir `usuarios.distrito` (texto) en `distrito_id` (FK obligatoria).
- **Causa:** MySQL no tiene DDL transaccional y la columna nueva es obligatoria; los usuarios existentes no tienen valor.
- **Solución:** reiniciar la base (`docker compose down -v`, `up -d db`) y repetir migraciones y carga. Los usuarios de prueba se registran de nuevo. Está advertido en el encabezado de la migración.
- **Prevención:** una migración destructiva se anuncia en el PR y en `gotchas.md`.

### 1.6 `npx prisma` desde la raíz descarga Prisma 8 RC

- **Dónde:** Parte 0.
- **Síntoma:** `migrate` no existe o se instala otra versión.
- **Causa:** el `package.json` de Prisma está en `backend/`; desde la raíz, `npx` descarga la última versión.
- **Solución:** correr `npm`/`npx` desde `backend/`. `docker compose` sí va desde la raíz.

### 1.7 Los CSV aparecen modificados sin cambios reales

- **Dónde:** 2-END y merges posteriores.
- **Síntoma:** `git status` marca `backend/data/centa/raw/*.csv` como modificados.
- **Causa:** `core.autocrlf=true` convierte CRLF a LF; `git diff --ignore-cr-at-eol` no muestra diferencias.
- **Solución:** `git restore` y **no stagearlos**. `.gitattributes` (PR #46) normaliza los archivos nuevos, pero los ya versionados pueden seguir mostrando ruido.

### 1.8 `npm install` falla con `Cannot read properties of null (reading 'edgesOut')`

- **Causa:** conflicto de dependencias de npm.
- **Solución:** `npm install --legacy-peer-deps`; si `node_modules` queda incompleto, `npm ci --legacy-peer-deps` y `npx prisma generate`.

### 1.9 Un id de 20 dígitos respondía 500 en viabilidad

- **Dónde:** 2-D, corregido tras el rechazo del PR.
- **Síntoma:** `GET /viabilidad/distritos/99999999999999999999` → 500.
- **Causa:** el id se convertía con `Number()` y desbordaba el rango seguro; Prisma recibía un número impreciso.
- **Solución:** `validarIdDistrito` exige `/^\d+$/`, entero seguro y mayor que cero. Ahora responde 400; `2147483648` responde 404 y `01304` responde 200.
- **Prevención:** no confiar en `Number(req.params.id)`; validar siempre.

### 1.10 El backend «arrancaba» con el puerto ocupado

- **Dónde:** 1-END y 2-D.
- **Síntoma:** imprimía «Backend corriendo en puerto 3000» sin estar escuchando; `curl /health` devolvía la respuesta de otro Express.
- **Causa:** en Express 5 el callback de `listen` se ejecuta también cuando el servidor emite `error`; el error no se manejaba y `EADDRINUSE` quedaba silencioso.
- **Solución:** manejar el evento `error` del servidor, con mensaje específico para `EADDRINUSE`, y salir con código 1.
- **Prevención:** un mensaje de arranque no es prueba de que el puerto esté escuchando.

### 1.11 `PORT` se interpretaba como socket Unix

- **Dónde:** `fix/correccion-pendientes-y-bugs`.
- **Síntoma:** `app.listen("3000")` creaba un archivo llamado `3000` en lugar de escuchar en TCP.
- **Causa:** `process.env.PORT` siempre es string y Node interpreta un string como ruta de socket.
- **Solución:** `config/puerto.ts` valida y convierte el puerto a entero (1–65535, vacío = 3000). El servidor SSR del frontend tenía el mismo defecto y se corrigió igual.

### 1.12 Rutas inexistentes y JSON mal formado devolvían HTML

- **Dónde:** `fix/correccion-pendientes-y-bugs`.
- **Síntoma:** el frontend no podía leer `{ error, detalles }`; recibía HTML de Express o de `body-parser`.
- **Causa:** se usaba el 404 por defecto y el manejador de errores de `body-parser`.
- **Solución:** `comun/http-errores.ts` con `rutaNoEncontrada` (404 JSON) y `manejarErrores` (400 para `entity.parse.failed`, 500 genérico para el resto), montados al final.

### 1.13 `distritoIds` vacío o inexistente terminaba en 500

- **Dónde:** `fix/correccion-pendientes-y-bugs`.
- **Síntoma:** `POST /clima/actualizar` con `{"distritoIds": []}` respondía 500; un id inexistente también.
- **Causa:** `[].every(...)` es `true`, la lista vacía llegaba a `obtenerClimaActual([])`; un id inexistente lanzaba `ErrorOpenMeteo(COORDENADA_INVALIDA)` y se mapeaba a 500.
- **Solución:** `distritos-solicitados.ts` valida el campo (lista no vacía de enteros positivos) y `puntos.ts` lanza `ErrorDistritosNoExisten`, que la ruta traduce a 400. Un distrito sin coordenadas sigue siendo 500: es un problema de datos del servidor.

### 1.14 `npm test` no ejecutaba nada

- **Dónde:** `fix/correccion-pendientes-y-bugs`.
- **Síntoma:** `npm test` devolvía «Error: no test specified» con código 1.
- **Causa:** seguía siendo el placeholder de npm.
- **Solución:** encadenar las suites sin red (`pruebas:config`, `pruebas:http`, `pruebas:http-seguridad`, `pruebas:eventos`, `pruebas:viabilidad`, clima y clasificación).

---

## 2. TypeScript y herramientas

### 2.1 TypeScript 7 rompe `ts-node-dev`

- **Causa:** TypeScript 7.0.2 (compilador nativo) es incompatible con `ts-node-dev` a la fecha.
- **Solución:** mantener `typescript` en `^5.9.0` en `backend/`. No actualizar sin probar `npm run dev`.

### 2.2 `node` es alias de `winpty` en Git Bash

- **Síntoma:** dentro de `$(...)` o de un pipe, `node` no devuelve nada y las variables quedan vacías.
- **Solución:** usar `node.exe` en esos comandos.

### 2.3 `JWT_EXPIRES_IN` vacío no usaba el valor por defecto

- **Causa:** `??` no cubre la cadena vacía.
- **Solución:** `process.env.JWT_EXPIRES_IN?.trim()` y caer en `"2h"` si queda vacío. Se mantiene ese patrón y se valida el formato al arrancar.

### 2.4 El cliente Prisma queda desactualizado tras un `pull`

- **Síntoma:** TypeScript dice que `usuario`, `latitud`, `tokenVerificacion` o `condicion` no existen.
- **Causa:** `src/generated/` no se versiona y el schema cambió en otra rama.
- **Solución:** `npx prisma generate` y reiniciar el servidor de TypeScript del editor. Es la incidencia más repetida del proyecto.

---

## 3. Frontend

### 3.1 `NG0203: takeUntilDestroyed() can only be used within an injection context`

- **Dónde:** `fix/ng0203-takeuntil-destroyed` (PR #50).
- **Síntoma:** la app falla al entrar a `/dashboard`, `/clima-zonal`, login o registro.
- **Causa:** `takeUntilDestroyed()` se llamaba dentro de un método (no en el constructor) sin pasar un `DestroyRef`. En Angular 22 eso ya no está permitido.
- **Solución:** inyectar `DestroyRef` y llamar `takeUntilDestroyed(this.destroyRef)` en los métodos de `Shell`, `ClimaZonal`, `Dashboard`, `Login` y `Registro`.
- **Prevención:** si el método puede ejecutarse después del constructor, pasar siempre el `DestroyRef`.

### 3.2 El token se enviaba a orígenes externos

- **Dónde:** `fix/correccion-pendientes-y-bugs`.
- **Síntoma:** el interceptor agregaba `Authorization` a cualquier petición, incluidas las externas y los assets.
- **Causa:** no se filtraba por URL.
- **Solución:** clonar la petición solo si la URL es `API_URL` o empieza por `API_URL/`.
- **Prevención:** no ampliar ese filtro sin revisar la seguridad.

### 3.3 La sesión seguía «activa» con un token vencido

- **Dónde:** PR #45.
- **Síntoma:** el guard dejaba entrar y la primera petición devolvía 401.
- **Causa:** el token seguía en `sessionStorage` después de expirar.
- **Solución:** `tokenVigente()` lee `exp` del JWT; `AuthService` descarta tokens vencidos al construirse y el `authGuard` usa `autenticado` (computed), no solo la existencia del token.

### 3.4 Después de un 401 se veía el distrito del usuario anterior

- **Dónde:** `fix/correccion-pendientes-y-bugs`.
- **Síntoma:** al cerrar sesión por token inválido, el dashboard mostraba datos del perfil anterior hasta recargar.
- **Causa:** el interceptor cerraba la sesión pero no limpiaba `PerfilService`.
- **Solución:** el interceptor llama `perfil.limpiar()` antes de navegar a `/login`. Un 401 en login o registro no limpia nada.
- **Prevención:** cualquier estado global de sesión debe limpiarse ahí también.

### 3.5 El dashboard mostraba datos obsoletos al cambiar de distrito o cultivo

- **Dónde:** PR #45.
- **Síntoma:** durante la carga se veía la viabilidad del distrito anterior.
- **Causa:** no se limpiaba el estado antes de la nueva petición.
- **Solución:** el `tap` previo al `switchMap` pone `datos` en `null` y `cargando` en `true`. El `switchMap` descarta respuestas viejas. Mantener ese orden.

### 3.6 `sessionStorage` no está disponible en SSR

- **Síntoma:** error al renderizar en el servidor.
- **Causa:** el token vive en `sessionStorage`, que no existe en Node.
- **Solución:** todas las rutas usan `RenderMode.Client`. No cambiar a prerender sin rediseñar la sesión.

### 3.7 El frontend no llegaba al backend en desarrollo

- **Síntoma:** 404 en `/api/...` desde `ng serve`.
- **Causa:** falta el proxy o el backend no está en el puerto 3000.
- **Solución:** `proxy.conf.json` reenvía `/api` a `http://localhost:3000`. En producción se reemplaza por CORS o por un proxy inverso.

### 3.8 El clima muestra «Sin evaluar» y parece un error

- **Causa:** `condicion` es `null` fuera de la época evaluable o cuando no hay días completos.
- **Solución:** es un estado válido. La interfaz lo muestra como «Sin evaluar» o «Fuera de la época lluviosa». No convertirlo a `0` ni a «sin datos» genérico.

### 3.9 El bloque «Formularios compartidos» estaba duplicado

- **Dónde:** 6-A, corregido en `fix/6-a-styles-duplicado`.
- **Síntoma:** dos copias idénticas del bloque en `styles.css` (unas 70 líneas).
- **Causa:** se agregó el bloque dos veces al editar el archivo compartido.
- **Solución:** eliminar la segunda copia. Se verificó con `grep` de los selectores, `git diff --stat` con solo eliminaciones y `ng build` sin cambios visuales.

### 3.10 El dashboard se quedaba en «Cargando viabilidad…»

- **Dónde:** `fix/correccion-pendientes-y-bugs`.
- **Síntoma:** si `/auth/yo` fallaba, el perfil quedaba `null`, el dashboard no tenía distrito y no ofrecía reintento.
- **Causa:** el error se manejaba en el shell pero no en el dashboard.
- **Solución:** `PerfilService` expone la señal `error`; el dashboard muestra una alerta con botón Reintentar que vuelve a llamar a `cargar()` y dispara la consulta de viabilidad.

---

## 4. Clima y Open-Meteo

### 4.1 No se emite `ActualizacionMeteorologica` aunque la consulta fue bien

- **Causa:** el último día completo no tiene precipitación (`null`). El contrato exige `precipitacionMm: number`.
- **Solución:** es intencional. Cambiar el contrato a `number | null` requiere acuerdo y tocar `events/types.ts`, `orquestador.ts` y los listeners.

### 4.2 El job no actualiza al arrancar

- **Causa:** la primera ejecución ocurre después del primer intervalo, para que el arranque no dependa de Open-Meteo.
- **Solución:** usar `POST /clima/actualizar` para forzar una actualización o esperar el intervalo. El job se desactiva con `CLIMA_JOB_ACTIVO=false`.

### 4.3 Un 429 de Open-Meteo se repetía en cada ciclo

- **Causa:** el límite es por hora; reintentar al siguiente intervalo vuelve a fallar.
- **Solución:** el job pausa dos ciclos ante un 429 (`esperaTrasError`). No reducir la pausa sin revisar el límite.

### 4.4 El generador de normales se detuvo con 429

- **Dónde:** 3-A.
- **Síntoma:** el primer intento guardó 12 de 26 distritos y Open-Meteo respondió 429.
- **Causa:** 12 peticiones de 20 años en menos de un minuto.
- **Solución:** pausa de 8 s entre peticiones y reintento con espera de 65 s (hasta 3 veces); si persiste, se detiene y conserva lo guardado. La segunda corrida completó los 14 restantes.

### 4.5 Los umbrales parecen arbitrarios

- **Causa:** varios son **SUPUESTOS** declarados en `Info_Datos_Clima.md`.
- **Solución:** todos viven en `clima/umbrales.ts`, con su tipo y su sección. No poner valores sueltos en las funciones. Confirmarlos antes de presentarlos como oficiales.

### 4.6 Falsos positivos de sequía en octubre–noviembre

- **Causa:** la lluvia de 30 días cae de forma natural en la transición de lluviosa a seca.
- **Solución:** el margen anti-oscilación (0.05) y la época evaluable (01-05 a 15-11) reducen el riesgo, pero el equipo debe revisar los resultados en esa ventana. Sigue como pendiente.

### 4.7 `P1012` al editar `schema.prisma`

- **Dónde:** 3-B.
- **Síntoma:** `prisma validate`, `migrate dev` y `generate` fallan con «This line is not a valid field or attribute definition».
- **Causa:** la relación inversa quedó en la misma línea que otro campo; Prisma exige un campo por línea.
- **Solución:** separar en dos líneas. Los tres comandos pasaron.

### 4.8 El clasificador no imprimía nada

- **Dónde:** 3-B.
- **Síntoma:** `npm run clima:clasificar` terminaba sin salida.
- **Causa:** el archivo no se había guardado completo en el editor.
- **Solución:** guardar y repetir. Esas corridas no escribieron en la base.

---

## 5. Proceso y documentación

### 5.1 Los `.txt` no son la verdad actual

- **Causa:** `Estado_del_Proyecto.txt` se cerró con la Parte 2 y `Estado_Proyecto_Pt2.txt` con la Parte 3 y el Hito 1. Después se mergearon 6-D, el pulido responsive y el fix de `takeUntilDestroyed`.
- **Solución:** para el estado actual, leer los `.md` de `architecture/` y `tasks/`; los `.txt` son historia.

### 5.2 `Info_Datos_Clima.md` dice `EXCESO`, el código dice `EXCESO_LLUVIA`

- **Causa:** el contrato se escribió antes de alinear el enum.
- **Solución:** el valor válido en código y API es `EXCESO_LLUVIA`. No cambiar el enum sin migración y sin actualizar el contrato.

### 5.3 `Info_Datos_CENTA.md` presenta las coordenadas como pendientes

- **Causa:** el contrato es anterior a 3-0b.
- **Solución:** las coordenadas ya existen en `Distrito.latitud`/`longitud` y en `data/referencia/coordenadas_distritos.csv`. El contrato no se edita sin acuerdo; la aclaración vive en `architecture/data.md`.

### 5.4 No stagear los CSV crudos

- **Regla:** los cambios de fin de línea en `backend/data/centa/raw/*.csv` no forman parte de ninguna tarea. `git restore` y seguir.

### 5.5 `npm audit` reporta vulnerabilidades

- **Estado:** al 28 de octubre de 2026, 9 en backend (3 moderadas, 6 altas); con `--omit=dev`, 4. En frontend, 18 (incluidas 2 críticas), en su mayoría de herramientas de desarrollo.
- **Regla:** **no** correr `npm audit fix` ni `--force`: mueve versiones fijadas (Prisma 7.10.0, TypeScript 5.9, Argon2). La revisión se hace en una rama aparte y con acuerdo del equipo.

---

## 6. Tabla resumen

| # | Bug | Área | Dónde se corrigió |
|---|---|---|---|
| 1.1 | `./internal/class.js` | Prisma | 1-A |
| 1.2 | `P2039` / RSA | Prisma/MySQL | 1-END |
| 1.3 | Puerto 3306 ocupado | Entorno | 2-D |
| 1.4 | `P3014` shadow DB | Prisma | 2-D |
| 1.5 | Migración `distrito_id` | Base de datos | 2-END |
| 1.6 | Prisma 8 RC desde la raíz | Entorno | Parte 0 |
| 1.7 | CSV con CRLF | Git | 2-END / #46 |
| 1.8 | `edgesOut` en `npm install` | Dependencias | Parte 0 |
| 1.9 | Id de 20 dígitos → 500 | Viabilidad | Fix de 2-D |
| 1.10 | Puerto ocupado silencioso | Express | 1-END / 2-D |
| 1.11 | `PORT` como socket | Backend/SSR | Cierre 3 |
| 1.12 | HTML en 404/400 | HTTP | Cierre 3 |
| 1.13 | `distritoIds` inválido → 500 | Clima | Cierre 3 |
| 1.14 | `npm test` placeholder | Pruebas | Cierre 3 |
| 2.1 | TypeScript 7 | Herramientas | Parte 0 |
| 2.2 | `node` = `winpty` | Git Bash | Parte 0 |
| 2.3 | `JWT_EXPIRES_IN` vacío | Auth | 1-END |
| 2.4 | Cliente Prisma viejo | Prisma | Varias |
| 3.1 | `NG0203` | Angular | #50 |
| 3.2 | Token a orígenes externos | Seguridad | Cierre 3 |
| 3.3 | Token vencido activo | Sesión | #45 |
| 3.4 | Perfil anterior tras 401 | Sesión | Cierre 3 |
| 3.5 | Datos obsoletos | Dashboard | #45 |
| 3.6 | `sessionStorage` en SSR | SSR | 6-A |
| 3.7 | `/api` sin proxy | Desarrollo | 6-A |
| 3.8 | «Sin evaluar» como error | Clima UI | 6-D |
| 3.9 | CSS duplicado | Estilos | `fix/6-a-styles-duplicado` |
| 3.10 | Dashboard colgado sin perfil | Dashboard | Cierre 3 |
| 4.1 | Evento omitido con lluvia `null` | Clima | 3-C |
| 4.2 | Job no corre al arrancar | Clima | 3-D |
| 4.3 | 429 repetido | Clima | #44 |
| 4.4 | 429 al generar normales | Clima | 3-A |
| 4.5 | Umbrales sin fuente | Clima | 3-B (documentado) |
| 4.6 | Falsos positivos de sequía | Clima | Pendiente |
| 4.7 | `P1012` en el schema | Prisma | 3-B |
| 4.8 | Clasificador sin salida | Herramientas | 3-B |
| 5.x | Documentación desalineada | Docs | Esta reorganización |
