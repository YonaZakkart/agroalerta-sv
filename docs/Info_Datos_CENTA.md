# AgroAlerta Morazán — Parte 2-A y 2-B: datos de viabilidad (CENTA)

Estado (actualizado en RAMA 15): 2-A implementado en RAMA 12 y 2-B implementado en RAMA 14; 2-C y 2-D pendientes. La sección 9 sigue siendo propuesta hasta implementarse.
Fecha de este documento: 6 de octubre de 2026. Responsable: Yona (RAMA 12, Parte 2-A; también RAMA 14, Parte 2-B).

---

## 1. Alcance y reparto de la Parte 2

- 2-A (Yona): modelo de datos en `schema.prisma` y su migración.
- 2-B (Yona, antes asignado a otra persona): datos de Morazán. Script de limpieza de los exports de CENTA, CSV limpios y script de carga (seed).
- 2-C (otra persona): servicio de consulta de viabilidad.
- 2-D (otra persona): endpoint y pruebas.

Lo que este documento fija entre 2-B y 2-C es el contrato de datos (secciones 6 y 9): quien haga el 2-C puede confiar en esas tablas y en esas reglas de interpretación.

## 2. Decisiones tomadas

1. Nivel geográfico: distrito. Morazán tiene 2 municipios (Norte y Sur) y 26 distritos. No hay datos por cantón en el mapa de CENTA; si algún día los hay, la estructura debe poder crecer.
2. Capas a usar (de la herramienta de consulta del mapa de CENTA): Potencial Maíz, Potencial Frijol, Potencial Sorgo (en el proyecto se llama Maicillo) y Riesgo de sequía.
3. Clases: potencial = Bajo / Medio / Alto; riesgo de sequía = Leve / Moderada / Severa.
4. Se guarda el área por clase de cada distrito (una fila por distrito × capa × clase), no una sola clase por distrito. Eso permite mejorar la granularidad después sin rehacer el modelo.
5. Unidad guardada: hectáreas (`ha`). No se guardan km² (es el mismo dato con 100 veces menos precisión) ni manzanas (siempre `mz = ha / 0.7` en este mapa; se calcula, no se guarda).
6. Clase ausente en un distrito = 0 ha (0 %). Esto es válido solo porque los exports son completos (todo Morazán, las 3 clases).
7. Porcentajes: se calculan sobre la suma de las áreas clasificadas del distrito, no sobre el área que muestra el mapa de distritos (en Chilanga: 59.99 km² clasificados contra 55.29 km² del mapa de distritos; son polígonos distintos).
8. Identificador del distrito: `Id_Distrito` = el código de CENTA (columna `Id_Muni` de los exports, valores 1301 a 1326). Se usa como llave primaria natural. Es el código antiguo de municipio; el nombre de la columna cambia porque ahora identifica distritos.
9. El nombre para mostrar y el municipio salen de la tabla de división territorial (tiene las tildes correctas). Los exports solo aportan el código y el área.
10. El 2-C devuelve SIEMPRE la distribución completa por clase (área y porcentaje). La clase dominante se incluye como dato resumido, destacado pero no único.
11. Temporadas (primera/postrera): fuera de la 2-C por ahora. Se resuelven cuando exista la API meteorológica (Parte 3).
12. Mostrar el mapa de CENTA en la página queda solo como sugerencia (idea: Leaflet con GeoJSON propio, vista Clima Zonal, Parte 6-D). No es parte del 2-A ni del 2-B.
13. Los CSV limpios los produce un script versionado, no una persona a mano ni una ejecución puntual. Los exports crudos se guardan en el repo como fuente. Una sola persona hace la extracción.
14. Capas futuras (caña, vainilla, banano, elevación, temperatura, humedad): fuera de la base mínima. Riesgo de sequía sí entra. El modelo debe permitir agregar capas insertando datos, sin nueva migración.

Por qué la distribución completa y no solo la clase dominante: con los datos reales, la clase dominante casi no discrimina entre distritos. Maíz es Bajo en 15 distritos, Medio en 8 y Alto en 3. Frijol es Medio en 19, Bajo en 6 y Alto en 1. Sorgo es Bajo en 20 y Medio en 6 (ninguno Alto). Sequía es Moderada en 24 distritos y Severa en 2. Ejemplo, Chilanga: maíz 19.9 % Alto / 46.3 % Medio / 33.7 % Bajo; sequía 35.1 % Leve / 51.5 % Moderada / 13.4 % Severa.

## 3. Cambios respecto al Mapa_inicial.txt (documentar en Estado_del_Proyecto.txt al cerrar la rama)

- 2-C: la consulta es por distrito + capa, no "zona + grano + temporada". La temporada queda diferida.
- 2-B: lo asume Yona, junto con el 2-A.
- 2-A/2-B: el catálogo Municipio (2) / Distrito (26) ya estaba anunciado desde RAMA 2; ahora se concreta aquí.
- Se agrega la capa de riesgo de sequía (no estaba en el Mapa).
- No hay "tabla de zonas" propiamente dicha; la unidad es el distrito.

## 4. Datos disponibles hoy

Archivos recibidos (todos validados con un script de revisión):

- Potencial maíz: 78 filas (26 distritos × 3 clases).
- Potencial frijol: 76 filas. Falta la clase Bajo en Arambala y Perquín.
- Potencial sorgo (maicillo): 74 filas. Falta la clase Alto en El Divisadero, El Rosario, Jocoro y San Carlos.
- Riesgo de sequía: 46 filas (26 Moderada, 10 Leve, 10 Severa). 16 distritos no tienen Leve y 16 no tienen Severa.
- División territorial: Morazán Norte 11 distritos, Morazán Sur 15. Coincide con la composición publicada.

Descartar: `Potencial_maíz__Resultado_de_la_consulta_2.csv` (versión vieja, solo Chilanga).

Hallazgos de la validación:

- Los 26 distritos aparecen en las 4 capas, sin filas duplicadas, todos con `Departamento` = MORAZÁN (`Id_Departa` = 13).
- El área total clasificada de cada distrito es la misma en las 4 capas (diferencias de hasta 0.01 km² por redondeo). Los porcentajes son comparables entre capas.
- Los 26 nombres de la tabla de división coinciden con los códigos de los exports tras normalizar mayúsculas y tildes.
- El nombre del distrito viene inconsistente en los exports (`PERQUÍN` con tilde, `SAN SIMON` y `DELICIAS DE CONCEPCION` sin ella). Por eso la llave es el código.
- Control de unidades: en todas las filas `km² × 100 = ha` (salvo redondeo) y `ha / mz = 0.7`.

### Formato de los exports (importante para el script)

- Codificación UTF-8 con BOM. Separador de columnas `;`. Campos entre comillas dobles.
- Números en formato inglés: coma de miles y punto decimal (ejemplo `"2,917.071"`). Es lo contrario de lo que muestra el pop-up del mapa (`2.779,24`).
- NO abrir ni volver a guardar estos archivos en Excel: puede reinterpretar los números y, al guardar, cambia el separador, la codificación y el formato.
- Defectos conocidos: el export de maíz repite el encabezado `ha` dos veces (la segunda columna es `mz`); en maíz y sorgo el texto de `Clase` trae espacios sobrantes (`" Potencial  Alto"`); el export de sequía usa otras columnas (ver abajo).
- La tabla de división territorial usa `,` como separador (distinto de los exports), no tiene BOM y está en formato ancho: dos columnas (`Morazan_Norte`, `Morazan_Sur`) con largo distinto; las celdas finales de la columna Norte están vacías.

### Columnas

Se usan: `Id_Muni` (código), `Municipio` (solo para validar), `Departamento` e `Id_Departa` (solo validar), el código de clase (`gridcode`, o `Valor` en sequía), el texto de clase (`Clase`, o `Riesgo Sequía` en sequía), `ha` y `km²` (solo para verificar `ha`).

Se ignoran: `OBJECTID`, `FID_Municipios`, `FID_Riesgo_Sequia`, `mz`, `Shape__Area`, `Shape__Length`, `x`, `y`.

### Códigos de clase por capa

| Capa (código interno) | Archivo crudo | Columna código | Columna texto | Clases |
|---|---|---|---|---|
| potencial_maiz | potencial_maiz.csv | gridcode | Clase | 1 Bajo, 2 Medio, 3 Alto |
| potencial_frijol | potencial_frijol.csv | gridcode | Clase | 1 Bajo, 2 Medio, 3 Alto |
| potencial_maicillo | potencial_maicillo.csv (CENTA lo llama "sorgo") | gridcode | Clase | 1 Bajo, 2 Medio, 3 Alto |
| riesgo_sequia | riesgo_sequia.csv | Valor | Riesgo Sequía | 1 Leve, 2 Moderada, 3 Severa |

Regla de oro: en potencial, un valor mayor es mejor; en sequía, un valor mayor es peor. Nunca comparar códigos entre capas; cada capa define sus propias clases.

## 5. Cómo se obtienen los exports (consulta en el mapa de CENTA)

Para cada capa, una consulta con: departamento Morazán, TODOS los distritos, TODAS las clases (Baja/Media/Alta; en sequía Leve/Moderada/Severa). Exportar a CSV. Una sola persona hace las 4 consultas. Anotar la fecha de extracción.

## 6. Modelo de datos propuesto (2-A)

Todo se agrega al final de `backend/prisma/schema.prisma`, bajo un comentario de sección "Parte 2 — Viabilidad", con tablas en snake_case mapeadas con `@map` como `usuarios`.

- Municipio: `id` autoincrement, `nombre` único ("Morazán Norte", "Morazán Sur").
- Distrito: `id` Int llave primaria SIN autoincrement (es el `Id_Distrito`, 1301 a 1326), `nombre` (con tildes, de la tabla de división), `municipioId` (FK). Opcional: una clave de búsqueda normalizada (mayúsculas, sin tildes) para emparejar el texto que el usuario escribe en el registro.
- Capa: `id`, `codigo` único (`potencial_maiz`, `potencial_frijol`, `potencial_maicillo`, `riesgo_sequia`), `nombre` para mostrar, `tipo` (POTENCIAL o RIESGO; define el sentido: mayor es mejor / mayor es peor) y `cultivo` opcional (Maíz, Frijol, Maicillo).
- ClaseCapa: `id`, `capaId`, `valor` Int (1 a 3), `nombre`. Único por (capaId, valor).
- AreaClase: `id`, `distritoId`, `claseId`, `areaHa` Decimal(12,3), `fuente` ("CENTA"), `fechaExtraccion` (fecha). Único por (distritoId, claseId).

Capas y clases son datos, no código: agregar una capa futura es insertar filas. Si una capa futura no se expresa en clases (por ejemplo elevación o temperatura como valor numérico), habrá que evaluar si encaja o necesita otra tabla.

Migración sugerida: `add_viabilidad`. Después de mergear: cada integrante corre `npx prisma generate` y `npx prisma migrate dev`.

Implementado en RAMA 12 (migración add_viabilidad). Diferencias respecto a esta propuesta: nombreNormalizado quedó obligatoria y única (no opcional) y tipo es el enum TipoCapa.

El campo `distrito` de Usuario sigue siendo texto libre. Validarlo contra este catálogo (o pasarlo a FK) queda pendiente de decisión (sección 11).

## 7. Script de limpieza (2-B)

### Ubicación propuesta

- Datos crudos versionados: `backend/data/centa/raw/` con nombres fijos, sin tildes ni espacios: `potencial_maiz.csv`, `potencial_frijol.csv`, `potencial_maicillo.csv`, `riesgo_sequia.csv`, `division_territorial_morazan.csv`, más `fuente.json` con `{"fuente": "CENTA", "fechaExtraccion": "AAAA-MM-DD"}`.
- Datos limpios versionados: `backend/data/centa/clean/` (`distritos.csv`, `areas_clase.csv`).
- Código: dentro de `backend/src/viabilidad/datos/` (por ejemplo `capas.config.ts`, `limpiar-centa.ts`, `cargar-centa.ts`). Se propone dentro de `src/` porque `tsconfig.json` tiene `rootDir: "./src"`; un script fuera de `src/` puede dar error de TypeScript al ejecutarlo con ts-node. Verificar al implementar.
- Scripts de `package.json` (propuesta): `datos:limpiar` y `datos:cargar`.
- Sin dependencias nuevas, para no generar conflictos en `package.json` / `package-lock.json`. Los exports tienen una estructura simple, así que basta un lector de CSV propio, siempre que se valide que cada fila tenga el mismo número de campos que el encabezado (eso detecta cualquier fallo de lectura). Si se prefiere una librería, hay que avisar al equipo.

### Configuración por capa

Un solo archivo (`capas.config.ts`) con, para cada capa: código, nombre, tipo, cultivo, nombre del archivo crudo, columna de código, columna de texto y mapa valor → nombre de clase (tabla de la sección 4). Es la única parte que cambia al agregar una capa.

### Pasos del script, en orden

1. Leer `fuente.json` y validar la fecha.
2. Leer cada export crudo: quitar el BOM, separador `;`, comillas dobles. Para cada fila verificar que tenga tantos campos como el encabezado. Buscar columnas por nombre y, si un nombre se repite (maíz, `ha`), tomar siempre la primera.
3. Normalizar texto: recortar y colapsar espacios; quitar el prefijo "Potencial " del texto de clase. Comparar con el nombre esperado para ese código; si no coinciden, error.
4. Convertir números: aceptar solo `^\d{1,3}(,\d{3})*(\.\d+)?$` o `^\d+(\.\d+)?$`; quitar las comas de miles y leer el punto como decimal. Cualquier otro formato es error.
5. Validar cada fila: `Id_Departa` = 13 y departamento MORAZÁN; `Id_Muni` entre 1301 y 1326; código de clase válido para la capa; `ha` mayor que 0; `km² × 100` igual a `ha` con tolerancia de 1 ha; sin duplicados de (distrito, clase).
6. Leer la tabla de división (separador `,`, formato ancho, ignorando celdas vacías). Convertir los encabezados a "Morazán Norte" y "Morazán Sur". Verificar 26 distritos únicos, cada uno en un solo municipio.
7. Emparejar por llave normalizada (mayúsculas, sin tildes, espacios colapsados): todo código de los exports debe tener su distrito en la tabla de división y viceversa; cada código debe tener un solo nombre en todas las capas; deben salir exactamente 26 distritos.
8. Completar con 0 ha las clases ausentes, de modo que cada capa tenga 26 × 3 = 78 filas. Reportar cuáles se completaron.
9. Verificar que el área total de cada distrito coincida entre capas (tolerancia de 5 ha).
10. Si hay cualquier error: listar TODOS los errores (no solo el primero), terminar con código de salida 1 y NO escribir ningún archivo limpio. Si todo está bien, escribir los archivos.

### Salidas (determinísticas, para que el `git diff` sea legible)

- `distritos.csv`: `id_distrito,distrito,municipio` (26 filas, ordenadas por código).
- `areas_clase.csv`: `capa,id_distrito,valor,clase,area_ha` (312 filas, ordenadas por capa en el orden maíz, frijol, maicillo, sequía; luego por distrito; luego por valor).
- Formato de salida: UTF-8 sin BOM, separador `,`, saltos de línea LF, `area_ha` con punto decimal, sin separadores de miles y con 3 decimales.

### Control numérico esperado con los datos actuales

- Filas leídas: maíz 78, frijol 76, maicillo 74, sequía 46.
- Filas completadas con 0 ha: 38 (frijol 2, maicillo 4, sequía 32).
- `areas_clase.csv`: 312 filas. `distritos.csv`: 26 filas (11 en Morazán Norte, 15 en Morazán Sur).

### Cómo usarlo (flujo)

1. Hacer las 4 consultas en el mapa (sección 5) y exportar los CSV.
2. Renombrarlos con los nombres fijos y copiarlos a `backend/data/centa/raw/`. Actualizar `fuente.json` con la fecha. Sin abrirlos en Excel.
3. Correr `npm run datos:limpiar` dentro de `backend/`. Si falla, corregir según el reporte; no se escribe nada hasta que pase.
4. Revisar con `git diff` los CSV limpios (en la primera corrida no hay diff previo; comparar con los controles numéricos de arriba).
5. Correr `npm run datos:cargar`.
6. Subir al repo los crudos y los limpios juntos.

Si CENTA actualiza el mapa, repetir desde el paso 1. Los exports crudos de versiones anteriores se reemplazan; Git conserva el historial.

## 8. Script de carga (seed) (2-B)

- Lee `clean/distritos.csv` y `clean/areas_clase.csv`, no los crudos. Así no depende del formato de CENTA.
- Idempotente: usa upsert (correrlo dos veces no duplica). Todo dentro de una transacción: si algo falla, no queda carga a medias.
- Orden: Municipio, Distrito, Capa y ClaseCapa (salen de `capas.config.ts`), AreaClase.
- Validaciones mínimas antes de escribir: 26 distritos, 2 municipios, 4 capas, 12 clases, 312 áreas, sin áreas negativas.
- Usa el cliente compartido `import { prisma } from "../../config/prisma"` (ajustar la ruta relativa), nunca instanciar `PrismaClient` aparte. Pasar las áreas a Decimal como texto.
- Opcional: conectarlo con `prisma db seed`. Confirmar en la documentación de Prisma 7 dónde se declara el comando (la configuración vive en `prisma7.config.ts`); si no es necesario, basta el script de `package.json`.
- Después del merge, cada integrante hace: `npx prisma generate`, `npx prisma migrate dev`, `npm run datos:cargar`.

### Nota de implementación (RAMA 14)

Implementado en backend/src/viabilidad/datos/: capas.config.ts, utilidades.ts (archivo adicional, compartido), limpiar-centa.ts y cargar-centa.ts. Scripts: npm run datos:limpiar y npm run datos:cargar (ts-node-dev --transpile-only), siempre desde backend/. Donde las secciones 7 y 8 difieren de lo siguiente, prevalece esta nota.

- Crudos en backend/data/centa/raw/ con los nombres reales: Potencial_maiz.csv, Potencial_frijol.csv, Potencial_sorgo.csv (maicillo), Riesgo_sequia.csv, division_territorial_morazan.csv y fuente.json ({"fuente": "CENTA", "fechaExtraccion": "AAAA-MM-DD"}).
- Salidas en backend/data/centa/clean/: distritos.csv (id_distrito, distrito, municipio; 26 filas) y areas_clase.csv (capa, id_distrito, valor, clase, area_ha; 312 filas; 3 decimales). UTF-8 sin BOM, separador ",", saltos LF.
- Tolerancias: |km2 x 100 - ha| <= 1 ha por fila; diferencia del área total de un distrito entre capas <= 5 ha (observada: 1.100 ha). Más de 3 decimales en un área se rechaza. Sin ningún error de validación no se escribe nada.
- Carga: upsert dentro de una transacción; si las tablas quedan con una cantidad de filas distinta de ESPERADO (2 municipios, 26 distritos, 4 capas, 12 clases, 312 áreas), se revierte. No se conectó prisma db seed.
- Controles verificados con los datos reales: 78, 76, 74 y 46 filas leídas; 38 clases completadas con 0 ha (frijol 2, maicillo 4, sequía 32); Chilanga en maíz suma 5998.537 ha; fecha_extraccion guardada sin desfase de zona horaria.

## 9. Contrato para el 2-C (cómo se usarán los datos)

- Entrada: id de distrito (y opcionalmente capa o cultivo).
- Para cada capa devuelve la distribución COMPLETA: clase, valor, área en ha y porcentaje. Los porcentajes se calculan sobre la suma de las áreas de ese distrito en esa capa; el redondeo (un decimal) es solo de presentación, por lo que la suma visible puede dar 99.9 o 100.1.
- Incluye la clase dominante (la de mayor área) como dato resumido, sin reemplazar la distribución.
- Incluye el distrito, su municipio, la fuente y la fecha de extracción.
- La unidad es el distrito, no la parcela. La recomendación debe redactarse como referencia distrital ("el 34 % del distrito tiene potencial bajo para maíz"), no como veredicto sobre el terreno del agricultor. Citar a CENTA como fuente en la interfaz.
- Manzanas solo para mostrar: `mz = ha / 0.7`, con la constante definida en un único lugar.
- Errores con el contrato de /auth ya unificado: `{ error, detalles }`. Un id inválido es 400 con `error: "Datos inválidos"`. Los 500 no devuelven `error.message`.

Ejemplo de respuesta (Chilanga, maíz; valores reales de los datos):

```json
{
  "distrito": { "id": 1304, "nombre": "Chilanga", "municipio": "Morazán Sur" },
  "fuente": "CENTA",
  "capas": [
    {
      "codigo": "potencial_maiz",
      "tipo": "POTENCIAL",
      "dominante": "Medio",
      "distribucion": [
        { "clase": "Bajo",  "valor": 1, "areaHa": 2024.138, "porcentaje": 33.7 },
        { "clase": "Medio", "valor": 2, "areaHa": 2779.240, "porcentaje": 46.3 },
        { "clase": "Alto",  "valor": 3, "areaHa": 1195.159, "porcentaje": 19.9 }
      ]
    }
  ]
}
```

Riesgo de sequía de Chilanga: Leve 2104.254 ha (35.1 %), Moderada 3092.186 ha (51.5 %), Severa 802.098 ha (13.4 %).

Ver también el Mapa: el 2-C no cubre temporadas por ahora (decisión 11).

## 10. Riesgos de merge y archivos compartidos

- `backend/prisma/schema.prisma` y `prisma/migrations/`: archivos compartidos. Agregar los modelos al final, en su propia sección. Si hay conflicto de orden de migraciones, quien mergee segundo regenera su migración sobre la versión actualizada de `main`.
- `backend/package.json`: solo se agregan los dos scripts de `package.json`. Sin dependencias nuevas no se toca el lock.
- `backend/src/index.ts`: lo toca el 2-D al montar el router, no el 2-A ni el 2-B.
- `events/types.ts`: no se toca en el 2-A ni el 2-B.
- Comprobar que `.gitignore` no excluya `backend/data/`.
- Después de cada pull que cambie `schema.prisma`: `npx prisma generate` y `npx prisma migrate dev`.

## 11. Pendientes y decisiones abiertas

- Validar o relacionar `Usuario.distrito` (hoy texto libre) con el catálogo. Quién lo hace y cuándo: por definir; toca archivos de la Parte 1 (`registro.routes.ts` y el modelo).
- Si el endpoint de viabilidad exige `requireAuth`: por definir (se sugiere que sí).
- Fuente oficial de la división territorial: hoy coincide con publicaciones secundarias; opcionalmente confrontarla con el texto de la Ley Especial de Reestructuración Municipal.
- Capas futuras (caña, vainilla, banano, elevación, temperatura, humedad): evaluar cuando se vean sus datos.
- Pruebas automatizadas del limpiador (conversión de números, validaciones) y del 2-C/2-D: sin definir; las validaciones del script hacen de control mientras tanto.
- Temporadas: diferidas hasta la API meteorológica.
- Rendimientos de referencia (qq/mz) y rango de precipitación (para la Parte 3-B): no están en este mapa; hay que conseguirlos de otra fuente.
- Documentar al cerrar la rama, en Estado_del_Proyecto.txt, los cambios de la sección 3.
