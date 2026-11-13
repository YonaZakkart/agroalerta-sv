// process.env.PORT siempre llega como string. Pasarlo tal cual a app.listen()
// hace que Node lo interprete como la ruta de un socket Unix, no como un puerto
// TCP ("3000" crea un archivo llamado 3000). Aquí se valida y se convierte.
const PUERTO_MIN = 1;
const PUERTO_MAX = 65535;

export function leerPuerto(valor: string | undefined, porDefecto: number): number {
  const texto = valor?.trim() ?? "";
  if (texto === "") return porDefecto;

  if (!/^\d+$/.test(texto)) {
    throw new Error(`PORT debe ser un número entero entre ${PUERTO_MIN} y ${PUERTO_MAX}; recibido: "${valor}"`);
  }

  const puerto = Number(texto);
  if (!Number.isSafeInteger(puerto) || puerto < PUERTO_MIN || puerto > PUERTO_MAX) {
    throw new Error(`PORT debe estar entre ${PUERTO_MIN} y ${PUERTO_MAX}; recibido: "${valor}"`);
  }

  return puerto;
}
