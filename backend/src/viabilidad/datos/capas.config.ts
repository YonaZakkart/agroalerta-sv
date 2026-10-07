// Configuración de las capas de viabilidad (CENTA).
// Es la única parte que cambia al agregar una capa: la usan tanto
// limpiar-centa.ts como cargar-centa.ts.

// Mismos valores que el enum TipoCapa de schema.prisma. Se declara aquí (y no se
// importa del cliente generado) para que el limpiador funcione sin base de datos.
export type TipoCapa = "POTENCIAL" | "RIESGO";

export interface CapaConfig {
    codigo: string; // se guarda en capas.codigo
    nombre: string; // nombre para mostrar
    tipo: TipoCapa; // POTENCIAL: valor mayor = mejor; RIESGO: valor mayor = peor
    cultivo: string | null;
    archivo: string; // export crudo dentro de data/centa/raw/
    columnaCodigo: string; // columna del export con el código numérico de la clase
    columnaTexto: string; // columna del export con el texto de la clase
    clases: Readonly<Record<number, string>>; // valor -> nombre de la clase
}

export const ARCHIVO_DIVISION = "division_territorial_morazan.csv";
export const ARCHIVO_FUENTE = "fuente.json";

const CLASES_POTENCIAL = { 1: "Bajo", 2: "Medio", 3: "Alto" } as const;
const CLASES_SEQUIA = { 1: "Leve", 2: "Moderada", 3: "Severa" } as const;

// El orden de este arreglo es el orden de las capas en los CSV limpios.
export const CAPAS: readonly CapaConfig[] = [
    {
        codigo: "potencial_maiz",
        nombre: "Potencial de maíz",
        tipo: "POTENCIAL",
        cultivo: "Maíz",
        archivo: "Potencial_maiz.csv",
        columnaCodigo: "gridcode",
        columnaTexto: "Clase",
        clases: CLASES_POTENCIAL,
    },
    {
        codigo: "potencial_frijol",
        nombre: "Potencial de frijol",
        tipo: "POTENCIAL",
        cultivo: "Frijol",
        archivo: "Potencial_frijol.csv",
        columnaCodigo: "gridcode",
        columnaTexto: "Clase",
        clases: CLASES_POTENCIAL,
    },
    {
        codigo: "potencial_maicillo",
        nombre: "Potencial de maicillo",
        tipo: "POTENCIAL",
        cultivo: "Maicillo",
        archivo: "Potencial_sorgo.csv", // CENTA lo llama "sorgo"
        columnaCodigo: "gridcode",
        columnaTexto: "Clase",
        clases: CLASES_POTENCIAL,
    },
    {
        codigo: "riesgo_sequia",
        nombre: "Riesgo de sequía",
        tipo: "RIESGO",
        cultivo: null,
        archivo: "Riesgo_sequia.csv",
        columnaCodigo: "Valor",
        columnaTexto: "Riesgo Sequía",
        clases: CLASES_SEQUIA,
    },
];