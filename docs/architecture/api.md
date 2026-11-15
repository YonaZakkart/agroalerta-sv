# API del backend

Contrato HTTP real al 14 de noviembre de 2026. Todas las rutas devuelven JSON. El sobre de error es siempre:

```json
{ "error": "…", "detalles": "… o [ … ]" }
```

`detalles` puede ser un string o un array de strings. El frontend acepta ambos.

---

## 1. Resumen

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health/live` | No | El proceso responde. |
| GET | `/health` | No | Comprueba MySQL; 503 si no responde. |
| POST | `/auth/registro` | No | Crea un usuario. |
| GET | `/auth/verificar/:token` | No | Verifica el correo. |
| POST | `/auth/reenviar-verificacion` | No | Genera un token nuevo. |
| POST | `/auth/login` | No | Inicia sesión y devuelve un JWT. |
| GET | `/auth/yo` | Bearer | Perfil del usuario autenticado. |
| GET | `/distritos` | No | Catálogo de los 26 distritos. |
| GET | `/viabilidad/distritos/:id` | Bearer | Viabilidad CENTA del distrito. |
| GET | `/clima/distritos/:id` | Bearer | Última condición climática guardada. |
| POST | `/clima/actualizar` | Bearer | Fuerza la actualización del clima. |

Rutas inexistentes → 404 JSON. JSON mal formado → 400 JSON. Error no controlado → 500 genérico.

---

## 2. Salud

### `GET /health/live`

```json
{ "status": "ok" }
```

### `GET /health`

```json
{ "status": "ok", "baseDatos": "ok" }
```

Si MySQL no responde en 2 s:

```json
{ "status": "degradado", "baseDatos": "error" }
```

con estado **503**.

---

## 3. Autenticación

### `POST /auth/registro`

**Cuerpo:**

```json
{
  "nombres": "Prueba",
  "apellidos": "Uno",
  "correo": "prueba1@email.com",
  "contrasena": "ClaveSegura123",
  "dui": "123456789",
  "distrito": "Chilanga"
}
```

Reglas:

- `nombres`, `apellidos`: texto no vacío, máximo 100.
- `correo`: formato válido, máximo 255; se guarda en minúsculas.
- `contrasena`: entre 8 y 128 caracteres.
- `dui`: exactamente 9 dígitos, sin guiones.
- `distrito`: nombre de uno de los 26 distritos; se compara sin tildes ni mayúsculas.

**201:**

```json
{
  "id": 1,
  "nombres": "Prueba",
  "apellidos": "Uno",
  "correo": "prueba1@email.com",
  "distrito": { "id": 1304, "nombre": "Chilanga", "municipio": { "id": 2, "nombre": "Morazán Sur" } },
  "verificado": false,
  "fechaRegistro": "2026-11-14T12:00:00.000Z"
}
```

Con `EXPONER_TOKEN_VERIFICACION=true` agrega `tokenVerificacion_DEV` (solo desarrollo).

**Errores:**

| Código | Caso |
|---|---|
| 400 | Campos inválidos o distrito inexistente. |
| 409 | Correo o DUI ya registrados. |
| 500 | Error interno. |

---

### `GET /auth/verificar/:token`

El token es de 64 caracteres hexadecimales.

**200:**

```json
{
  "mensaje": "Correo verificado correctamente",
  "usuario": { "id": 1, "correo": "prueba1@email.com", "verificado": true }
}
```

**Errores:**

| Código | Caso |
|---|---|
| 400 | Formato de token inválido. |
| 404 | Token inexistente o ya usado. |
| 410 | Token expirado (24 h). |
| 500 | Error interno. |

---

### `POST /auth/reenviar-verificacion`

**Cuerpo:** `{ "correo": "prueba1@email.com" }`

**200** (siempre el mismo mensaje, exista o no el correo):

```json
{ "mensaje": "Si el correo está registrado y pendiente de verificación, se generó un nuevo enlace" }
```

Con `EXPONER_TOKEN_VERIFICACION=true` y un correo pendiente, agrega `tokenVerificacion_DEV`.

**Errores:** 400 si el correo no tiene formato válido; 500 si falla el servidor.

---

### `POST /auth/login`

**Cuerpo:**

```json
{ "correo": "prueba1@email.com", "contrasena": "ClaveSegura123" }
```

**200:**

```json
{
  "token": "<JWT HS256>",
  "usuario": {
    "id": 1,
    "nombres": "Prueba",
    "apellidos": "Uno",
    "correo": "prueba1@email.com",
    "distrito": { "id": 1304, "nombre": "Chilanga", "municipio": { "id": 2, "nombre": "Morazán Sur" } }
  }
}
```

**Errores:**

| Código | Caso |
|---|---|
| 400 | Correo o contraseña ausentes o con formato inválido. |
| 401 | Credenciales incorrectas (mismo mensaje exista o no el correo). |
| 403 | Cuenta no verificada (solo después de validar la contraseña). |
| 429 | Demasiados intentos (20 por 15 min por IP). |
| 500 | Error interno. |

El JWT expira a las 2 horas por defecto. El cliente lo guarda en `sessionStorage`.

---

### `GET /auth/yo`

**Encabezado:** `Authorization: Bearer <token>`

**200:**

```json
{
  "success": true,
  "usuario": {
    "id": 1,
    "nombres": "Prueba",
    "apellidos": "Uno",
    "correo": "prueba1@email.com",
    "distrito": { "id": 1304, "nombre": "Chilanga", "municipio": { "id": 2, "nombre": "Morazán Sur" } },
    "verificado": true,
    "fechaRegistro": "2026-11-14T12:00:00.000Z"
  }
}
```

**Errores:**

| Código | Caso |
|---|---|
| 401 | Falta el encabezado, token inválido o expirado, o el usuario ya no existe. |
| 500 | Error interno. |

---

## 4. Distritos

### `GET /distritos`

Público: el registro ocurre antes del login.

**200:**

```json
{
  "distritos": [
    { "id": 1304, "nombre": "Chilanga", "municipio": { "id": 2, "nombre": "Morazán Sur" } }
  ]
}
```

Ordenado por `nombreNormalizado`. **500** si falla la base.

---

## 5. Viabilidad

### `GET /viabilidad/distritos/:id`

**Auth:** Bearer.

**Query opcional:**

- `?capa=potencial_maiz` — código de capa; se compara sin tildes ni mayúsculas.
- `?cultivo=maiz` — `maiz`, `frijol` o `maicillo`; incluye siempre `riesgo_sequia`.
- No se pueden enviar `capa` y `cultivo` a la vez.
- No se pueden repetir parámetros.

**200:**

```json
{
  "distrito": { "id": 1304, "nombre": "Chilanga" },
  "municipio": { "id": 2, "nombre": "Morazán Sur" },
  "fuente": "CENTA",
  "fechaExtraccion": "2026-10-01",
  "capas": [
    {
      "codigo": "potencial_maiz",
      "nombre": "Potencial de maíz",
      "tipo": "POTENCIAL",
      "cultivo": "maiz",
      "totalHa": 5998.537,
      "totalMz": 8569.34,
      "claseDominante": { "valor": 2, "nombre": "Medio", "porcentaje": 46.3 },
      "clases": [
        { "valor": 1, "nombre": "Bajo", "areaHa": 2024.138, "areaMz": 2891.63, "porcentaje": 33.7 }
      ]
    }
  ]
}
```

**Errores:**

| Código | Caso |
|---|---|
| 400 | Id inválido, `capa` y `cultivo` juntos, o parámetro repetido. |
| 401 | Sin token o token inválido. |
| 404 | Distrito, capa o cultivo inexistente. |
| 500 | Error interno. |

---

## 6. Clima

### `GET /clima/distritos/:id`

**Auth:** Bearer. No consulta Open-Meteo; lee la última condición guardada.

**200:**

```json
{
  "distrito": { "id": 1304, "nombre": "Chilanga", "municipio": { "id": 2, "nombre": "Morazán Sur" } },
  "condicion": {
    "condicion": "INVIERNO_ACEPTABLE",
    "nivelSequia": null,
    "diasSecosConsecutivos": 3,
    "acumulado30Mm": 142.4,
    "normal30Mm": 120.1,
    "razon30": 1.19,
    "fechaDatos": "2026-11-13",
    "actualizadoEn": "2026-11-14T12:00:00.000Z",
    "condicionDesde": "2026-11-10T12:00:00.000Z"
  },
  "fuente": "Open-Meteo",
  "atribucion": {
    "texto": "Weather data by Open-Meteo.com",
    "url": "https://open-meteo.com/",
    "licencia": "CC BY 4.0",
    "urlLicencia": "https://open-meteo.com/en/licence"
  }
}
```

`condicion` es `null` si el distrito nunca se ha clasificado o si está fuera de la época evaluable.

**Errores:**

| Código | Caso |
|---|---|
| 400 | Id inválido. |
| 401 | Sin token o token inválido. |
| 404 | Distrito inexistente. |
| 429 | Límite de lectura (60 por minuto por IP). |
| 500 | Error interno. |

---

### `POST /clima/actualizar`

**Auth:** Bearer.

**Cuerpo opcional:**

```json
{ "distritoIds": [1304, 1305] }
```

- Sin cuerpo o `{}`: actualiza todos los distritos con coordenadas.
- `distritoIds` debe ser un array no vacío de enteros positivos.
- Si se envía cuerpo, debe ser `Content-Type: application/json` (si no, 415).

**200:** resultado de la orquestación.

```json
{
  "fechaUltimoDiaCompleto": "2026-11-13",
  "normalDisponible": true,
  "distritos": [
    {
      "distritoId": 1304,
      "estado": "ACTUALIZADO",
      "condicion": "INVIERNO_ACEPTABLE",
      "nivelSequia": null,
      "cambio": false,
      "actualizacionEmitida": true,
      "sinEvaluar": null,
      "resumen": {
        "fecha": "2026-11-13",
        "acumulado30Mm": 142.4,
        "normal30Mm": 120.1,
        "razon30": 1.19,
        "diasSecosConsecutivos": 3
      }
    }
  ]
}
```

**Errores:**

| Código | Caso |
|---|---|
| 400 | `distritoIds` inválido o distrito inexistente. |
| 401 | Sin token o token inválido. |
| 415 | Cuerpo con Content-Type que no es JSON. |
| 429 | Límite de Open-Meteo (incluye `Retry-After: 3600`) o límite local (6 por 10 min). |
| 502 | Open-Meteo no respondió o respondió mal; se conserva el último dato bueno. |
| 500 | Falta configuración de coordenadas o error interno. |

---

## 7. Variables de entorno

| Variable | Obligatoria | Valor de desarrollo | Notas |
|---|---|---|---|
| `DATABASE_URL` | Sí | `mysql://agroalerta:agroalerta@127.0.0.1:3306/agroalerta` | En Windows, usar `127.0.0.1` si `localhost` falla. |
| `DUI_PEPPER` | Sí | — | ≥ 32 caracteres. |
| `JWT_SECRET` | Sí | — | ≥ 32 caracteres. |
| `JWT_EXPIRES_IN` | No | `2h` | Formatos aceptados por `jsonwebtoken`. |
| `PORT` | No | `3000` | Entero TCP. |
| `CORS_ORIGINS` | No | vacío | Lista separada por comas; vacío = sin CORS. |
| `EXPONER_TOKEN_VERIFICACION` | No | `true` en desarrollo | Nunca en producción. |
| `CLIMA_JOB_ACTIVO` | No | `true` | `false` desactiva el job. |
| `CLIMA_JOB_INTERVALO_MS` | No | `3600000` | Mínimo 1 hora. |
| `NODE_ENV` | No | `development` | `production` desactiva `allowPublicKeyRetrieval`. |

---

## 8. Límites de peticiones

| Ruta | Límite | Ventana |
|---|---|---|
| `/auth/login`, `/auth/registro`, `/auth/reenviar-verificacion` | 20 | 15 min |
| `/clima/actualizar` | 6 | 10 min |
| `/clima` (lectura) | 60 | 1 min |

Son límites **en memoria y por proceso**. No sustituyen un límite compartido entre instancias.
