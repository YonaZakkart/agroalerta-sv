# Historia — Parte 1: autenticación y modelo de Usuario

- **Periodo:** 23 de septiembre a 3 de octubre de 2026
- **Fuente:** `docs/Estado_del_Proyecto.txt`, sección «Parte 1»
- **Estado:** ✅ cerrada (backend). Los guards del frontend llegaron en la Parte 6.

## Resumen

| Punto | Rama | Responsable | Resultado |
|---|---|---|---|
| 1-A | `feat/auth-registro-usuario` | Yona | Modelo `Usuario`, registro, Argon2id y HMAC del DUI |
| 1-B | `feat/1-b-login-auth-guards` | Smith | Login, JWT HS256 y `requireAuth` |
| 1-C | `feat/1-c-verificacion-correo` | Requeno | Token de verificación de un solo uso |
| 1-C fix | `fix/1-c-endurecer-verificacion` | Yona | Hash del token, reenvío y flag opt-in |
| 1-D | `feature/parte-1d-perfil-usuario` | Pocho | `GET /auth/yo` |
| 1-END | `fix/prisma-mariadb-rsa-key` | Yona | Causa del P2039, contrato de error y verificación |

---

## 1-A — Registro y modelo de Usuario

**Rama:** `feat/auth-registro-usuario` · **Responsable:** Yona · **23 de septiembre de 2026**

Se agregó el modelo `Usuario` al final de `schema.prisma` y la migración `add_usuarios`:

- `id`, `nombres`, `apellidos`, `correo` único, `contrasena_hash`, `dui_hash` único, `distrito`, `verificado`, `fecha_registro`.
- Contraseña con **Argon2id** (`argon2@0.45.1`), entre 8 y 128 caracteres.
- DUI con **HMAC-SHA256** y `DUI_PEPPER`, guardado como 64 caracteres hexadecimales. La justificación está en [`adr/1-A.md`](../../adr/1-A.md): un hash con sal no permite buscar duplicados.
- `POST /auth/registro` con los campos `nombres`, `apellidos`, `correo`, `contrasena`, `dui`, `distrito`. Respuestas 201, 400, 409 y 500, sin devolver hashes.
- Lógica en `registro.service.ts` y validación en `registro.routes.ts`.
- Bus de eventos: `events/bus.ts` y `events/types.ts` con `AgricultorRegistrado`.
- `.env.example` versionado y `importFileExtension = ""` en el generator.

**Cambio respecto al mapa:** el campo se llamó `distrito` y no `municipio`. Morazán tiene 2 municipios y 26 distritos; la unidad útil para viabilidad y clima es el distrito. La validación contra el catálogo quedó pendiente hasta 2-END.

**Incidencias:** cliente Prisma desactualizado tras cambiar el schema (solución: `npx prisma generate` y reiniciar el servidor de TypeScript) y el error de `importFileExtension`.

---

## 1-B — Login, JWT y middleware

**Rama:** `feat/1-b-login-auth-guards` · **Responsable:** Smith · **27 de septiembre de 2026**

- `auth/jwt.ts`: firma y verificación **HS256** con `sub` y `correo`; expiración `JWT_EXPIRES_IN` (por defecto `2h`); exige `JWT_SECRET` de al menos 32 caracteres.
- `auth/auth.middleware.ts`: `requireAuth` extrae `Authorization: Bearer <token>` y deja `req.usuario`. Distingue token expirado de inválido.
- `auth/login.routes.ts`: `POST /auth/login` con `argon2.verify`.
  - 401 uniforme para correo inexistente o contraseña incorrecta.
  - Hash ficticio cuando el correo no existe, para igualar tiempos.
  - **403 solo después** de validar la contraseña si la cuenta no está verificada. Esto resolvió el pendiente de 1-C: un usuario sin verificar no puede entrar.
- `index.ts`: montaje del router y `dotenv/config`.

**Decisión:** sesión **stateless**, sin consultar la base en cada petición. El costo es que no hay revocación inmediata; se aceptó por el plazo y la expiración corta. Ver [`adr/1-B.md`](../../adr/1-B.md).

**Pendiente que dejó:** los guards de Angular. El nombre `requireAuth` es contrato compartido.

---

## 1-C — Verificación de correo (simulada)

**Rama:** `feat/1-c-verificacion-correo` · **Responsable:** Requeno

- Campos `tokenVerificacion` y `tokenVerificacionExpira`; migración `add_verificacion_correo`.
- Token de 32 bytes (64 hex) con expiración de 24 h, generado en `registro.service.ts`.
- `GET /auth/verificar/:token` marca `verificado = true` y consume el token.
- El registro devolvía `tokenVerificacion_DEV` **siempre**, como simulación.
- Se agregó `allowScripts` a `package.json` sin cambiar versiones.

**Qué faltaba:** el token se guardaba en claro, no había forma de pedir uno nuevo y el flag de desarrollo no era opt-in.

### Corrección — `fix/1-c-endurecer-verificacion`

**Responsable:** Yona · **27 de septiembre de 2026**

- El token se guarda como **SHA-256**; el valor crudo solo existe en memoria. Un volcado de la base ya no permite verificar cuentas.
- `verificarUsuario` consume el token con `updateMany` y comprueba `count`, para que dos peticiones simultáneas no lo usen dos veces.
- Nuevo `POST /auth/reenviar-verificacion`, con respuesta genérica exista o no el correo.
- `EXPONER_TOKEN_VERIFICACION=true` pasa a ser **opt-in**; sin el flag, el registro vuelve al contrato de 1-A.
- Se eliminó la rama 409 inalcanzable y la validación por longitud se cambió por `/^[a-f0-9]{64}$/`.

**Prueba destacada:** la expiración (410) se forzó con un `UPDATE` en MySQL; después de reenviar, el token viejo daba 404 y el nuevo 200.

---

## 1-D — Perfil del agricultor

**Rama:** `feature/parte-1d-perfil-usuario` · **Responsable:** Pocho · **3 de octubre de 2026**

- `auth/perfil.routes.ts` con `GET /auth/yo`, protegido por `requireAuth`.
- `select` explícito sin `contrasenaHash` ni `duiHash`.
- Respuesta `{ success: true, usuario }`; 401 sin usuario en el token; 404 si el usuario ya no existe; 500 genérico.
- Se mergeó **sin verificación funcional** por el error P2039.

**Observaciones de la revisión:** el 500 devolvía `error.message`, el contrato de error era inconsistente entre routers y la indentación estaba rota. Se corrigieron en 1-END.

---

## 1-END — Cierre y verificación

**Rama:** `fix/prisma-mariadb-rsa-key` · **Responsable:** Yona · **3 de octubre de 2026**

### Causa real del P2039

El síntoma era un «pool timeout» sin causa visible. Al conectar con el paquete `mariadb` directamente apareció el error real: `ER_CANNOT_RETRIEVE_RSA_KEY`.

MySQL 8.4 usa `caching_sha2_password`. Cuando la cuenta no está en la caché del servidor (volumen nuevo o reinicio), exige autenticación completa y, sin TLS, el cliente necesita la clave pública RSA. El conector MariaDB solo la pide con `allowPublicKeyRetrieval`. Sin esa opción el pool reintenta en silencio hasta el timeout.

Solución en `config/prisma.ts`: parsear `DATABASE_URL` y construir el adapter con `allowPublicKeyRetrieval = (NODE_ENV !== "production")`.

### Otros cambios

- `index.ts` valida `JWT_SECRET` y `DUI_PEPPER` al arrancar y maneja el error de `listen` (puerto ocupado).
- Contrato único de error `{ error, detalles }` en todo `/auth`; se eliminaron `{ mensaje }` y `{ errores }`.
- `GET /auth/yo` responde **401** (no 404) cuando el usuario del token ya no existe.
- `perfil.routes.ts` reescrito; el 500 ya no filtra `error.message`.
- `.env.example` con secretos vacíos: es preferible que el servidor no arranque a que arranque con un secreto público.

### Verificación funcional

Se completó el flujo registro → verificación → login → `/auth/yo` sobre `main`, y se repitió en un clon limpio con el volumen recreado. Sin P2039.

**Incidencias:** puerto 3000 ocupado por un contenedor ajeno (el backend «arrancaba» sin escuchar), `jsonwebtoken` ausente en `node_modules` (se resolvió con `npm ci --legacy-peer-deps`) y `JWT_SECRET` inválido en el `.env` local.

---

## Estado al cerrar la Parte 1

- Registro, verificación simulada, login, JWT, `requireAuth` y perfil funcionando.
- Contrato de error unificado.
- Sin envío real de correo, sin rate limiting, sin CORS y sin guards de Angular.
- El DUI no valida dígito verificador.
- La sesión no se puede revocar.

Todo eso quedó registrado en `tasks/pendiente.md` y en [`gotchas.md`](../../gotchas.md).
