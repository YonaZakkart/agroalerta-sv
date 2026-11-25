# Arquitectura del backend

API REST en Node.js + Express + TypeScript, con Prisma 7 sobre MySQL 8.4 y un bus de eventos en proceso (`EventEmitter`). El backend es el único que habla con la base y con Open-Meteo.

---

## 1. Composición

```
index.ts
├── validarEntorno()             falla al arrancar si faltan secretos
├── cabecerasSeguridad
├── crearCors(CORS_ORIGINS)
├── express.json({ limit: "100kb" })
├── limitadores por IP
├── /health/live
├── /health                      verifica MySQL (503 si no responde)
├── /auth                        registro, login, perfil
├── /viabilidad                  consulta CENTA
├── /distritos                   catálogo público
├── /clima                       condición guardada y actualización
├── /siembras                    registro y listado del usuario
├── listeners de estimación      5-A: reaccionan a siembra y clima
├── rutaNoEncontrada
└── manejarErrores
```

El servidor escucha en `PORT` (3000 por defecto), inicia el job de clima y maneja el cierre ordenado.

---

## 2. Módulos

### 2.1 `config/`

| Archivo | Responsabilidad |
|---|---|
| `entorno.ts` | Valida `JWT_SECRET` (≥ 32) y `DUI_PEPPER` (≥ 32) al arrancar. |
| `puerto.ts` | Interpreta `PORT` como entero TCP; rechaza valores inválidos. |
| `prisma.ts` | Crea el cliente Prisma con `@prisma/adapter-mariadb`, parsea `DATABASE_URL` y activa `allowPublicKeyRetrieval` fuera de producción. |

### 2.2 `comun/`

| Archivo | Responsabilidad |
|---|---|
| `normalizar.ts` | `colapsarEspacios` y `normalizarNombre`: sin tildes, sin mayúsculas, espacios colapsados. Única normalización del proyecto. |
| `http-errores.ts` | 404 JSON para rutas inexistentes y manejador final de errores (incluye JSON mal formado). |
| `http-seguridad.ts` | Cabeceras (`nosniff`, `DENY`, `no-referrer`, `same-site`), CORS opt-in y límite de cuerpo. |
| `rate-limit.ts` | Ventana fija en memoria por IP, con cabeceras `RateLimit-*` y `Retry-After`. |
| `salud.ts` | `/health` con `SELECT 1` y timeout de 2 s. |
| `cierre.ts` | Detiene el job, cierra el servidor y desconecta Prisma ante `SIGTERM`/`SIGINT`. |

### 2.3 `auth/`

Flujo:

```
POST /auth/registro
  valida → normaliza → hash Argon2id + HMAC DUI → valida distrito contra catálogo
  → crea usuario (verificado=false, token de verificación)
  → emite AgricultorRegistrado
  → 201 (tokenVerificacion_DEV solo si EXPONER_TOKEN_VERIFICACION=true)

GET /auth/verificar/:token
  valida formato (64 hex) → busca token vigente → marca verificado
  → 200; token usado o inexistente → 404

POST /auth/login
  valida → busca por correo → verifica Argon2 (hash ficticio si no existe)
  → 401 si credenciales malas
  → 403 si la cuenta no está verificada (después de validar la contraseña)
  → firma JWT HS256 → 200 { token, usuario }

GET /auth/yo (requireAuth)
  → busca el usuario por sub → 200 { success, usuario }
```

- `jwt.ts`: firma y verifica; exige `JWT_SECRET`; usa `sub` y `correo`.
- `auth.middleware.ts`: `requireAuth`, distingue token expirado de inválido.
- `distrito.select.ts`: select compartido `{ id, nombre, municipio: { id, nombre } }`.

### 2.4 `viabilidad/`

- `service.ts`: `consultarViabilidad(id, { capa?, cultivo? })`.
  - 404 si el distrito no existe.
  - 400 si se pasan `capa` y `cultivo` a la vez.
  - 404 si la capa o el cultivo no existen.
  - Filtra por capa o por cultivo; el riesgo de sequía se incluye siempre al filtrar por cultivo.
  - Suma áreas en milésimas de hectárea y redondea al final.
  - Convierte a manzanas con `HA_POR_MANZANA = 0.7`.
- `origen.ts`: toma fuente y fecha de la misma extracción.
- `distritos.routes.ts`: `GET /distritos` público, ordenado por `nombreNormalizado`.
- `datos/`: scripts de limpieza y carga; `capas.config.ts` define las cuatro capas.

### 2.5 `clima/`

Pipeline:

```
puntos.ts            coordenadas de los distritos (latitud/longitud)
      ↓
open-meteo.client    pronóstico (30 días pasados + hoy) e histórico (normal)
      ↓
clima-actual.ts      serie diaria por distrito + normal de 30 días
      ↓
resumen-lluvia.ts    acumulado, razón y días secos consecutivos
      ↓
clasificacion.ts     SEQUIA / EXCESO_LLUVIA / INVIERNO_ACEPTABLE / null
      ↓
condicion.repo.ts    guarda CondicionDistrito
      ↓
orquestador.ts       emite ActualizacionMeteorologica y CondicionClimaticaActualizada
```

- `config.ts`: URLs, timeouts, ventanas, modelo `era5` y atribución CC BY 4.0.
- `normales.ts` / `normales-archivo.ts`: normal de 30 días por distrito; el archivo tiene 365 claves por distrito.
- `umbrales.ts`: todos los valores, con tipo y sección del contrato.
- `condicion.dto.ts`: contrato de salida y validación de id.
- `errores.ts` / `errores-http.ts`: `ErrorOpenMeteo` y mapeo a 400/429/502.
- `distritos-solicitados.ts`: valida `distritoIds` (array, enteros positivos, sin duplicados, máximo permitido).
- `job.ts`: `setInterval` con mínimo de 1 hora; pausa dos ciclos ante 429; no reemplaza el último dato bueno.
- `clima.routes.ts`:
  - `GET /clima/distritos/:id` (requireAuth): condición guardada + distrito + atribución.
  - `POST /clima/actualizar` (requireAuth): fuerza la actualización; acepta `distritoIds` opcional.

### 2.6 `events/`

- `bus.ts`: `new EventEmitter()`.
- `emitir.ts`: `emitirSeguro`, captura el error de un listener y continúa.
- `types.ts`: nombres y payloads. Es un archivo compartido: una persona, solo agregar.

Eventos actuales:

| Evento | Cuándo | Payload |
|---|---|---|
| `AgricultorRegistrado` | Al crear un usuario | `usuarioId`, `correo`, `distrito`, `distritoId`, `fechaRegistro` |
| `ActualizacionMeteorologica` | En cada consulta con lluvia del último día completo | `distritoId`, `fecha`, `precipitacionMm`, `fuente` |
| `CondicionClimaticaActualizada` | Solo cuando cambia la condición evaluada | `distritoId`, `condicion`, `condicionAnterior`, `precipitacionAcumuladaMm`, `fecha` |
| `SiembraRegistrada` | Al guardar una siembra (4-D) | `siembraId`, `usuarioId`, `distritoId`, `cultivo`, `areaMz`, `fecha` |

**Listeners de 5-A:** `SiembraRegistrada` dispara `recalcularSiembra(siembraId)` y `CondicionClimaticaActualizada` dispara `recalcularDistrito(distritoId)`. Son fire-and-forget: el evento no espera el cálculo. Cada listener captura errores síncronos y rechazos asíncronos; `emitirSeguro` no captura estos últimos.

### 2.7 `siembra/` y `estimacion/`

- `siembra/` contiene los endpoints de 4-D:
  - `siembra.validacion.ts`: validación pura del cuerpo de `POST /siembras`, con el contrato `{ error, detalles }`.
  - `siembra.dto.ts`: mapeo de `Decimal` y fechas al contrato público; no filtra tipos de Prisma.
  - `siembra.service.ts`: comprueba el distrito, persiste, emite `SiembraRegistrada` con `emitirSeguro` y lista solo las siembras del dueño.
  - `siembra.routes.ts`: `crearSiembraRouter(deps)` para probar el contrato HTTP sin MySQL, más el router real montado en `/siembras`.
  - `siembra.pruebas.ts` y `siembra.routes.pruebas.ts`: pruebas sin red ni base.
- `estimacion/` contiene la estimación de costos de 4-C y los listeners de 5-A:
  - `referencia.ts`: tabla F3 con precios, dosis, fuente, fecha y tipo (`OFICIAL` / `SUPUESTO`). Es la única fuente de valores.
  - `estimar-costos.ts`: función pura `estimarCostos(cultivo, areaMz, opciones)`. Redondea hacia arriba las unidades compradas (lb, QQ, jornal) y prorratea los servicios por manzana.
  - `listeners.ts`: fábrica pura de listeners y registro en un bus inyectable; captura errores síncronos y rechazos asíncronos.
  - `recalculo.ts`: arma `ContextoEstimacion` (siembra + condición guardada) y procesa solo el distrito afectado. `solicitarCalculo` usa la proyección de 5-B.
  - `proyeccion.ts`: función pura `proyectarEstimacion(contexto)` con F1/F4 del MAG 2022-2023 y factores climáticos declarados. Devuelve rendimiento, producción, ingreso y `supuestos`.
  - `registro.ts`: une el bus real con `recalcularSiembra` y `recalcularDistrito`; se llama una vez al arrancar.
  - `index.ts`: API pública del módulo.
  - `estimar-costos.pruebas.ts`, `listeners.pruebas.ts`, `recalculo.pruebas.ts` y `proyeccion.pruebas.ts`: pruebas sin red ni base de datos.
- No hay endpoint de estimación todavía: 4-C se consume desde código (5-B) o desde una integración posterior.

---

## 3. Ciclo de una petición

1. Llega a Express; pasan las cabeceras de seguridad, CORS, el parser JSON y el limitador si aplica.
2. El router valida la entrada.
3. Si la ruta está protegida, `requireAuth` verifica el JWT y deja `req.usuario`.
4. El servicio consulta Prisma o la API externa.
5. La ruta responde con el contrato correspondiente.
6. Cualquier error no controlado cae en `manejarErrores`, se registra y devuelve `{ error: "Error interno del servidor" }` con 500.

---

## 4. Configuración

Variables principales (ver `.env.example` y `architecture/api.md`):

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión MySQL. |
| `DUI_PEPPER` | Sí (≥ 32) | HMAC del DUI. |
| `JWT_SECRET` | Sí (≥ 32) | Firma del JWT. |
| `JWT_EXPIRES_IN` | No | Expiración; por defecto `2h`. |
| `PORT` | No | Puerto HTTP; por defecto 3000. |
| `CORS_ORIGINS` | No | Lista separada por comas; vacío = sin CORS. |
| `EXPONER_TOKEN_VERIFICACION` | No | `true` solo en desarrollo. |
| `CLIMA_JOB_ACTIVO` | No | `false` desactiva el job. |
| `CLIMA_JOB_INTERVALO_MS` | No | Intervalo del job; mínimo 1 hora. |
| `NODE_ENV` | No | `production` desactiva `allowPublicKeyRetrieval`. |

---

## 5. Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | `ts-node-dev --respawn src/index.ts`. |
| `npm run build` | Compila a `dist/`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm start` | Ejecuta `dist/index.js`. |
| `npm test` | Encadena las 24 pruebas sin red. |
| `npm run db:generate` | `prisma generate`. |
| `npm run db:migrate` | `prisma migrate dev`. |
| `npm run db:studio` | `prisma studio`. |
| `npm run datos:limpiar` | Valida los CSV crudos y genera los limpios. |
| `npm run datos:cargar` | Carga idempotente en MySQL. |
| `npm run clima:normales` | Regenera `normales_lluvia_30d.json`. |
| `npm run clima:probar` | Prueba manual contra Open-Meteo. |
| `npm run clima:clasificar` | Clasifica los distritos y muestra el resultado. |
| `npm run pruebas:estimacion` | Pruebas de la estimación de costos (4-C), sin red ni base. |
| `npm run pruebas:siembra` | Validación, DTO y servicio de siembra (4-D), sin red ni base. |
| `npm run pruebas:siembra-http` | Contrato HTTP de `/siembras` con servicios falsos y token firmado. |
| `npm run pruebas:listeners` | Listeners de 5-A y recálculo por siembra/distrito, sin red ni base. |
| `npm run pruebas:proyeccion` | Proyección de rendimiento e ingresos (5-B), sin red ni base. |

---

## 6. Pruebas

- 24 archivos `*.pruebas.ts` / `*.prueba.ts`.
- Se ejecutan con `ts-node-dev --transpile-only`, sin red ni MySQL.
- Cubren: puerto y entorno, errores HTTP, seguridad, rate limit, salud, cierre, emisión de eventos, origen de viabilidad, validación de distritos, DTO de condición, job, mapeo de errores, normales, cliente de clima, clasificación, cambio de condición, estimación de costos, siembra (validación, servicio y contrato HTTP) listeners de estimación (eventos y recálculo) y proyección de rendimiento e ingresos.
- El orquestador tiene una prueba de integración con dobles (`orquestador.prueba.ts`).

---

## 7. Decisiones y límites conocidos

- El bus es en proceso: sin persistencia ni reintentos.
- El rate limit es por proceso: no es distribuido.
- El job no corre al arrancar: espera el primer intervalo.
- La condición puede ser `null` fuera de época.
- No hay envío real de correo.
- El DUI no valida dígito verificador.
- La autenticación no revoca tokens.
- La estimación de costos usa precios del ciclo 2022-2023 y no incluye costos indirectos ni transporte de cosecha.
- No hay endpoint de estimación todavía: 4-C es una función pura.
- `GET /siembras` no pagina: devuelve todas las siembras del usuario.
- La suma del desglose de una siembra puede superar `inversionTotalUsd` (decisión MVP).
- 5-B proyecta rendimiento e ingreso con datos del MAG 2022-2023 y factores climáticos supuestos; no persiste ni calcula costos.
- Los listeners de 5-A no persisten resultados y son fire-and-forget; si el proceso se reinicia, el evento en vuelo se pierde.
- El backend no sirve el frontend; en desarrollo se usa el proxy de Angular.

Ver `adr/` y `gotchas.md` para el detalle.
