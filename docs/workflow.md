# Flujo de trabajo

Este documento describe cómo se organiza el trabajo en `agroalerta-sv`: ramas, PR, pruebas, cierre de un punto y actualización de la documentación. La convención nació en la Parte 1 y se mantiene desde entonces.

---

## 1. Modelo de ramas

```
main                  rama estable; solo recibe merges por Pull Request
├── feat/…            código nuevo
├── fix/…             correcciones
├── chore/…           infraestructura, dependencias, CI
└── docs/…            solo documentación
```

Reglas:

- **Nadie hace push directo a `main`.** Todo entra por Pull Request, aunque sea un cambio pequeño.
- Una rama sale de `main` actualizado y vive lo menos posible.
- El nombre sigue el patrón `tipo/parte-punto-descripcion-corta`, por ejemplo:
  - `feat/3-b-clasificacion-clima`
  - `fix/3-a-timeout-open-meteo`
  - `docs/3-a-estado`
  - `chore/db-setup`
- Las ramas históricas conservan su nombre original aunque no siga el patrón (`feat/auth-registro-usuario`, `docs/actualizar-estado-rama-12`). No se renombran.
- Una rama rechazada **no se borra del historial**: se documenta como rechazada, con lo que se hizo y cómo se corrigió después.
- Al terminar el merge se puede borrar la rama remota, pero el registro queda en `history/branches/`.

### Orden de merge cuando hay archivos compartidos

Los puntos calientes son:

- `backend/prisma/schema.prisma` y `backend/prisma/migrations/`
- `backend/src/index.ts`
- `backend/src/events/types.ts`
- `frontend/src/app/app.routes.ts`, `app.config.ts`, `styles.css` y `package.json`

Regla: **una sola persona toca cada archivo compartido a la vez**. Quien mergee segundo hace `git pull origin main`, resuelve el conflicto conservando ambos bloques y regenera su migración sobre `main` actualizado.

---

## 2. Ciclo de vida de un Punto

1. **Leer el mapa y los pendientes.** Identificar la Parte y el Punto (`3-B`, `6-A`, etc.), sus dependencias y su criterio de aceptación.
2. **Crear la rama** desde `main` actualizado.
3. **Implementar** solo el alcance del punto. Lo que aparezca de más se anota, no se mezcla.
4. **Probar** con la lista de la sección 4.
5. **Actualizar la documentación** en una rama `docs/` aparte o en la misma rama si el equipo lo acordó.
6. **Abrir el PR** con la plantilla del repositorio: qué se hizo, qué se probó, qué no se probó y qué archivos compartidos se tocaron.
7. **Revisión de otra persona.** Como mínimo, otra persona lee el diff y reproduce las pruebas principales.
8. **Merge a `main`** y borrado de la rama.
9. **Registrar el cierre** en `history/branches/` y actualizar `tasks/continuacion.md`.

### Plantilla mínima de PR

```markdown
## Qué hace este PR
…

## Parte / Punto
3-B — Clasificación de la condición climática

## Pruebas realizadas
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Flujo manual: …

## Pruebas NO realizadas
…

## Archivos compartidos tocados
- `backend/prisma/schema.prisma`

## Pendientes que deja
…
```

---

## 3. Definición de “terminado” (Definition of Done)

Un punto se considera cerrado cuando:

- [ ] El código compila sin errores de tipos en backend y frontend.
- [ ] Las pruebas automatizadas existentes pasan.
- [ ] Se agregaron pruebas para la lógica nueva cuando es lógica de negocio (clasificación, validación, cálculos).
- [ ] El flujo manual del punto se probó y quedó escrito (petición, resultado esperado, resultado obtenido).
- [ ] Los códigos de error del contrato `{ error, detalles }` se probaron: 400, 401, 403, 404, 409, 429 y 500 cuando apliquen.
- [ ] No se tocaron archivos fuera del alcance sin anotarlo.
- [ ] La documentación del punto está actualizada.
- [ ] El PR fue revisado y mergeado.
- [ ] El punto aparece en `history/branches/` y en `tasks/continuacion.md`.

---

## 4. Pruebas

### Backend

Desde `backend/`:

```bash
npm run typecheck     # tsc --noEmit
npm test              # 27 archivos de pruebas, sin red
npm run build         # tsc
npm run dev           # arranca en http://localhost:3000
```

`npm test` encadena las pruebas de configuración, HTTP, seguridad, eventos, viabilidad, clima, estimación de costos, siembra, listeners, proyección, recomendaciones y reporte persistido. No necesitan MySQL ni Internet: usan datos de ejemplo y dobles de prueba. Si una prueba de clima empieza a fallar por red, es un error de diseño de la prueba, no del entorno.

Pruebas manuales mínimas del flujo base (con el backend y MySQL arriba):

1. `POST /auth/registro` → 201.
2. `POST /auth/login` antes de verificar → 403.
3. `GET /auth/verificar/:token` → 200; repetir → 404.
4. `POST /auth/login` → 200 con token.
5. `GET /auth/yo` con token → 200; sin token → 401; token alterado → 401.
6. `GET /viabilidad/distritos/1304` con token → 200 con las 4 capas.
7. `GET /distritos` → 200 con los 26 distritos.
8. `GET /clima/distritos/1304` con token → 200 con la condición guardada o `null`.
9. `POST /siembras` con token y cuerpo válido → 201; sin token → 401; con distrito inexistente → 404.
10. `GET /siembras` con token → 200 solo con las siembras del usuario.

### Frontend

Desde `frontend/`:

```bash
npm run typecheck     # tsc app + spec
npm test              # ng test (Vitest), 10 archivos y 31 casos
npm run build         # ng build
npm start             # ng serve en http://localhost:4200
```

El frontend usa un proxy de desarrollo (`proxy.conf.json`) que reenvía `/api` a `http://localhost:3000`.

### Pruebas que no existen todavía

- Pruebas E2E de navegador.
- Pruebas de integración con MySQL real.
- Pruebas de carga.
- Pruebas de componentes Angular más allá de los servicios y guards actuales.

Están listadas en `tasks/pendiente.md` y en el bloque de pruebas de la Parte 7.

---

## 5. Entorno local

Desde la raíz del repositorio:

```bash
docker compose up -d db
```

Desde `backend/`:

```bash
npm install --legacy-peer-deps
cp .env.example .env
# completar DUI_PEPPER y JWT_SECRET (mínimo 32 caracteres)
npx prisma generate
npx prisma migrate dev
npm run datos:cargar
npm run dev
```

Desde `frontend/`:

```bash
npm install
npm start
```

Reglas de directorio:

- `docker compose` **siempre** desde la raíz.
- `npm`, `npx prisma`, `npm run datos:*` y `npm test` **siempre** desde `backend/` o `frontend/`.
- Correr `npx prisma` desde la raíz descarga una versión suelta (Prisma 8 RC) sin el comando `migrate`.
- `git add` con rutas concretas; nunca `git add .` si hay archivos ajenos a la tarea.

Si la base ya tenía usuarios antes de la migración de `distrito_id`, hay que reiniciar el volumen:

```bash
docker compose down -v
docker compose up -d db
```

Después se repiten `prisma generate`, `migrate dev` y `datos:cargar`.

---

## 6. Convención de commits

Se usa una variante de Conventional Commits, en español y en imperativo:

```
feat(clima): agregar clasificación por días secos consecutivos
fix(auth): igualar el tiempo de respuesta cuando el correo no existe
docs(3-b): documentar umbrales y supuestos
test(backend): ejecutar las pruebas sin red
chore(ci): verificar backend y frontend en GitHub Actions
```

- El alcance entre paréntesis es el módulo, no la Parte: `auth`, `clima`, `viabilidad`, `frontend`, `docs`.
- Un commit = un cambio coherente. No mezclar refactor, feature y formato.
- El mensaje explica **qué** y, si hace falta, **por qué**; el detalle técnico va en el cuerpo.

---

## 7. Documentación

### Dónde va cada cosa

| Tipo de información | Documento |
|---|---|
| Cómo se trabaja | `workflow.md` |
| Reglas de código | `conventions.md` |
| Trampas y problemas conocidos | `gotchas.md` |
| Decisiones de arquitectura | `adr/` |
| Contratos de datos externos | `data/` |
| Plan | `roadmap/` |
| Cómo funciona el código | `architecture/` |
| Qué se hizo y por qué | `history/branches/` |
| Bugs resueltos | `history/bugs-resueltos.md` |
| Qué sigue | `tasks/` |

### Reglas

1. Los `.md` son la única fuente viva. Los antiguos `.txt` de `docs/` se retiraron al consolidar la documentación.
2. Los archivos de `docs/data/` son contratos: un cambio requiere acuerdo del equipo y, si afecta código, una rama `feat/` o `fix/` que lo implemente.
3. Cada rama que cambia comportamiento actualiza al menos un `.md`. Una rama solo de documentación no toca código.
4. Los datos que faltan se marcan como `[COMPLETAR]` o `[VERIFICAR]` y se listan en `tasks/pendiente.md`. No se inventan.
5. Los supuestos se declaran como supuestos, con su fuente o su justificación. Nunca se presentan como dato oficial.

---

## 8. Manejo de incidencias

Cuando algo falla:

1. **Reproducir** con el mínimo caso posible.
2. **Aislar** la causa: ¿entorno, datos, configuración o código?
3. **Revisar `gotchas.md`** antes de investigar desde cero; varias trampas ya están documentadas.
4. **Corregir en una rama `fix/`**, con una prueba que falle antes y pase después cuando sea posible.
5. **Documentar** en `history/bugs-resueltos.md`: síntoma, causa, solución y cómo evitarlo.

No se usa `npm audit fix` ni `npm audit fix --force`: puede mover versiones fijadas. Cualquier actualización de dependencias se discute antes.

---

## 9. Situación actual del repositorio

- `main` contiene las Partes 0, 1, 2, 3 y 4, el Hito 1, 6-D (Clima Zonal), el pulido responsive y el arreglo de `takeUntilDestroyed`.
- La documentación está consolidada en `.md`; los antiguos `.txt` se retiraron, salvo `docs/4-A-doc.txt`, que se integró en `history/branches/4-siembra.md` y queda pendiente de retirar.
- Los archivos `backend/data/centa/raw/*.csv` pueden aparecer como modificados por diferencias de fin de línea (CRLF/LF). **No se stagean** y no forman parte de ningún cambio funcional.
- Las Partes 4 y 5 están cerradas y 6-E (estimación real) está hecho. Faltan 6-C (historial) y la Parte 7.
