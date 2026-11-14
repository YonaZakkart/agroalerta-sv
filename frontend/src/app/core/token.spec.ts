import { expiracionDeToken, tokenVigente } from './token';

function tokenConPayload(payload: Record<string, unknown>): string {
  const base64url = (valor: string) =>
    btoa(valor).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url('{"alg":"HS256"}')}.${base64url(JSON.stringify(payload))}.firma`;
}

describe('token', () => {
  const ahora = 1_800_000_000_000;

  it('lee exp del payload sin verificar la firma', () => {
    const token = tokenConPayload({ sub: '1', exp: ahora / 1000 + 60 });
    expect(expiracionDeToken(token)).toBe(ahora / 1000 + 60);
  });

  it('considera vigente un token con exp futuro y vencido uno con exp pasado', () => {
    expect(tokenVigente(tokenConPayload({ exp: ahora / 1000 + 1 }), ahora)).toBe(true);
    expect(tokenVigente(tokenConPayload({ exp: ahora / 1000 - 1 }), ahora)).toBe(false);
  });

  it('rechaza tokens mal formados, sin exp o ausentes', () => {
    expect(tokenVigente(null, ahora)).toBe(false);
    expect(tokenVigente('', ahora)).toBe(false);
    expect(tokenVigente('no-es-un-jwt', ahora)).toBe(false);
    expect(tokenVigente('a.b.c', ahora)).toBe(false);
    expect(tokenVigente(tokenConPayload({ sub: '1' }), ahora)).toBe(false);
    expect(expiracionDeToken('a.b.c')).toBeNull();
  });
});
