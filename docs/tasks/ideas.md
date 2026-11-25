# Ideas

- **Qué es este archivo:** mejoras **fuera del alcance mínimo**. No son pendientes obligatorios ni bloquean hitos.
- **Regla:** una idea se convierte en trabajo solo si el equipo la prioriza y se abre un punto en el mapa. Mientras tanto, vive aquí.
- **Corte:** 14 de noviembre de 2026

---

## 1. Producto y datos

### 1.1 Mapa interactivo de Morazán

Mostrar los 26 distritos en un mapa (Leaflet + GeoJSON propio) con color según la condición climática y la viabilidad. Alto impacto para la demo, costo medio: hace falta cartografía distrital que hoy no se tiene.

### 1.2 Gráficos de lluvia

Serie de 30 días y comparación contra la normal por distrito. Hoy la vista Clima Zonal muestra números; un gráfico explicaría mejor la tendencia. Se puede hacer con SVG propio, sin dependencias.

### 1.3 Historial de condiciones climáticas

Hoy `CondicionDistrito` guarda solo la última condición. Una tabla de histórico permitiría ver cómo cambió un distrito en la época. Implica migración y decidir la retención.

### 1.4 Alertas por correo o WhatsApp

Cuando un distrito pasa a `SEQUIA` o `EXCESO_LLUVIA`, avisar a los agricultores registrados. Depende del envío real de correo y de un mecanismo de consentimiento.

### 1.5 Comparación entre distritos

Vista lado a lado de dos distritos con viabilidad y clima. Útil para decidir dónde sembrar. Costo bajo: los endpoints ya existen.

### 1.6 Capas futuras

Caña, vainilla, banano, elevación, temperatura o humedad. El modelo de 2-A permite agregarlas insertando filas; falta el dato y el contrato.

### 1.7 Calendario de siembra

Cruzar las ventanas de primera y postrera con la fecha de siembra y avisar si está fuera de época. Hoy 3-0c tiene las ventanas como supuestos.

---

## 2. Estimación y recomendaciones

### 2.1 Ajuste climático por etapa del cultivo

Hoy el ajuste sería global por condición. Lo ideal es ponderar por etapa (germinación, floración, llenado), que es lo que realmente afecta el rendimiento. Requiere F1 y los requerimientos hídricos del MARN.

### 2.2 Comparación con la parcela

El sistema solo tiene referencia distrital de CENTA. Permitir que el agricultor registre características de su parcela (suelo, pendiente, riego) acercaría la estimación a su realidad.

### 2.3 Escenarios

Mostrar tres escenarios (seco, normal, lluvioso) en lugar de una sola cifra. Ayuda a decidir sin prometer precisión que no existe.

### 2.4 Costos editables

Permitir que el agricultor ajuste precios y dosis con los de su proveedor, en lugar de usar solo el promedio.

### 2.5 Reporte exportable

PDF o CSV con la siembra, la estimación y la recomendación, para llevar a una cooperativa o a una solicitud de crédito.

---

## 3. Experiencia de usuario

### 3.1 Modo sin conexión

El agricultor puede estar en el campo sin señal. Un service worker con la última viabilidad y clima descargados sería útil. Costo alto: hoy la app es cliente puro y depende del API.

### 3.2 Accesibilidad completa

Ya hay foco visible, etiquetas y navegación por teclado en el radiogroup. Falta probar con lector de pantalla y completar `aria-live` en los estados de carga.

### 3.3 Tipografía e iconos locales

Hoy la fuente y Font Awesome vienen por CDN. Si la demo se hace sin internet, hay que servirlos localmente.

### 3.4 Tema oscuro

Las variables CSS ya están centralizadas; un tema oscuro sería un cambio de tokens, no de componentes.

### 3.5 Perfil editable

Cambiar nombres, correo o distrito. Hoy `GET /auth/yo` es solo lectura. Implica validar el correo nuevo y decidir qué pasa con las siembras si cambia el distrito.

### 3.6 Onboarding

Una explicación breve de qué significa «viabilidad», «riesgo de sequía» y «referencia distrital» para un usuario que no es agrónomo.

---

## 4. Arquitectura y operación

### 4.1 Cola de eventos

Sustituir el `EventEmitter` en proceso por una cola persistente (Redis, RabbitMQ) si el sistema crece a varias instancias. Hoy no se justifica.

### 4.2 Rate limit distribuido

Un almacén compartido (Redis) en lugar del `Map` en memoria. Necesario solo con varias réplicas.

### 4.3 Observabilidad

Logs estructurados, métricas de latencia del API y del job, y alertas cuando Open-Meteo falla repetidamente. Hoy solo hay `console.error`.

### 4.4 Reintentos con backoff en Open-Meteo

Hoy el job pausa dos ciclos ante un 429. Un backoff exponencial con jitter sería más robusto, pero también más complejo de probar.

### 4.5 Pruebas E2E

Playwright o Cypress para el flujo registro → siembra → estimación. Requiere separar `app` de `listen` y un entorno con base de datos.

### 4.6 Pruebas de contrato

Verificar que el frontend y el backend coinciden en los modelos (`models.ts` contra los DTO del backend). Detecta rupturas antes de la demo.

### 4.7 Semilla de datos de prueba

Un script que cree un usuario, una siembra y una estimación para probar el flujo sin datos reales. Debe ser explícito y no correr en producción.

### 4.8 Healthcheck con más detalle

Hoy `/health` verifica la base. Podría informar también el estado del job, la última actualización de clima y la versión desplegada.

---

## 5. Datos y calidad

### 5.1 Extracción automatizada de CENTA

Hoy la exportación es manual. Un script que la automatice ahorraría trabajo, pero CENTA no tiene API y el scraping es frágil. Evaluar solo si el volumen lo justifica.

### 5.2 Validación cruzada de coordenadas

Contrastar los 26 distritos con una segunda fuente (IGN, OpenStreetMap) y documentar las diferencias. Hoy 15 tienen una sola fuente.

### 5.3 Normales más robustas

Calcular la normal con un periodo más largo o con varias fuentes, y comparar. Hoy son 20 años de ERA5 con 365 claves por distrito.

### 5.4 Historial de precios

Guardar los precios de F3 y F4 con fecha para que la estimación use el precio vigente y se pueda auditar después. F3 ya lleva fuente y fecha en `backend/src/estimacion/referencia.ts`; falta F4 y un historial de versiones, no solo el valor actual.

---

## 6. Cómo evaluar una idea

Antes de convertirla en trabajo, responder:

1. **¿Qué problema del agricultor resuelve?** Si no hay respuesta clara, es una idea de desarrollador.
2. **¿Qué dato necesita y existe?** Sin F1–F4, la estimación no mejora.
3. **¿Cuánto cuesta y qué se deja de hacer?** El equipo es de cuatro personas y el plazo es corto.
4. **¿Se puede demostrar en la presentación?** Lo que no se ve, no se evalúa.
5. **¿Rompe algún contrato?** Cambiar `events/types.ts`, `schema.prisma` o un DTO obliga a coordinar.

**Prioridad sugerida:** primero lo que hace más creíble la demo (mapa, gráficos, comparación entre distritos); después lo que mejora la precisión (F1–F4, ajuste por etapa); al final la infraestructura (cola, observabilidad).

---

## 7. Ideas descartadas

Se registran para no volver a discutirlas sin contexto nuevo.

| Idea | Por qué se descartó |
|---|---|
| Microservicios | Un solo equipo, un solo despliegue; agrega complejidad sin beneficio. |
| GraphQL | El API es pequeño y REST cubre los casos; el frontend ya consume REST. |
| Base de datos NoSQL | El modelo es relacional (distrito–capa–clase–área) y las consultas se benefician de SQL. |
| Autenticación con OAuth externo | No aporta al alcance y agrega dependencia de terceros. |
| Scraping de CENTA en producción | Frágil, sin contrato y dependiente de la disponibilidad del sitio. |
| Regresión lineal para estimar rendimiento | Sin datos históricos de parcelas, sería una falsa precisión. |
| App móvil nativa | La web responsive cubre la demo; una app duplica el trabajo. |
