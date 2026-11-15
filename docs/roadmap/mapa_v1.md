# Mapa v1 — plan inicial (histórico)

- **Versión:** 1.0
- **Fecha:** 13 de septiembre de 2026
- **Fuente original:** el `Mapa_inicial.txt` retirado; este documento resume el plan.
- **Estado:** histórico. Sustituido por el Mapa v2 desde la Parte 3. Las Partes 0, 1 y 2 conservan su registro en `history/branches/`.

> Este documento resume el mapa original y agrega el estado real al 14 de noviembre de 2026. No cambia el alcance acordado: sirve para entender de dónde viene el plan.

## Principio rector

Cada parte debe interferir lo menos posible con las demás. Las dependencias se marcan explícitamente.

## Partes y puntos

### Parte 0 — Preparación del repositorio y base común

Se hace una sola vez, preferiblemente por una persona o en conjunto.

- Crear el repositorio de GitHub.
- Agregar a los cuatro colaboradores.
- Estructura inicial de carpetas.
- Archivos base de configuración según el stack.

**Estado:** ✅ cerrada. Incluyó Docker/MySQL, Prisma, `.gitignore`, CI y documentación inicial.

### Parte 1 — Autenticación y modelo de Usuario

**Dependencias:** ninguna; puede empezar en paralelo.

| Punto | Contenido | Estado |
|---|---|---|
| 1-A | Modelo de Usuario + registro (correo, contraseña, DUI hasheado, distrito) | ✅ |
| 1-B | Login + middleware / guards de autenticación | ✅ |
| 1-C | Verificación de correo (o flujo simulado) | ✅ |
| 1-D | Perfil básico del agricultor + endpoint “yo” | ✅ |

**Cierre:** 1-END, con verificación funcional y corrección de la conexión Prisma/MariaDB.

### Parte 2 — Datos de viabilidad y zonas de Morazán

**Dependencias:** ninguna fuerte; puede avanzar en paralelo con la Parte 1.

| Punto | Contenido | Estado |
|---|---|---|
| 2-A | Modelo de zonas + granos viables (referencia CENTA) | ✅ |
| 2-B | Carga inicial de datos de Morazán | ✅ |
| 2-C | Servicio de consulta de viabilidad por zona + grano + temporada | ✅ (sin temporada) |
| 2-D | Endpoint y pruebas de la consulta | ✅ (rehecho tras rechazo) |

**Cierre:** 2-END, con catálogo de distritos, `Usuario.distrito_id` y ajustes de verificación.

### Parte 3 — Integración climática (Open-Meteo) + eventos

**Dependencias:** preferible después de tener zonas definidas (Parte 2).

| Punto | Contenido | Estado |
|---|---|---|
| 3-A | Cliente / servicio de Open-Meteo por zona | ✅ |
| 3-B | Clasificación de condición climática | ✅ |
| 3-C | Emisión de `ActualizacionMeteorologica` y `CondicionClimaticaActualizada` | ✅ |
| 3-D | Job / cron o listener de actualización periódica | ✅ |

**Nota:** el Mapa v2 agregó 3-0a (eventos), 3-0b (coordenadas) y 3-0c (umbrales) como preparación.

### Parte 4 — Módulo de Siembra + formulario detallado

**Dependencias:** Usuario (Parte 1) y Viabilidad (Parte 2).

| Punto | Contenido | Estado |
|---|---|---|
| 4-A | Modelo de Siembra / registro de cultivo | ⏳ |
| 4-B | Formulario frontend completo | ⏳ |
| 4-C | Lógica de estimación de costos | ⏳ |
| 4-D | Evento `SiembraRegistrada` + historial | ⏳ |

### Parte 5 — Estimación y recomendaciones (núcleo EDA)

**Dependencias:** Siembra (Parte 4), Clima (Parte 3) y Viabilidad (Parte 2).

| Punto | Contenido | Estado |
|---|---|---|
| 5-A | Listeners de `SiembraRegistrada` y `CondicionClimaticaActualizada` | ⏳ |
| 5-B | Proyección de rendimiento + ingresos | ⏳ |
| 5-C | Recomendaciones según riesgo | ⏳ |
| 5-D | Persistencia y exposición del reporte | ⏳ |

### Parte 6 — Frontend: dashboard y vistas principales

**Dependencias:** endpoints de las partes anteriores.

| Punto | Contenido | Estado |
|---|---|---|
| 6-A | Layout general (sidebar, header con indicadores) | ✅ (adelantado y ampliado en el Mapa v2) |
| 6-B | Vista Dashboard (formulario + reporte de dos niveles) | ✅ (parcial: viabilidad real, estimación vacía) |
| 6-C | Vista Historial de evaluaciones | ⏳ |
| 6-D | Vista Clima Zonal + Configuración básica | ✅ (Clima Zonal; Configuración no) |

### Parte 7 — Integración final, Docker y despliegue

**Dependencias:** casi todo lo anterior.

| Punto | Contenido | Estado |
|---|---|---|
| 7-A | Docker Compose (backend + db + frontend) | ⏳ |
| 7-B | Variables de entorno y configuración de producción | ⏳ |
| 7-C | Pruebas de flujo completo EDA | ⏳ |
| 7-D | Documentación final + README de despliegue | ⏳ |

## Notas del mapa original

- Las Partes 1 y 2 podían avanzar casi en paralelo.
- La Parte 4 (formulario detallado) es crítica y debe respetar los campos de la sección de Pendientes.
- La Parte 5 es el corazón de la arquitectura orientada a eventos; no se debe diluir.
- Cualquier cambio de orden o fusión de partes debe documentarse.

## Qué cambió con el Mapa v2

- El frontend se adelantó para tener dos vistas presentables antes de terminar el backend.
- Se agregó la preparación 3-0 (coordenadas, eventos y umbrales).
- Los pendientes de 2-END se repartieron en las partes donde se necesitan.
- El stack, el diseño visual y la arquitectura EDA no cambiaron.
