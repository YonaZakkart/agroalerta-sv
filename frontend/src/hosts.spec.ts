import { HOSTS_LOCALES, leerHostsPermitidos } from './hosts';

describe('leerHostsPermitidos', () => {
  it('sin NG_ALLOWED_HOSTS usa solo el desarrollo local', () => {
    expect(leerHostsPermitidos(undefined)).toEqual([...HOSTS_LOCALES]);
    expect(leerHostsPermitidos('')).toEqual([...HOSTS_LOCALES]);
    expect(leerHostsPermitidos('  ,  ')).toEqual([...HOSTS_LOCALES]);
  });

  it('lee la lista separada por comas y descarta vacíos', () => {
    expect(leerHostsPermitidos('app.example.com, agroalerta.example.com')).toEqual([
      'app.example.com',
      'agroalerta.example.com',
    ]);
  });

  it('no transforma el comodín: queda a decisión explícita del despliegue', () => {
    expect(leerHostsPermitidos('*')).toEqual(['*']);
  });
});
