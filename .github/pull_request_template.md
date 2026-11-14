## Resumen

<!-- Qué cambia y por qué. Si corrige un bug, indica la causa raíz. -->

## Tipo de cambio

- [ ] Nueva funcionalidad
- [ ] Corrección de bug
- [ ] Documentación
- [ ] Pruebas o tooling
- [ ] Cambio transversal (schema, configuración compartida, CI)

## Cómo probarlo

<!-- Comandos y pasos manuales. Si aplica, incluye el endpoint o la pantalla. -->

## Checklist

- [ ] `npm run typecheck` en el paquete tocado
- [ ] `npm test` (backend) o `npx ng test --watch=false` (frontend)
- [ ] `npm run build` en el paquete tocado
- [ ] Se agregaron o actualizaron pruebas para el comportamiento nuevo
- [ ] No se commitean archivos de `docs/` desde ramas `feat/*` o `fix/*`
- [ ] Se actualizó `README.md` o `backend/.env.example` si cambió el flujo de instalación o una variable de entorno

## Decisiones pendientes del equipo

<!-- Déjalas explícitas en lugar de asumir una regla de negocio o de infraestructura. -->

Responsable: Yona
