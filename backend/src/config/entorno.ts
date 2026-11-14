// Validación de las variables de entorno críticas al arrancar. Antes, un
// JWT_EXPIRES_IN inválido o un DUI_PEPPER débil solo se notaban al primer
// login/registro; aquí el proceso falla de inmediato y con todos los errores
// juntos. La función es pura para poder probarla sin tocar process.env.

export interface Entorno {
  [clave: string]: string | undefined;
}

export const JWT_SECRET_MIN = 32;
export const DUI_PEPPER_MIN = 32;

// Formato de JWT_EXPIRES_IN: segundos ("7200") o duración compacta ("2h",
// "7d", "30m"). jsonwebtoken acepta más variantes, pero esta es la documentada
// en .env.example y evita valores que fallarían recién al firmar el token.
const DURACION = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)?$/i;

export function duracionJwtValida(valor: string): boolean {
  const coincidencia = DURACION.exec(valor.trim());
  return coincidencia !== null && Number(coincidencia[1]) > 0;
}

export function validarEntorno(env: Entorno): string[] {
  const errores: string[] = [];

  const jwtSecret = env.JWT_SECRET ?? "";
  if (jwtSecret === "") {
    errores.push("Falta JWT_SECRET en backend/.env (ver .env.example)");
  } else if (jwtSecret.length < JWT_SECRET_MIN) {
    errores.push(`JWT_SECRET debe tener al menos ${JWT_SECRET_MIN} caracteres`);
  }

  const duiPepper = env.DUI_PEPPER ?? "";
  if (duiPepper === "") {
    errores.push("Falta DUI_PEPPER en backend/.env (ver .env.example)");
  } else if (duiPepper.length < DUI_PEPPER_MIN) {
    errores.push(
      `DUI_PEPPER debe tener al menos ${DUI_PEPPER_MIN} caracteres; uno corto se puede adivinar por fuerza bruta`,
    );
  }

  const expiracion = env.JWT_EXPIRES_IN ?? "";
  if (expiracion.trim() !== "" && !duracionJwtValida(expiracion)) {
    errores.push('JWT_EXPIRES_IN debe ser un número de segundos o una duración como "2h", "7d" o "30m"');
  }

  // El flag devuelve el token de verificación en la respuesta: es solo para
  // desarrollo (todavía no hay envío de correo). En producción no debe existir.
  const produccion = (env.NODE_ENV ?? "").trim().toLowerCase() === "production";
  const exponeToken = (env.EXPONER_TOKEN_VERIFICACION ?? "").trim().toLowerCase() === "true";
  if (produccion && exponeToken) {
    errores.push("EXPONER_TOKEN_VERIFICACION no puede ser true con NODE_ENV=production");
  }

  return errores;
}
