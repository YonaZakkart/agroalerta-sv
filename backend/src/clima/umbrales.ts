// Umbrales de clasificación (3-B). Fuente: docs/Info_Datos_Clima.md.
// Cada constante indica su tipo (OFICIAL_MARN / SUPUESTO) y su sección.
// Regla: ningún valor suelto en las funciones de clasificación.

export const UMBRALES = {
  // Sección 3 (lagunas). SUPUESTO: día seco = lluvia diaria < 1 mm.
  DIA_SECO_MAX_MM: 1,

  // Sección 3, bandas por días secos consecutivos (DSC).
  // OFICIAL_MARN. El día 21 exacto no está cubierto: SUPUESTO, se toma como severa.
  DSC_MODERADA: 11,
  DSC_FUERTE: 16,
  DSC_SEVERA: 21,
  // Límite inferior de "débil" sin confirmar por el MARN: no se produce DEBIL.
  DSC_DEBIL_MIN: null as number | null,

  // Sección 4. SUPUESTO.
  SEQUIA_RAZON_MAX: 0.6, // razon30 < 0.60 => SEQUIA
  EXCESO_RAZON_MIN: 1.5, // razon30 >= 1.50 => EXCESO_LLUVIA
  // Sección 4, reglas de guarda. SUPUESTO.
  NORMAL_MIN_MM: 20, // con normal30 < 20 mm no se calcula la razón
  // Sección 9, decisión 4 (anti-oscilación). SUPUESTO.
  MARGEN_RAZON: 0.05,

  // Ventana de lluvia acumulada (Info_Datos_OpenMeteo.md, sección 2.1).
  VENTANA_DIAS: 30,

  // Sección 4 y 6. SUPUESTO: época lluviosa (mayo-octubre) + transición
  // (hasta el 15 de noviembre). Formato MM-DD.
  EPOCA_INICIO: "05-01",
  EPOCA_FIN: "11-15",
} as const;