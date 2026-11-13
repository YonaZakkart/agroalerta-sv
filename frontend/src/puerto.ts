// process.env.PORT llega como string; app.listen("4000") lo interpreta como un
// socket Unix. Se valida y convierte antes de escuchar.
const PUERTO_MIN = 1;
const PUERTO_MAX = 65535;

export function leerPuerto(valor: string | undefined, porDefecto: number): number {
  const texto = valor?.trim() ?? '';
  if (texto === '') return porDefecto;

  if (!/^\d+$/.test(texto)) {
    throw new Error(`PORT debe ser un número entero entre ${PUERTO_MIN} y ${PUERTO_MAX}; recibido: "${valor}"`);
  }

  const puerto = Number(texto);
  if (!Number.isSafeInteger(puerto) || puerto < PUERTO_MIN || puerto > PUERTO_MAX) {
    throw new Error(`PORT debe estar entre ${PUERTO_MIN} y ${PUERTO_MAX}; recibido: "${valor}"`);
  }

  return puerto;
}
