// El token se guarda como JWT y el frontend puede leer su expiración sin
// verificarlo (la firma la valida el backend). Sirve para no considerar
// autenticada una sesión ya vencida antes de la primera petición.

export function expiracionDeToken(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(relleno)) as { exp?: unknown };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Un token sin exp o con exp en el pasado no cuenta como sesión válida. */
export function tokenVigente(token: string | null, ahoraMs: number = Date.now()): boolean {
  if (token === null) return false;
  const expiracion = expiracionDeToken(token);
  return expiracion !== null && expiracion * 1000 > ahoraMs;
}
