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
