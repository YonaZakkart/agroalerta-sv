export interface ApiError {
  error: string;
  detalles?: string | string[];
}

export interface Municipio {
  id: number;
  nombre: string;
}

export interface Distrito {
  id: number;
  nombre: string;
  municipio: Municipio;
}

export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  distrito: Distrito;
}

export interface RespuestaLogin {
  token: string;
  usuario: Usuario;
}

export interface RespuestaRegistro extends Usuario {
  verificado: boolean;
  fechaRegistro: string;
  // Solo existe si el backend tiene EXPONER_TOKEN_VERIFICACION=true (desarrollo).
  tokenVerificacion_DEV?: string;
}

export interface RespuestaVerificacion {
  mensaje: string;
  usuario: { id: number; correo: string; verificado: boolean };
}

export interface RespuestaDistritos {
  distritos: Distrito[];
}

export interface DatosRegistro {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  dui: string;
  distrito: string; // se envía el nombre; el backend lo valida contra el catálogo
}

export type Cultivo = 'maiz' | 'frijol' | 'maicillo';

// Se envía como ?cultivo= (el backend lo compara sin tildes ni mayúsculas).
export const CULTIVOS: { valor: Cultivo; etiqueta: string }[] = [
  { valor: 'maiz', etiqueta: 'Maíz' },
  { valor: 'frijol', etiqueta: 'Frijol' },
  { valor: 'maicillo', etiqueta: 'Maicillo' },
];

export type TipoCapa = 'POTENCIAL' | 'RIESGO';

export interface ClaseViabilidad {
  valor: number;
  nombre: string;
  areaHa: number;
  areaMz: number;
  porcentaje: number; // ya redondeado por el servidor, no recalcular
}

export interface CapaViabilidad {
  codigo: string;
  nombre: string;
  tipo: TipoCapa;
  cultivo: string | null; // null en riesgo_sequia
  totalHa: number;
  totalMz: number;
  claseDominante: { valor: number; nombre: string; porcentaje: number } | null;
  clases: ClaseViabilidad[];
}

export interface RespuestaViabilidad {
  distrito: { id: number; nombre: string };
  municipio: Municipio;
  fuente: string | null;
  fechaExtraccion: string | null; // YYYY-MM-DD
  capas: CapaViabilidad[];
}

export interface PerfilUsuario extends Usuario {
  verificado: boolean;
  fechaRegistro: string;
}

export interface RespuestaPerfil {
  success: boolean;
  usuario: PerfilUsuario;
}


// ---- Siembra (Parte 4, 4-A). Los valores son los del enum de Prisma, tal cual se envían.
export type CultivoSiembra = 'MAIZ' | 'FRIJOL' | 'MAICILLO';

export const CULTIVOS_SIEMBRA: { valor: CultivoSiembra; etiqueta: string }[] = [
  { valor: 'MAIZ', etiqueta: 'Maíz' },
  { valor: 'FRIJOL', etiqueta: 'Frijol' },
  { valor: 'MAICILLO', etiqueta: 'Maicillo' },
];

export type EstadoSiembra = 'POR_SEMBRAR' | 'SEMBRADO';

export type UnidadSemilla = 'LIBRAS' | 'BOLSAS';

// Body de POST /siembras (contrato por confirmar con 4-D).
// usuarioId no se envía: el backend lo toma del token.
// Con exactOptionalPropertyTypes, los opcionales vacíos se omiten, no se ponen en undefined.
export interface DatosSiembra {
  distritoId: number;
  cultivo: CultivoSiembra;
  estado: EstadoSiembra;
  fechaSiembra: string; // AAAA-MM-DD
  areaMz: number;
  cantidadSemilla?: number;
  unidadSemilla?: UnidadSemilla;
  alquilaTerreno: boolean;
  usaMaquinaria: boolean;
  usaRiego: boolean;
  inversionTotalUsd: number;
  costoSemillaUsd?: number;
  costoAlquilerUsd?: number;
  costoMaquinariaUsd?: number;
  costoRiegoUsd?: number;
  costoOtrosUsd?: number;
}
// ---- Estimación (Parte 5, 5-D). GET /estimaciones devuelve el historial del usuario.
export type CondicionClimatica = 'SEQUIA' | 'EXCESO_LLUVIA' | 'INVIERNO_ACEPTABLE';
export type NivelSequia = 'DEBIL' | 'MODERADA' | 'FUERTE' | 'SEVERA';
export type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface SupuestoEstimacion {
  clave: string;
  valor: number | string;
  unidad: string;
  tipo: 'OFICIAL' | 'SUPUESTO';
  fuente: string;
  fecha: string;
  nota?: string;
}

export interface ViabilidadReferencia {
  capa: string;
  claseDominante: string;
  porcentaje: number;
  fuente: string | null;
  fechaExtraccion: string | null;
}

export interface Estimacion {
  id: number;
  siembraId: number;
  distritoId: number;
  cultivo: CultivoSiembra;
  estado: EstadoSiembra;
  areaMz: number;
  fechaSiembra: string; // AAAA-MM-DD
  condicion: CondicionClimatica | null;
  nivelSequia: NivelSequia | null;
  fechaDatos: string | null;
  actualizadoEn: string | null;
  rendimientoBaseQqPorMz: number;
  factorClimatico: number;
  rendimientoEstimadoQqPorMz: number;
  produccionEstimadaQq: number;
  precioVentaQqUsd: number;
  ingresoEstimadoUsd: number;
  nivelRiesgo: NivelRiesgo;
  titulo: string;
  mensaje: string;
  motivos: string[];
  viabilidad: ViabilidadReferencia | null;
  supuestos: SupuestoEstimacion[];
  calculadoEn: string;
}

export interface RespuestaEstimaciones {
  estimaciones: Estimacion[];
}

// El dashboard usa el cultivo en minúsculas; el backend devuelve el enum en mayúsculas.
export const CULTIVO_A_ENUM: Record<Cultivo, CultivoSiembra> = {
  maiz: 'MAIZ',
  frijol: 'FRIJOL',
  maicillo: 'MAICILLO',
};
