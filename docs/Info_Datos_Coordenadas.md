# Info_Datos_Coordenadas – Coordenadas por distrito (3-0b)

Documento de los datos de ubicación de los 26 distritos de Morazán. Los usa el cliente de Open-Meteo (3-A) para consultar el clima por distrito.
Última actualización: 1 de noviembre de 2026.

## 1. Qué es una coordenada en este proyecto

Un punto representativo por distrito: la ubicación de la localidad con el nombre del distrito (en la práctica, su asentamiento principal), en grados decimales, sistema WGS84 (EPSG:4326). No es el centroide del polígono distrital ni sirve para medir áreas.

Open-Meteo trabaja con celdas de varios kilómetros, así que una diferencia de pocos cientos de metros entre un punto y otro no cambia el resultado. Por eso no se buscó cartografía oficial de límites.

## 2. Por qué no se usaron las columnas x e y de CENTA

Las columnas `x` e `y` de los exports de CENTA vienen vacías en los CSV crudos y no se sabe en qué sistema estarían. Se descartaron. Las coordenadas vienen de una fuente nueva, documentada abajo, y no son datos de CENTA.

## 3. Fuente

- **Fuente principal:** GeoNames, archivo `SV.txt` de https://download.geonames.org/export/dump/SV.zip. Licencia CC BY 4.0 (exige atribución).
- **Fecha de consulta:** descarga del 1 de noviembre de 2026 (21:57, hora de El Salvador). La columna `fecha_consulta` del CSV puede decir 2026-11-02 porque el script usa hora UTC.
- **Tipo de dato:** de terceros, no oficial (no proviene de una institución del Estado). Se documenta como dato publicado y contrastado, no como dato oficial.
- **Contraste:** infobox de Wikipedia (coordenadas redondeadas al minuto de arco, unos 2 km) para los distritos donde se encontró. No es una verificación independiente: es probable que Wikipedia y GeoNames compartan el mismo origen, por lo que una coincidencia confirma que no hay un error de transcripción, no que el punto sea exacto
- **Complemento manual:** Yamabal se tomó de OpenStreetMap (ver sección 6).

## 4. Método

1. Se descargó `SV.txt` y se filtraron las localidades de Morazán (código admin1 `08`, obtenido a partir de Arambala, que solo existe en Morazán). El filtro por departamento evita los homónimos: San Carlos, San Fernando, San Isidro, Sociedad y San Francisco Gotera existen también en otros departamentos.
2. Para cada uno de los 26 nombres del catálogo se buscaron las localidades pobladas (clase `P`) de Morazán con ese nombre, sin distinguir tildes ni mayúsculas, y se eligió la de mayor rango (`PPLA2`, `PPLA`, `PPLA3`, `PPL`). Si había empate, el script **no elige**: deja la fila vacía y la marca para revisión manual.
3. El script que rellena el archivo vive fuera del repo (no se versiona) y solo escribe `backend/data/referencia/coordenadas_distritos.csv`.
4. Se contrastó con Wikipedia donde fue posible (sección 5).

## 5. Valores

Formato: grados decimales, 5 decimales (GeoNames). "Contraste" indica si el valor de Wikipedia coincide dentro de su redondeo.

| id | distrito | latitud | longitud | GeoNames id | contraste |
|----|----------|---------|----------|-------------|-----------|
| 1301 | Arambala | 13.91667 | -88.13333 | 3587341 | coincide |
| 1302 | Cacaopera | 13.76667 | -88.08333 | 3587208 | solo GeoNames |
| 1303 | Corinto | 13.81083 | -87.97139 | 3586884 | solo GeoNames |
| 1304 | Chilanga | 13.71667 | -88.11667 | 3587050 | solo GeoNames |
| 1305 | Delicias de Concepción | 13.78333 | -88.13333 | 3586811 | solo GeoNames |
| 1306 | El Divisadero | 13.60000 | -88.05000 | 3586492 | coincide |
| 1307 | El Rosario | 13.86667 | -88.21667 | 3586008 | coincide (Wikipedia 13.86597, -88.21000; diferencia de 0.007°) |
| 1308 | Gualococti | 13.81667 | -88.21667 | 3585668 | coincide |
| 1309 | Guatajiagua | 13.66667 | -88.20000 | 3585653 | coincide |
| 1310 | Joateca | 13.90000 | -88.05000 | 3585435 | coincide |
| 1311 | Jocoaitique | 13.90000 | -88.15000 | 3585431 | solo GeoNames |
| 1312 | Jocoro | 13.61667 | -88.01667 | 3585427 | coincide |
| 1313 | Lolotiquillo | 13.73333 | -88.08333 | 3584712 | solo GeoNames |
| 1314 | Meanguera | 13.85000 | -88.15000 | 3584406 | solo GeoNames |
| 1315 | Osicala | 13.80000 | -88.15000 | 3584197 | solo GeoNames |
| 1316 | Perquín | 13.95000 | -88.16667 | 3584105 | solo GeoNames |
| 1317 | San Carlos | 13.65000 | -88.10000 | 3583810 | solo GeoNames |
| 1318 | San Fernando | 13.96667 | -88.20000 | 3583756 | solo GeoNames |
| 1319 | San Francisco Gotera | 13.69408 | -88.10407 | 3583747 | solo GeoNames (único marcado como sede, PPLA) |
| 1320 | San Isidro | 13.85000 | -88.23333 | 3583691 | solo GeoNames |
| 1321 | San Simón | 13.83333 | -88.23333 | 3583336 | coincide |
| 1322 | Sensembra | 13.66667 | -88.16667 | 3583161 | coincide |
| 1323 | Sociedad | 13.70000 | -88.01667 | 3583111 | solo GeoNames |
| 1324 | Torola | 13.91667 | -88.23333 | 3582913 | coincide |
| 1325 | Yamabal | 13.664228 | -88.172484 | (ver sección 6) | OpenStreetMap |
| 1326 | Yoloaiquín | 13.76667 | -88.15000 | 3582817 | solo GeoNames |

Resumen del contraste: 10 distritos coinciden con Wikipedia; 15 tienen una sola fuente (GeoNames); Yamabal se resolvió aparte.
Las coincidencias con Wikipedia no son contraste independiente (ver sección 3)

## 6. Casos especiales

- **El Rosario:** GeoNames tiene tres localidades con ese nombre en Morazán (3586007, 3586008 y 3586019) y el script no eligió. Se tomó la 3586008 porque la ubicación de Wikipedia para el distrito (13.86597, -88.21000) es la más cercana (0.007°, unos 700 m). La 3586007 queda a unos 0.04° y la 3586019 está en el sur del departamento.
- **Yamabal:** GeoNames y Wikipedia dan para Yamabal exactamente el mismo punto que para Sensembra (13.667, -88.167). Son distritos distintos y la validación del limpiador rechaza dos distritos con el mismo punto. Se eligió el centro de la huella de la Iglesia de Yamabal en OpenStreetMap (13.664228, -88.172484), consultada el 1 de noviembre de 2026 con asistencia de Copilot. La geometría puede consultarse en https://www.openstreetmap.org/way/400064946.
- **Distritos que no son sede:** casi todos los distritos aparecen como `PPL` (lugar poblado) y no como cabecera, salvo San Francisco Gotera. Por eso la elección se basó en que el nombre sea único dentro de Morazán, y se contrastó con Wikipedia donde se pudo.

## 7. Contrato de los archivos

Entrada: `backend/data/referencia/coordenadas_distritos.csv` (UTF-8 sin BOM, separador `,`).

| columna | contenido |
|---------|-----------|
| `id_distrito` | código CENTA 1301 a 1326 |
| `distrito` | nombre, debe coincidir con el catálogo |
| `latitud` | decimal, de 4 a 6 decimales |
| `longitud` | decimal, de 4 a 6 decimales |
| `fuente` | obligatoria |
| `fecha_consulta` | AAAA-MM-DD |
| `nota` | libre (id de GeoNames, código, observaciones) |

Salida: `backend/data/centa/clean/distritos.csv` ahora tiene las columnas `latitud` y `longitud` al final. Las escribe `npm run datos:limpiar` y las lee `npm run datos:cargar`.

En la base: `distritos.latitud` y `distritos.longitud`, `DECIMAL(9,6)`, **opcionales** (`NULL` permitido). La carga exige que las 26 vengan llenas, pero la columna es opcional para no obligar a los demás a reiniciar su base al aplicar la migración. El cliente de Open-Meteo (3-A) debe tratar `null` como error.

## 8. Validaciones

Aplicadas en `limpiar-centa.ts` (función `leerCoordenadas`) y repetidas en `cargar-centa.ts` (función `errorDeCoordenada`):

- formato decimal con 4 a 6 decimales
- rango razonable de Morazán: latitud entre 13.55 y 14.02, longitud entre -88.30 y -87.90 (el mínimo y máximo de los 26 puntos más un margen de unos 0.05°)
- el `id_distrito` debe existir en el catálogo y no repetirse
- el nombre debe coincidir con el del catálogo (sin distinguir tildes ni mayúsculas)
- `fuente` obligatoria y `fecha_consulta` válida
- no puede haber dos distritos con el mismo punto
- deben existir los 26 distritos

## 9. Precisión y limitaciones

- Precisión real: 23 de los 26 puntos son múltiplos exactos de 1 minuto de arco (por ejemplo 13.91667 = 13°55'), es decir, una resolución de unos 1.8 km, aunque se escriban con 5 decimales. Solo Corinto, San Francisco Gotera y Yamabal tienen precisión mayor. El error práctico es de hasta pocos kilómetros.
- Quince distritos tienen una sola fuente. Si alguno resulta mal ubicado, se corrige en `coordenadas_distritos.csv` y se vuelve a correr `datos:limpiar` y `datos:cargar`.
- Es un punto por distrito: distritos grandes pueden tener clima distinto entre su cabecera y sus cantones.
- Los 26 puntos caen en 11 celdas de 0.1°, con hasta 6 distritos por celda. Varios distritos pueden recibir el mismo dato de Open-Meteo; 3-A debe tenerlo en cuenta (por ejemplo, agrupando consultas por celda).

## 10. Atribución

Datos de ubicación tomados de GeoNames (https://www.geonames.org), licencia CC BY 4.0. La atribución debe aparecer en la aplicación (por ejemplo, en la vista de Clima Zonal o en la documentación final), pendiente para 6-D o 7-D.
