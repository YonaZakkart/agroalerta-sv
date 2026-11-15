# Info_Datos_Clima – Umbrales de lluvia y ventanas de temporada (3-0c)

Documento de datos para 3-B (clasificación de la condición climática) y para el resto de la Parte 3. Cubre el punto F2 del Mapa v2 (sección 5).
Responsable: Smith. Fecha de consulta de las fuentes: 2 de noviembre de 2026.

**Estado: F2 resuelto solo en parte.** Las bandas de sequía por días secos consecutivos tienen respaldo institucional (MARN). Los umbrales en milímetros o en porcentaje de la norma NO se encontraron publicados con cifras: se presentan como SUPUESTOS declarados, nunca como dato oficial (regla de la sección 5 del Mapa v2). Las ventanas de primera y postrera vienen de fuentes secundarias (prensa que cita al gremio CAMPO, y GEOGLAM), no de una guía técnica de CENTA.

## 1. Qué fija este documento

1. Cómo se decide cada una de las tres condiciones: sequía, exceso de lluvia, invierno aceptable.
2. Qué datos necesita 3-B para decidirlo (entradas) y qué devuelve (salida).
3. Las ventanas de fechas de primera y postrera.
4. Qué valor tiene respaldo, cuál es supuesto y qué queda por conseguir.

No fija código ni modifica `events/types.ts` (eso es 3-0a). No usa ninguno de los valores de ejemplo de `dashboard_base.html` (por ejemplo "Normal (180-220 mm)"): no son datos reales (regla 7 del Mapa v2).

## 2. Tipos de valor

| tipo | significado |
|------|-------------|
| OFICIAL_MARN | criterio publicado por el MARN (Observatorio de Amenazas), conocido a través de sus informes citados en prensa; no se leyó el documento técnico original |
| SECUNDARIA | cifra o fecha tomada de prensa o de una organización no oficial |
| SUPUESTO | valor elegido por el equipo, con justificación; hay que revisarlo con un agrónomo o con datos |

## 3. Sequía: días secos consecutivos (DSC)

El MARN clasifica la sequía meteorológica por la cantidad de días secos consecutivos de cada estación. Bandas vistas en sus informes de 2026:

| categoría | días secos consecutivos | tipo |
|-----------|-------------------------|------|
| Débil | hasta 10 (el límite inferior no se confirmó) | OFICIAL_MARN |
| Moderada | 11 a 15 | OFICIAL_MARN |
| Fuerte | 16 a 20 | OFICIAL_MARN |
| Severa | más de 21 | OFICIAL_MARN |

Lagunas:
- El día 21 exacto no queda cubierto por lo publicado. Supuesto: 21 o más es severa.
- Qué cuenta como "día seco": el MARN habla de días sin precipitaciones significativas y no da la cifra. **Supuesto: día seco = precipitación diaria menor a 1 mm.** Hay que revisarlo antes de fijarlo en 3-B.

## 4. Sequía y exceso: acumulado de 30 días frente a la norma

El MARN expresa déficit y exceso como porcentaje frente a la norma histórica (por ejemplo, un agosto proyectado en 231.7 mm contra una norma de 305.5 mm, clasificado "bajo lo normal"; eso es el 75.8 % de la norma). No se encontró una tabla con los cortes numéricos. Se propone:

`razon30 = lluvia acumulada de los últimos 30 días / normal de los mismos 30 días` (misma celda de Open-Meteo)

| condición | regla | tipo | justificación |
|-----------|-------|------|---------------|
| SEQUIA | DSC ≥ 11 (moderada o peor) **o** razon30 < 0.60 | SUPUESTO (el DSC ≥ 11 usa bandas OFICIAL_MARN) | 0.60 equivale a un déficit mayor al 40 %, del orden de los déficits que el MARN y Protección Civil reportaron en 2026 (41 % en mayo, 35.7 % acumulado a agosto). Un déficit leve (razon30 entre 0.60 y 0.80) no alerta, para no avisar casi todas las semanas |
| EXCESO | razon30 ≥ 1.50 | SUPUESTO | el MARN reportó un octubre con 27 % más lluvia sin hablar de exceso: 1.50 queda claramente por encima. No hay cifra institucional |
| INVIERNO_ACEPTABLE | cualquier otro caso dentro de la época lluviosa | SUPUESTO | |

Orden de evaluación: SEQUIA primero, luego EXCESO, luego ACEPTABLE.

Reglas de guarda (SUPUESTO):
- Solo se evalúa dentro de la época lluviosa (sección 6) más la transición. Fuera de ella la norma de 30 días es muy baja y la razón no significa nada.
- Si `normal30` < 20 mm, no se calcula la razón (evita dividir entre casi cero). 20 mm es un valor elegido, no una cifra de fuente.
- Una consulta fallida de Open-Meteo NO cambia la condición: se conserva la última y se reintenta.

## 5. De dónde sale la "norma"

Hace falta una normal por distrito. No existe una tabla del MARN por distrito en el repositorio. Propuesta (SUPUESTO, a confirmar en 3-A):
- Calcular la normal con el archivo histórico de Open-Meteo para cada celda, sobre la misma ventana de 30 días y varios años.
- Usar la misma fuente (Open-Meteo) para la normal y para el dato actual, de modo que el sesgo del modelo se cancele en la razón.
- Los 26 distritos caen en 11 celdas de 0.1° (ver `Info_Datos_Coordenadas.md`, sección 9): agrupar las consultas por celda.
- Antes de fijar el contrato hay que verificar en la documentación oficial de Open-Meteo los términos de uso, la atribución, el período histórico disponible y el nombre exacto de los parámetros diarios (así lo pide 3-A).
- El MARN usa la serie 1981-2010 y estaciones propias: la normal de Open-Meteo no coincidirá con la del MARN. Declararlo en la interfaz.

Alternativa si no se consigue la normal: clasificar solo con DSC y dejar el exceso sin evaluar. Decisión del equipo (sección 9).

## 6. Ventanas de temporada

| temporada | siembra | ciclo | tipo | fuente |
|-----------|---------|-------|------|--------|
| Época lluviosa | mayo a octubre | | SECUNDARIA | SNET, regionalización climática (doc00205) |
| Transición lluviosa a seca | 15 de octubre al 15 de noviembre (normal) | | OFICIAL_MARN (declaración citada en prensa) | Infobae, 13-oct-2026 |
| Primera | mayo a junio, con el inicio de las lluvias | mayo a septiembre | SECUNDARIA | CAMPO vía Infobae y El Mundo (2026); GEOGLAM vía Wikifarmer (2026) |
| Postrera | agosto a septiembre | agosto a enero | SECUNDARIA | CAMPO vía Infobae y EFE (2026); GEOGLAM vía Wikifarmer (2026) |
| Apante (riego) | a la salida de la época lluviosa | | SECUNDARIA | EFE vía Revista EyN (2026); solo 5 % del maíz y del frijol |

Particularidades que importan en Morazán (oriente):
- La postrera pesa más que la primera en el oriente: el gremio describe la producción oriental concentrada en la postrera.
- En la postrera el maíz abre el ciclo; el frijol y el maicillo se siembran después, en asocio. El maicillo (sorgo) se produce solo en postrera.
- En 2026 la canícula empezó el 23 de junio, antes de lo habitual. No es un dato de calibración: no ajustar umbrales a un año de El Niño.

**Ventanas operativas propuestas para el sistema (SUPUESTO, redondeadas a meses completos):**

| id | inicio siembra | fin siembra | fin del ciclo |
|----|----------------|-------------|---------------|
| primera | 01-05 | 30-06 | 30-09 |
| postrera | 01-08 | 30-09 | 31-01 |

Formato MM-DD, sin año. Julio queda fuera de ambas ventanas de siembra a propósito. Una fecha de siembra fuera de ventana no se rechaza: se avisa (decisión para 4-B y 5-C).

## 7. Contrato para 3-B

Entradas de la función de clasificación (pura, sin base ni red):
- `diasSecosConsecutivos: number`
- `acumulado30Mm: number`
- `normal30Mm: number | null`
- `fecha: string` (AAAA-MM-DD, para saber si está en época lluviosa)

Salida: `condicion` (`SEQUIA` | `EXCESO` | `INVIERNO_ACEPTABLE`, o sin evaluación fuera de época; ver sección 9), y como dato adicional `nivelSequia` (`DEBIL`, `MODERADA`, `FUERTE`, `SEVERA` o `null`) según la sección 3.

Los umbrales de este documento van como constantes con su tipo, fuente y fecha en un solo archivo de `clima/`, sin valores sueltos en la función. Cada constante lleva un comentario con la fila de esta tabla.

## 8. Fuentes consultadas (2 de noviembre de 2026)

- MARN, Observatorio de Amenazas, informes de sequía meteorológica 2026, vía El Mundo, El Salvador.com e Infobae: bandas por días secos consecutivos, inicio de la canícula (23 de junio), déficit de 41 % en mayo y de 35.7 % acumulado a agosto, agosto proyectado en 231.7 mm contra norma de 305.5 mm.
- MARN, "Transición e inicio de la época lluviosa 2026", 27 de mayo de 2026: confirma que el inicio de la época lluviosa se decide con umbrales de precipitación acumulada, pero el documento no los publica. https://snet.gob.sv/UserFiles/meteorologia/establecimiento_epoca_lluviosa_informe1_2026.pdf
- Infobae, 13 de octubre de 2026, transición lluviosa a seca (15 de octubre al 15 de noviembre).
- CAMPO (gremial), vía Infobae, agosto y septiembre de 2026: ventanas de primera y postrera, reparto por cultivo, siembra del frijol y el sorgo después del maíz en el oriente.
- EFE vía Revista EyN, 2026: postrera en agosto y septiembre; apante o de riego.
- GEOGLAM vía Wikifarmer, 2026: primera de mayo a septiembre, postrera de agosto a enero.
- SNET, regionalización climática (doc00205): época lluviosa de mayo a octubre y seca de noviembre a abril; Morazán y el norte de La Unión se incluyen en la región III.

La cobertura es media: varias fuentes son prensa o un gremio, no guías técnicas.

## 9. Decisiones abiertas y pendientes

Decisiones del equipo:
1. ¿Una cuarta salida "sin evaluación / época seca"? El contrato del Mapa v2 (3-0a) solo nombra tres condiciones. Cambia el payload de `CondicionClimaticaActualizada`: coordinar con quien edite `events/types.ts`.
2. Confirmar o ajustar los SUPUESTOS: día seco < 1 mm, SEQUIA con razon30 < 0.60, EXCESO con razon30 ≥ 1.50, guarda de 20 mm.
3. Si no hay normal disponible: clasificar solo con DSC (sección 5).
4. Evitar oscilaciones: si la condición cambia de un día para otro y 3-C emite un evento solo ante cambios, conviene un margen. Decidirlo en 3-B/3-C.

Por conseguir (sin código):
- Cifras de requerimiento hídrico por etapa de maíz y frijol: los boletines agrometeorológicos del MARN traen una figura de requerimiento hídrico por etapa para la estación de San Francisco Gotera (ejemplo: boletín del 21 al 30 de septiembre de 2022, con siembras de maíz el 10 de junio y de frijol el 1 de agosto). No se extrajeron los valores.
- Guías técnicas de CENTA por cultivo con época de siembra y requerimiento de agua (no se encontró ninguna con cifras en esta búsqueda).
- El documento del MARN con los umbrales de inicio de época lluviosa y con las categorías completas de sequía (límite inferior de "débil").
- Confirmar las ventanas con un agrónomo o con CENTA, o con un agricultor de Morazán.

## 10. Limitaciones

- Los supuestos de la sección 4 no están calibrados contra datos de campo. Pueden producir alertas de más o de menos.
- Una sola serie diaria por celda de varios kilómetros no capta tormentas locales ni la diferencia entre cabecera y cantones.
- La sequía meteorológica del MARN no equivale a pérdida de cultivo (el propio MARN lo aclara): la recomendación debe decirlo.
- Los rendimientos no dependen de este documento; los ajustes de rendimiento por clima siguen siendo supuestos documentados (5-B).