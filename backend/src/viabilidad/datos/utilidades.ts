// Utilidades compartidas por limpiar-centa.ts y cargar-centa.ts:
// acumulador de errores, lector de CSV, conversión de números y normalización de nombres.

import { readFileSync } from "fs";
import { basename } from "path";

/** Acumula errores para reportarlos todos juntos (el limpiador no se detiene en el primero). */
export class Reporte {
  readonly errores: string[] = [];

  error(mensaje: string): void {
    this.errores.push(mensaje);
  }

  get hayErrores(): boolean {
    return this.errores.length > 0;
  }
}

export interface FilaCsv {
  /** Número de línea en el archivo (1 = encabezado). */
  linea: number;
  /** Valor de cada celda por nombre de columna. Si un nombre se repite, gana la primera. */
  celdas: Map<string, string>;
}

export interface TablaCsv {
  archivo: string;
  encabezados: string[];
  filas: FilaCsv[];
}

interface RegistroCrudo {
  linea: number;
  campos: string[];
}

/**
 * Separa el texto en registros y campos. Soporta campos entre comillas dobles
 * (con "" como comilla escapada) y saltos de línea CRLF o LF. Ignora líneas vacías.
 */
function separarRegistros(
  texto: string,
  separador: string,
  archivo: string,
  reporte: Reporte,
): RegistroCrudo[] {
  const registros: RegistroCrudo[] = [];
  let campos: string[] = [];
  let campo = "";
  let enComillas = false;
  let hayContenido = false;
  let linea = 1;
  let lineaInicio = 1;

  const cerrarRegistro = (): void => {
    if (hayContenido) {
      campos.push(campo);
      registros.push({ linea: lineaInicio, campos });
    }
    campos = [];
    campo = "";
    hayContenido = false;
  };

  for (let i = 0; i < texto.length; i++) {
    const c = texto.charAt(i);

    if (enComillas) {
      if (c === '"') {
        if (texto.charAt(i + 1) === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
          const siguiente = texto.charAt(i + 1);
          if (siguiente !== "" && siguiente !== separador && siguiente !== "\n" && siguiente !== "\r") {
            reporte.error(`${archivo}: línea ${linea}: texto inesperado después de cerrar comillas`);
          }
        }
      } else {
        if (c === "\n") linea++;
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      if (campo !== "") {
        reporte.error(`${archivo}: línea ${linea}: comilla inesperada en medio de un campo`);
      }
      if (!hayContenido) lineaInicio = linea;
      enComillas = true;
      hayContenido = true;
    } else if (c === separador) {
      if (!hayContenido) lineaInicio = linea;
      campos.push(campo);
      campo = "";
      hayContenido = true;
    } else if (c === "\r") {
      // se ignora: el "\n" siguiente cierra el registro
    } else if (c === "\n") {
      cerrarRegistro();
      linea++;
    } else {
      if (!hayContenido) lineaInicio = linea;
      campo += c;
      hayContenido = true;
    }
  }

  if (enComillas) {
    reporte.error(`${archivo}: comillas sin cerrar al final del archivo`);
  }
  cerrarRegistro();
  return registros;
}

/**
 * Lee un CSV. Quita el BOM, acepta CRLF/LF y exige que cada fila tenga tantos campos
 * como el encabezado (si no, la reporta y la descarta). Devuelve null si no puede leer el archivo.
 */
export function leerCsv(ruta: string, separador: string, reporte: Reporte): TablaCsv | null {
  const archivo = basename(ruta);

  let texto: string;
  try {
    texto = readFileSync(ruta, "utf8");
  } catch {
    reporte.error(`${archivo}: no se pudo leer el archivo (${ruta})`);
    return null;
  }

  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  if (texto.includes("\uFFFD")) {
    reporte.error(`${archivo}: contiene bytes que no son UTF-8 válido`);
  }

  const registros = separarRegistros(texto, separador, archivo, reporte);
  const cabecera = registros[0];
  if (cabecera === undefined) {
    reporte.error(`${archivo}: el archivo está vacío`);
    return null;
  }

  const encabezados = cabecera.campos.map((h) => h.trim());
  const filas: FilaCsv[] = [];

  for (const registro of registros.slice(1)) {
    if (registro.campos.length !== encabezados.length) {
      reporte.error(
        `${archivo}: línea ${registro.linea}: tiene ${registro.campos.length} campos y el encabezado tiene ${encabezados.length}`,
      );
      continue;
    }
    const celdas = new Map<string, string>();
    encabezados.forEach((nombre, j) => {
      if (!celdas.has(nombre)) celdas.set(nombre, registro.campos[j] ?? "");
    });
    filas.push({ linea: registro.linea, celdas });
  }

  return { archivo, encabezados, filas };
}

/** Verifica que existan todas las columnas indicadas; reporta cada una que falte. */
export function exigirColumnas(tabla: TablaCsv, nombres: readonly string[], reporte: Reporte): boolean {
  let completas = true;
  for (const nombre of nombres) {
    if (!tabla.encabezados.includes(nombre)) {
      reporte.error(`${tabla.archivo}: falta la columna "${nombre}"`);
      completas = false;
    }
  }
  return completas;
}

/** Valor de una celda (cadena vacía si la columna no existe). */
export function celda(fila: FilaCsv, nombre: string): string {
  return fila.celdas.get(nombre) ?? "";
}

/** Descripción corta de una fila para los mensajes de error. */
export function ubicacion(tabla: TablaCsv, fila: FilaCsv): string {
  return `${tabla.archivo}, línea ${fila.linea}`;
}

export interface Numero {
  /** Número en texto, sin separador de miles y con exactamente 3 decimales (para escribir en los CSV limpios). */
  texto: string;
  /** El mismo número como Number (solo para comparaciones y validaciones). */
  valor: number;
}

const FORMATO_NUMERO = /^(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?$/;

/**
 * Convierte un número en el formato de los exports de CENTA (coma de miles, punto decimal;
 * ejemplo "2,917.071"). Devuelve null si el formato no es válido o si tiene más de 3 decimales.
 */
export function parsearNumero(crudo: string): Numero | null {
  const t = crudo.trim();
  if (!FORMATO_NUMERO.test(t)) return null;

  const [entera = "", decimales = ""] = t.replace(/,/g, "").split(".");
  if (decimales.length > 3) return null;

  const texto = `${entera}.${decimales.padEnd(3, "0")}`;
  return { texto, valor: Number(texto) };
}

// colapsarEspacios y normalizarNombre viven ahora en src/comun/normalizar.ts.
// Se re-exportan aquí para que limpiar-centa.ts y cargar-centa.ts sigan funcionando sin cambios.
export { colapsarEspacios, normalizarNombre } from "../../comun/normalizar";