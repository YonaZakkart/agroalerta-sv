import { leerPuerto } from './puerto';

describe('leerPuerto', () => {
  it('usa el valor por defecto cuando PORT no está definido o está vacío', () => {
    expect(leerPuerto(undefined, 4000)).toBe(4000);
    expect(leerPuerto('', 4000)).toBe(4000);
    expect(leerPuerto('   ', 4000)).toBe(4000);
  });

  it('convierte un puerto válido de string a number', () => {
    expect(leerPuerto('4000', 4000)).toBe(4000);
    expect(leerPuerto(' 8080 ', 4000)).toBe(8080);
    expect(leerPuerto('65535', 4000)).toBe(65535);
  });

  it('rechaza valores que no son un puerto TCP', () => {
    for (const valor of ['0', '65536', '-1', 'abc', '3.5', '4000abc']) {
      expect(() => leerPuerto(valor, 4000)).toThrow(/PORT debe/);
    }
  });
});
