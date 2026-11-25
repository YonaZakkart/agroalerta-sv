# Documentación de AgroAlerta Morazán

Este directorio reúne todo lo que necesita una persona para entender, levantar y continuar el proyecto **AgroAlerta Morazán**: una plataforma web orientada a eventos para prevención de riesgos agrícolas en Morazán, El Salvador.

- **Repositorio:** `agroalerta-sv` (privado)
- **Documentación:** consolidada en `.md`; los antiguos `.txt` se retiraron, salvo `docs/4-A-doc.txt`, ya integrado en `history/branches/4-siembra.md` y pendiente de retirar.
- **Última actualización de este índice:** 24 de noviembre de 2026

---

## 1. Estado actual en una página

| Área | Estado | Detalle |
|---|---|---|
| Parte 0 — repositorio y base común | ✅ Cerrada | Docker, MySQL, Prisma, estructura, CI |
| Parte 1 — autenticación | ✅ Cerrada | Registro, verificación simulada, login, JWT, `/auth/yo` |
| Parte 2 — viabilidad CENTA | ✅ Cerrada | 2 municipios, 26 distritos, 4 capas, 312 áreas |
| Hito 1 — frontend mínimo | ✅ Cerrado | 6-0, 6-A y 6-B: login, registro y dashboard con datos reales |
| Parte 3 — clima | ✅ Cerrada | 3-0a/b/c, 3-A, 3-B, 3-C y 3-D, incluido el job periódico |
| 6-D — Clima Zonal | ✅ Implementado | Vista por distrito y condición en el encabezado |
| Parte 4 — siembra | ✅ Cerrada | 4-A a 4-D: modelo, formulario, costos, endpoints y evento |
| Parte 5 — estimación | ✅ Cerrada | 5-A a 5-D: listeners, proyección, recomendaciones y reporte persistido |
| 6-C | ✅ Implementado | Historial de evaluaciones |
| 6-E | ✅ Implementado | Estimación real en el dashboard |
| Parte 7 — despliegue | 🟡 En curso | Neon/Postgres y configuración Render/Vercel listos; falta verificar en las plataformas y release |

**Lo que ya se puede demostrar:** registro con verificación simulada, login, dashboard con la viabilidad real del distrito del usuario, clima zonal por distrito, condición climática en el encabezado, formulario de siembra, registro y listado de siembras desde la API, estimación de costos como función pura, listeners EDA que reaccionan a siembra y clima, proyección de rendimiento e ingresos con supuestos declarados, recomendaciones por riesgo con referencia de CENTA, reporte persistido, estimación real en el dashboard e historial de evaluaciones.

**Lo que todavía no existe:** la vista de Configuración y el despliegue.

---

## 2. Mapa de documentos

```
docs/
├── INDEX.md                  ← usted está aquí
├── workflow.md               Cómo se trabaja: ramas, PR, pruebas, cierre de un punto
├── deployment.md             Neon, Render, Vercel y release
├── conventions.md            Reglas de código, datos, API, frontend y documentación
├── gotchas.md                Trampas activas y problemas conocidos (leer antes de tocar código)
│
├── adr/                      Decisiones de arquitectura y su justificación
│   ├── 1-A.md                Registro, DUI con HMAC y contraseña con Argon2id
│   ├── 1-B.md                Sesión JWT stateless y su caducidad
│   ├── 2-A.md                CENTA como instantánea CSV, no como API en vivo
│   ├── 3-B.md                Clasificación climática, umbrales y “sin evaluación”
│   ├── 3-C.md                Orquestación por eventos y emisión segura
│   └── 6-A.md                Token en sessionStorage, interceptor y guards
│
├── data/                     Contratos de datos (no se editan sin acuerdo del equipo)
│   ├── Info_Datos_CENTA.md
│   ├── Info_Datos_Clima.md
│   ├── Info_Datos_Coordenadas.md
│   ├── Info_Datos_OpenMeteo.md
│   ├── Info_Datos_Precios.md Precios y dosis de referencia (F3, 4-C)
│   ├── Info_Datos_Estimacion.md Rendimiento y precio de venta (F1/F4, 5-B)
│   └── Info_Datos_Recomendaciones.md Reglas del semáforo (5-C)
│
├── roadmap/                  Plan de desarrollo
│   ├── mapa_v1.md            Mapa inicial (Partes 0 a 7), histórico
│   └── mapa_v2.md            Mapa vigente desde la Parte 3 (hitos y recortes)
│
├── architecture/             Cómo funciona hoy el código
│   ├── files.md              Árbol real de archivos y orden de carga
│   ├── backend.md            Express, módulos, eventos, configuración y pruebas
│   ├── frontend.md           Angular 22, rutas, estado, sesión y estilos
│   ├── api.md                Endpoints, contratos y códigos de error
│   └── data.md               Modelo Prisma, migraciones y archivos de datos
│
├── history/                  Lo que ya se hizo y por qué
│   ├── branches/
│   │   ├── 0-preparacion.md
│   │   ├── 1-autenticacion.md
│   │   ├── 2-viabilidad.md
│   │   ├── 3-clima.md
│   │   ├── 4-siembra.md      4-A a 4-D
│   │   ├── 5-estimacion.md   5-A y siguientes
│   │   ├── 6-frontend.md
│   │   └── cierre-y-pendientes.md
│   └── bugs-resueltos.md     Incidencias reales, causa y solución
│
├── tasks/                    Lo que sigue
│   ├── continuacion.md       Próximos pasos en orden, con dependencias
│   ├── pendiente.md          Pendientes abiertos y decisiones del equipo
│   └── ideas.md              Mejoras opcionales, fuera del alcance mínimo
```

---

## 3. Qué leer según lo que necesite

### “Voy a empezar a trabajar en el proyecto”
1. Este `INDEX.md`.
2. [`workflow.md`](workflow.md): cómo se ramifica, se prueba y se cierra un punto.
3. [`architecture/files.md`](architecture/files.md): dónde vive cada cosa.
4. [`gotchas.md`](gotchas.md): las trampas que ya costaron tiempo.

### “Necesito levantar el entorno”
- [`workflow.md`](workflow.md), sección “Entorno local”.
- `README.md` de la raíz del repositorio (instalación y endpoints).
- [`gotchas.md`](gotchas.md), sección “Base de datos y Prisma”.

### “Voy a tocar el backend”
- [`architecture/backend.md`](architecture/backend.md)
- [`architecture/api.md`](architecture/api.md)
- [`conventions.md`](conventions.md), sección “Backend”.
- [`architecture/data.md`](architecture/data.md) si hay migraciones.

### “Voy a tocar el frontend”
- [`architecture/frontend.md`](architecture/frontend.md)
- [`conventions.md`](conventions.md), sección “Frontend”.
- [`adr/6-A.md`](adr/6-A.md) para el manejo de sesión.

### “Voy a tocar el clima”
- [`data/Info_Datos_Clima.md`](data/Info_Datos_Clima.md) y [`data/Info_Datos_OpenMeteo.md`](data/Info_Datos_OpenMeteo.md)
- [`adr/3-B.md`](adr/3-B.md) y [`adr/3-C.md`](adr/3-C.md)
- [`history/branches/3-clima.md`](history/branches/3-clima.md)

### “Voy a tocar la siembra o la estimación de costos”
- [`history/branches/4-siembra.md`](history/branches/4-siembra.md)
- [`data/Info_Datos_Precios.md`](data/Info_Datos_Precios.md) (F3)
- [`architecture/data.md`](architecture/data.md), sección del modelo `Siembra`

### “Voy a tocar la estimación y las recomendaciones”
- [`history/branches/5-estimacion.md`](history/branches/5-estimacion.md)
- [`data/Info_Datos_Estimacion.md`](data/Info_Datos_Estimacion.md) (F1/F4 y factores climáticos)
- [`architecture/backend.md`](architecture/backend.md), sección de listeners
- [`tasks/continuacion.md`](tasks/continuacion.md), Parte 5

### “¿Qué sigue?”
- [`tasks/continuacion.md`](tasks/continuacion.md)
- [`tasks/pendiente.md`](tasks/pendiente.md)
- [`roadmap/mapa_v2.md`](roadmap/mapa_v2.md)

### “¿Por qué se decidió así?”
- [`adr/`](adr/)
- [`history/branches/`](history/branches/)
- [`history/bugs-resueltos.md`](history/bugs-resueltos.md)

---

## 4. Reglas de esta documentación

1. **Los `.md` son la única fuente viva.** Los antiguos `.txt` se retiraron al consolidar la documentación; su contenido histórico quedó resumido en `history/` y `roadmap/`. La única excepción es `docs/4-A-doc.txt`, ya integrado en `history/branches/4-siembra.md` y pendiente de retirar.
2. **Los contratos de `data/` no se modifican sin acuerdo del equipo.** `Info_Datos_CENTA.md`, `Info_Datos_Clima.md`, `Info_Datos_Coordenadas.md`, `Info_Datos_OpenMeteo.md` e `Info_Datos_Precios.md` describen fuentes externas y umbrales; un cambio ahí afecta código y pruebas.
3. **Un cambio de código que altere el comportamiento actualiza su documento.** Si cambia un endpoint, se actualiza `architecture/api.md`; si cambia el modelo, `architecture/data.md`; si aparece una trampa nueva, `gotchas.md`.
4. **Una decisión importante se registra como ADR.** No hace falta un ADR para cada detalle, pero sí para elecciones difíciles de revertir: autenticación, persistencia, eventos, fuente de datos y despliegue.
5. **La documentación se escribe en español.** Nombres de código, endpoints, variables de entorno y comandos se mantienen tal cual están en el repositorio.

---

## 5. Glosario mínimo

| Término | Significado en este proyecto |
|---|---|
| **Parte / Punto** | Unidad de trabajo del mapa (`Parte 3`, `Punto 3-B`). Cada parte termina con un punto de cierre (`3-END`). |
| **Hito** | Entrega demostrable del Mapa v2: Hito 1 (frontend mínimo), Hito 2 (clima), Hito 3 (siembra y estimación), Hito 4 (cierre). |
| **Municipio / Distrito** | Desde la reorganización territorial, Morazán tiene 2 municipios (Morazán Norte y Morazán Sur) y 26 distritos. El sistema trabaja a nivel de distrito. |
| **Capa** | Una de las cuatro lecturas de CENTA: potencial de maíz, frijol, sorgo/maicillo y riesgo de sequía. |
| **Clase** | Subdivisión de una capa (por ejemplo, potencial alto, medio o bajo). Cada combinación distrito–capa–clase tiene un área en hectáreas. |
| **Condición climática** | `SEQUIA`, `EXCESO_LLUVIA` o `INVIERNO_ACEPTABLE`; `null` cuando el distrito está fuera de la época evaluable. |
| **Evento** | Mensaje interno del bus (`AgricultorRegistrado`, `ActualizacionMeteorologica`, `CondicionClimaticaActualizada`, `SiembraRegistrada`). |
| **Listener** | Función suscrita al bus que reacciona a un evento. No debe lanzar ni bloquear al emisor; captura sus propios rechazos. |
| **Siembra** | Registro de un cultivo en un distrito: estado, fecha, área en manzanas e inversión declarada. Modelo de 4-A, formulario de 4-B y endpoints de 4-D. |
| **F3** | Precios y dosis de referencia del MAG para estimar costos (4-C). Cada valor lleva fuente, fecha y tipo (`OFICIAL` / `SUPUESTO`). |
| **F1 / F4** | Rendimiento base y precio de venta para la proyección (5-B). Base MAG 2022-2023; el ajuste climático es un supuesto declarado. |
| **Semáforo** | Verde/amarillo/rojo de 5-C. Es una guía basada en el clima; no es un veredicto sobre la parcela. |
| **Reporte** | Fila de `estimaciones` con la proyección y la recomendación de una siembra; el historial son todas las filas. |
| **EDA** | Event-Driven Architecture: el sistema reacciona a eventos en lugar de esperar que el usuario pida un recálculo. |
| **CENTA** | Fuente de los datos de viabilidad agrícola. No tiene API pública; se usan exportaciones CSV. |
| **Open-Meteo** | API climática usada para la lluvia por distrito. Requiere atribución (CC BY 4.0). |

---

## 6. Mantenimiento rápido

| Si pasó esto… | Actualice… |
|---|---|
| Se cerró un punto o una rama | `history/branches/` y `tasks/continuacion.md` |
| Se resolvió un bug | `history/bugs-resueltos.md` |
| Se tomó una decisión de arquitectura | `adr/` y, si cambia el estado, `INDEX.md` |
| Cambió un endpoint o un contrato | `architecture/api.md` |
| Cambió el modelo o una migración | `architecture/data.md` |
| Apareció una trampa nueva | `gotchas.md` |
| Cambió el plan | `roadmap/mapa_v2.md` y `tasks/pendiente.md` |
| Se agregó una idea fuera del alcance | `tasks/ideas.md` |

> **Regla de oro:** si dentro de tres meses alguien no puede responder “¿por qué está así?” con estos documentos, falta documentar.
