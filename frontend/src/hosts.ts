// Hosts que el SSR acepta en la cabecera Host. Dejar la lista vacía hacía que
// Angular rechazara cualquier render (o que se abriera de más si se usaba "*").
// Por defecto solo se acepta el desarrollo local; en despliegue se define
// NG_ALLOWED_HOSTS con los dominios reales separados por comas.

export const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]'] as const;

export function leerHostsPermitidos(valor: string | undefined): string[] {
  const hosts = (valor ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host !== '');
  return hosts.length > 0 ? hosts : [...HOSTS_LOCALES];
}
