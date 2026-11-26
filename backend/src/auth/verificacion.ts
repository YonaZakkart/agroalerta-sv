// Verificación automática de correo (MVP de producción).
// Se activa solo con VERIFICACION_AUTOMATICA=true. Es una solución temporal
// mientras no hay proveedor de correo: el usuario queda verificado al registrarse.
export function verificacionAutomaticaActiva(
  entorno: NodeJS.ProcessEnv = process.env,
): boolean {
  return entorno.VERIFICACION_AUTOMATICA === "true";
}
