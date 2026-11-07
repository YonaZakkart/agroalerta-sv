import { UMBRALES } from "./umbrales";

export interface DiaLluvia {
  fecha: string; // AAAA-MM-DD
  precipitacionMm: number | null;
  completo: boolean;
}

export interface ResumenLluvia {
  fecha: string | null; // último día completo usado (null si no hay ninguno)
  diasSecosConsecutivos: number;
  acumulado30Mm: number | null; // null si falta algún día de la ventana
  diasEnVentana: number;
  diasConDato: number;
}

// Función pura. Usa solo días con completo=true (el de hoy llega incompleto).
export function resumirLluvia(diario: readonly DiaLluvia[]): ResumenLluvia {
  const completos = diario
    .filter((d) => d.completo)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const ventana = completos.slice(-UMBRALES.VENTANA_DIAS);

  if (ventana.length === 0) {
    return { fecha: null, diasSecosConsecutivos: 0, acumulado30Mm: null, diasEnVentana: 0, diasConDato: 0 };
  }

  // DSC: desde el último día completo hacia atrás. Un null corta el conteo
  // (no se puede afirmar que fue seco): el DSC es una cota inferior.
  let dsc = 0;
  for (let i = ventana.length - 1; i >= 0; i--) {
    const mm = ventana[i]!.precipitacionMm;
    if (mm === null || mm >= UMBRALES.DIA_SECO_MAX_MM) break;
    dsc++;
  }

  const conDato = ventana.filter((d) => d.precipitacionMm !== null);
  const ventanaCompleta =
    ventana.length === UMBRALES.VENTANA_DIAS && conDato.length === ventana.length;
  const suma = conDato.reduce((s, d) => s + (d.precipitacionMm as number), 0);

  return {
    fecha: ventana[ventana.length - 1]!.fecha,
    diasSecosConsecutivos: dsc,
    acumulado30Mm: ventanaCompleta ? Math.round(suma * 10) / 10 : null,
    diasEnVentana: ventana.length,
    diasConDato: conDato.length,
  };
}