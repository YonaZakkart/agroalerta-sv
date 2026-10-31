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
