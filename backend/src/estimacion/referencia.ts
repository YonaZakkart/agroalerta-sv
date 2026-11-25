// Precios y dosis de referencia de la estimación de costos (4-C).
//
// Fuente principal: MAG/DGEA/DEA, "Costos de producción de cultivos agrícolas",
// ciclo 2022-2023, publicado el 21 de febrero de 2024. Es el informe oficial más
// reciente que se consiguió; los precios son promedios de agroservicio del ciclo
// y deben revisarse antes de presentarlos como vigentes.
//
// Se toma una ficha por cultivo porque el formulario de siembra no pregunta
// nivel tecnológico ni temporada:
//   - maíz: ficha semitecnificada (la opción intermedia del informe),
//   - frijol: ficha de invierno (la siembra principal),
//   - maicillo: ficha semi-tecnificada (el informe lo llama sorgo).
// Las otras fichas del informe quedan como alternativa documentada en
// docs/data/Info_Datos_Precios.md.
//
// Regla: ningún precio ni dosis sueltos en la función de cálculo. Todo valor
// conserva fuente, fecha y tipo (OFICIAL o SUPUESTO).

export type CultivoEstimacion = "MAIZ" | "FRIJOL" | "MAICILLO";

export type TipoValor = "OFICIAL" | "SUPUESTO";

export type UnidadCompra = "lb" | "QQ" | "jornal";

export interface ValorReferencia {
  fuente: string;
  fecha: string;
  tipo: TipoValor;
  nota?: string;
}

/** Rubro que se compra en unidades enteras: semilla, fertilizante o jornales. */
export interface RubroUnidades extends ValorReferencia {
  tipoCalculo: "UNIDADES";
  concepto: string;
  dosisPorMz: number;
  unidad: UnidadCompra;
  precioUnitarioUsd: number;
}

/** Rubro que se cobra por manzana: protección, maquinaria, alquiler o riego. */
export interface RubroPorManzana extends ValorReferencia {
  tipoCalculo: "POR_MANZANA";
  concepto: string;
  costoPorMzUsd: number;
  requiere?: "alquilaTerreno" | "usaMaquinaria" | "usaRiego";
}

export type RubroReferencia = RubroUnidades | RubroPorManzana;

export interface ReferenciaCultivo {
  cultivo: CultivoEstimacion;
  ficha: string;
  paginaPdf: number;
  rubros: RubroReferencia[];
}

const MAG = {
  fuente: "MAG/DGEA/DEA — Costos de producción de cultivos agrícolas 2022-2023",
  fecha: "2024-02-21",
  tipo: "OFICIAL",
} as const;

const RIEGO = {
  fuente:
    "MAG/DGEA/DEA — Costos de producción de cultivos agrícolas 2022-2023, arroz tecnificado (distrito de riego), cuota de agua",
  fecha: "2024-02-21",
  tipo: "SUPUESTO",
  nota: "El informe no trae cuota de agua para maíz, frijol ni maicillo; se usa la de arroz de riego como referencia.",
} as const;

export const REFERENCIA_COSTOS: Record<CultivoEstimacion, ReferenciaCultivo> = {
  MAIZ: {
    cultivo: "MAIZ",
    ficha: "Maíz semitecnificado",
    paginaPdf: 15,
    rubros: [
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Semilla", dosisPorMz: 24.21, unidad: "lb", precioUnitarioUsd: 3.91 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Fertilizante formulado", dosisPorMz: 3.88, unidad: "QQ", precioUnitarioUsd: 50.86 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Sulfato de amonio", dosisPorMz: 4.63, unidad: "QQ", precioUnitarioUsd: 30.74 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Urea", dosisPorMz: 3.12, unidad: "QQ", precioUnitarioUsd: 44.74 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Insecticidas y foliares", costoPorMzUsd: 15.48 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Herbicidas", costoPorMzUsd: 15.81 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Mano de obra", dosisPorMz: 50, unidad: "jornal", precioUnitarioUsd: 8.11 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Maquinaria (rastra, surcado y aporco)", costoPorMzUsd: 131.91, requiere: "usaMaquinaria" },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Alquiler de la tierra", costoPorMzUsd: 63.09, requiere: "alquilaTerreno" },
      { ...RIEGO, tipoCalculo: "POR_MANZANA", concepto: "Riego (cuota de agua)", costoPorMzUsd: 63.64, requiere: "usaRiego" },
    ],
  },
  FRIJOL: {
    cultivo: "FRIJOL",
    ficha: "Frijol de invierno",
    paginaPdf: 12,
    rubros: [
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Semilla", dosisPorMz: 100, unidad: "lb", precioUnitarioUsd: 0.85 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Fertilizante formulado", dosisPorMz: 2.59, unidad: "QQ", precioUnitarioUsd: 54.67 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Sulfato de amonio", dosisPorMz: 2, unidad: "QQ", precioUnitarioUsd: 28 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Insecticidas y foliares", costoPorMzUsd: 21 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Fungicidas", costoPorMzUsd: 23.41 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Herbicidas", costoPorMzUsd: 11.73 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Mano de obra", dosisPorMz: 57, unidad: "jornal", precioUnitarioUsd: 8.5 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Alquiler de la tierra", costoPorMzUsd: 62.5, requiere: "alquilaTerreno" },
      { ...RIEGO, tipoCalculo: "POR_MANZANA", concepto: "Riego (cuota de agua)", costoPorMzUsd: 63.64, requiere: "usaRiego" },
    ],
  },
  MAICILLO: {
    cultivo: "MAICILLO",
    ficha: "Sorgo semi-tecnificado (maicillo)",
    paginaPdf: 16,
    rubros: [
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Semilla", dosisPorMz: 13.1, unidad: "lb", precioUnitarioUsd: 0.52 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Fertilizante formulado", dosisPorMz: 3.72, unidad: "QQ", precioUnitarioUsd: 51.33 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Sulfato de amonio", dosisPorMz: 3.87, unidad: "QQ", precioUnitarioUsd: 33 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Insecticidas y foliares", costoPorMzUsd: 18.01 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Herbicidas", costoPorMzUsd: 8.09 },
      { ...MAG, tipoCalculo: "UNIDADES", concepto: "Mano de obra", dosisPorMz: 37, unidad: "jornal", precioUnitarioUsd: 8 },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Maquinaria (rastra y surcado)", costoPorMzUsd: 118.34, requiere: "usaMaquinaria" },
      { ...MAG, tipoCalculo: "POR_MANZANA", concepto: "Alquiler de la tierra", costoPorMzUsd: 63.33, requiere: "alquilaTerreno" },
      { ...RIEGO, tipoCalculo: "POR_MANZANA", concepto: "Riego (cuota de agua)", costoPorMzUsd: 63.64, requiere: "usaRiego" },
    ],
  },
};
