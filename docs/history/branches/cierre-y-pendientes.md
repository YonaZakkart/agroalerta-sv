# Historia — Cierre documental y pendientes

- **Fecha de corte:** 14 de noviembre de 2026
- **Rama:** `docs`
- **Fuente:** `docs/Estado_del_Proyecto.txt`, `docs/Estado_Proyecto_Pt2.txt`, `README.md` y el estado real de `main`

## Qué es este archivo

El historial de ramas se cerró con la Parte 3 y el Hito 1. Después se mergearon tres PR más que los `.txt` no recogen:

| PR | Rama | Qué agregó |
|---|---|---|
| #47 | `docs/…` | Actualización documental previa a esta reorganización |
| #48 | `feat/hito2-clima-zonal` | 6-D: vista Clima Zonal y clima en el encabezado |
| #49 | `feat/frontend-responsive-polish` | Tokens de espaciado y colores semánticos |
| #50 | `fix/ng0203-takeuntil-destroyed` | `DestroyRef` en las llamadas a `takeUntilDestroyed` |

`main` está en `9e00e0d` (merge del PR #50). La rama `docs` no tiene commits previos: esta reorganización es su primer contenido.

## Cómo se hizo esta reorganización

1. Se leyeron completos `Estado_del_Proyecto.txt` y `Estado_Proyecto_Pt2.txt`.
2. Se contrastó cada afirmación con el código real: `schema.prisma`, migraciones, routers, módulos de clima, componentes y pruebas.
3. Se verificó el historial de `git log` para los merges posteriores a los `.txt`.
4. Se escribieron los `.md` vivos y se dejaron los `.txt` intactos.
5. Se movieron los contratos `Info_Datos_*.md` a `docs/data/` sin editar su contenido.

**Regla aplicada:** ante una contradicción entre el `.txt` y el código, prevalece el código y se anota en el `.md` correspondiente. Las contradicciones conocidas están en `gotchas.md` y `architecture/data.md`.

## Correcciones de estado respecto a los `.txt`

| El `.txt` dice | Realidad al 14/11/2026 |
|---|---|
| 6-D pendiente | Implementado (PR #48). Solo falta Configuración |
| Job de clima pendiente | Implementado (PR #44) |
| `GET /health` sin verificación de base | Implementado (PR #44) |
| CORS pendiente | Implementado como opt-in con `CORS_ORIGINS` |
| Rate limiting pendiente | Implementado en memoria por proceso |
| Pruebas del frontend: 1 archivo | 9 archivos y 30 casos |
| Pruebas del backend: 53 | 18 archivos encadenados en `npm test` |
| `fix/6-a-styles-duplicado` sin estado | Mergeada |
| `feat/3-c` y `feat/3-d` «pendientes de aprobación» | Mergeadas y estabilizadas |

## Lo que está cerrado

- **Parte 0:** repositorio, Docker, Prisma, CI y convenciones.
- **Parte 1:** registro, verificación simulada, login, JWT y perfil.
- **Parte 2:** catálogo de 26 distritos, 312 áreas de CENTA y consulta de viabilidad.
- **Hito 1:** login, registro y dashboard con datos reales.
- **Parte 3:** coordenadas, eventos, cliente de Open-Meteo, clasificación, orquestador, endpoint, job y lectura de la condición.
- **6-D:** Clima Zonal y clima en el encabezado.
- **Estabilización:** seguridad HTTP, CORS, rate limit, cierre ordenado, contrato de error, accesibilidad y pruebas.

## Lo que falta

### Hito 3 — siembra y estimación

| Punto | Contenido |
|---|---|
| 4-A | Modelo de siembra y migración |
| 4-B | Formulario de siembra en Angular |
| 4-C | Estimación de costos con precios y dosis |
| 4-D | `POST /siembras`, `GET /siembras` y `SiembraRegistrada` |
| 5-A | Listeners de siembra y clima |
| 5-B | Proyección de rendimiento e ingresos |
| 5-C | Recomendaciones por riesgo |
| 5-D | Persistencia y reporte |
| 6-C | Vista Historial |
| 6-E | Estimación real en el dashboard |

### Hito 4 — cierre

Parte 7 completa: Docker de producción, secretos y TLS, CORS final, rate limiting compartido, pruebas E2E y documentación de despliegue.

### Pendientes que bloquean

- **Datos de referencia fuera de CENTA:** rendimiento estándar por cultivo (F1), precios y dosis (F3) y precio de venta (F4).
- **Validación de umbrales:** confirmar los supuestos de `Info_Datos_Clima.md` con CENTA, un agrónomo o datos reales.
- **Decisión del equipo:** ¿el formulario de siembra usa el distrito del usuario o permite elegir otro?

### Pendientes menores

- Mostrar la atribución de Open-Meteo y GeoNames en la interfaz.
- Vista de Configuración.
- Envío real de correo.
- Validación del dígito verificador del DUI.
- Rotación de secretos y revocación de sesión.
- Favicon y logotipo propios.
- Revisión de `npm audit` y de los scripts bloqueados por `allowScripts`.
- Decidir si se conserva o se retira el SSR.
- Pruebas E2E, de componentes y de integración con MySQL real.

## Riesgos abiertos

1. **Los umbrales climáticos son supuestos.** Pueden producir falsos positivos de sequía, sobre todo entre el 15 de octubre y el 15 de noviembre.
2. **La normal (ERA5, 25 km) y la lluvia reciente (modelos de pronóstico) vienen de fuentes distintas.** La razón de 30 días puede estar sesgada; no se calibró con datos de 2026.
3. **El bus de eventos es en proceso.** Sin persistencia, reintentos ni soporte para varias instancias.
4. **El rate limit es en memoria.** No protege un despliegue con varias réplicas.
5. **La sesión no se revoca.** Un token robado es válido hasta expirar.
6. **El DUI tiene baja entropía.** Si se filtran la base y el pepper, es recuperable por fuerza bruta.
7. **El proyecto depende de datos de referencia que todavía no existen.** Sin ellos no hay estimación creíble.

## Lecciones del proyecto

- **Un error de conexión puede esconder la causa real.** Prisma reportaba «pool timeout» cuando el problema era `ER_CANNOT_RETRIEVE_RSA_KEY`. Probar la conexión con el driver directo ahorra horas.
- **Los `.txt` envejecen.** Un historial cerrado es útil, pero el estado actual debe vivir en documentos que se actualicen con cada merge.
- **Las pruebas sin red valen más que las manuales.** Permiten refactorizar el clima sin gastar llamadas a Open-Meteo.
- **Los archivos compartidos necesitan dueño.** `schema.prisma`, `events/types.ts`, `index.ts` y los cuatro del frontend causaron casi todos los conflictos.
- **La documentación de un supuesto debe decir que es un supuesto.** Presentar un umbral inventado como oficial es peor que no tener el umbral.
- **El contrato de error se decide temprano.** Unificarlo después obligó a tocar archivos de cuatro ramas.
