import { REFERENCIA_COSTOS } from "./referencia";
import type { CultivoEstimacion, RubroReferencia } from "./referencia";

// Estimación de costos de siembra (4-C). Función pura: no toca base de datos,
// red ni relojes. Los precios y dosis viven en referencia.ts, con su fuente y
// fecha; aquí solo se aplican las reglas de cálculo.
//
// Regla de redondeo: las unidades que se compran enteras (libras, quintales y
// jornales) se redondean hacia arriba. La maquinaria, el alquiler y el riego se
// cobran por manzana, así que se prorratean por el área y se redondean a
// centavos hacia arriba.

const EPSILON = 1e-9;

export interface OpcionesEstimacion {
  alquilaTerreno: boolean;
  usaMaquinaria: boolean;
  usaRiego: boolean;
}

export interface LineaEstimacion {
  concepto: string;
  tipoCalculo: "UNIDADES" | "POR_MANZANA";
  cantidadPorMz: number;
  unidad: string;
  cantidadCalculada: number;
  cantidadComprada: number;
  precioUnitarioUsd: number;
  subtotalUsd: number;
  fuente: string;
  fecha: string;
  tipo: "OFICIAL" | "SUPUESTO";
  nota?: string;
}

export interface EstimacionCostos {
  cultivo: CultivoEstimacion;
  areaMz: number;
  ficha: string;
  lineas: LineaEstimacion[];
  totalUsd: number;
  fuentes: { fuente: string; fecha: string }[];
}

function centavosHaciaArriba(usd: number): number {
  return Math.ceil(usd * 100 - EPSILON);
}

function validarEntrada(cultivo: CultivoEstimacion, areaMz: number): void {
  if (!Object.prototype.hasOwnProperty.call(REFERENCIA_COSTOS, cultivo)) {
    throw new RangeError(`Cultivo desconocido: ${String(cultivo)}`);
  }
  if (!Number.isFinite(areaMz) || areaMz <= 0) {
    throw new RangeError("areaMz debe ser un número finito mayor que cero");
  }
  if (areaMz > 999999.99) {
    throw new RangeError("areaMz no puede superar 999 999.99 manzanas");
  }
}

function construirLinea(rubro: RubroReferencia, areaMz: number): LineaEstimacion {
  const base = {
    concepto: rubro.concepto,
    fuente: rubro.fuente,
    fecha: rubro.fecha,
    tipo: rubro.tipo,
    ...(rubro.nota !== undefined && { nota: rubro.nota }),
  };

  if (rubro.tipoCalculo === "UNIDADES") {
    const cantidadCalculada = rubro.dosisPorMz * areaMz;
    const cantidadComprada = Math.ceil(cantidadCalculada - EPSILON);
    const subtotalCentavos = centavosHaciaArriba(cantidadComprada * rubro.precioUnitarioUsd);
    return {
      ...base,
      tipoCalculo: rubro.tipoCalculo,
      cantidadPorMz: rubro.dosisPorMz,
      unidad: rubro.unidad,
      cantidadCalculada,
      cantidadComprada,
      precioUnitarioUsd: rubro.precioUnitarioUsd,
      subtotalUsd: subtotalCentavos / 100,
    };
  }

  // Los servicios se cobran por manzana: no se redondean a pases enteros
  // porque una pasada de tractor cubre la parcela completa.
  const subtotalCentavos = centavosHaciaArriba(areaMz * rubro.costoPorMzUsd);
  return {
    ...base,
    tipoCalculo: rubro.tipoCalculo,
    cantidadPorMz: 1,
    unidad: "mz",
    cantidadCalculada: areaMz,
    cantidadComprada: areaMz,
    precioUnitarioUsd: rubro.costoPorMzUsd,
    subtotalUsd: subtotalCentavos / 100,
  };
}

export function estimarCostos(
  cultivo: CultivoEstimacion,
  areaMz: number,
  opciones: OpcionesEstimacion,
): EstimacionCostos {
  validarEntrada(cultivo, areaMz);

  const referencia = REFERENCIA_COSTOS[cultivo];
  const rubros = referencia.rubros.filter((rubro) => {
    if (rubro.tipoCalculo !== "POR_MANZANA" || rubro.requiere === undefined) return true;
    return opciones[rubro.requiere];
  });

  const lineas = rubros.map((rubro) => construirLinea(rubro, areaMz));
  const totalUsd = Math.round(lineas.reduce((total, linea) => total + linea.subtotalUsd, 0) * 100) / 100;
  const fuentes = Array.from(
    new Map(lineas.map((linea) => [`${linea.fuente}|${linea.fecha}`, { fuente: linea.fuente, fecha: linea.fecha }])).values(),
  );

  return {
    cultivo,
    areaMz,
    ficha: referencia.ficha,
    lineas,
    totalUsd,
    fuentes,
  };
}
