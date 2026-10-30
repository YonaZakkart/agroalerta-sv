// Fragmento de select compartido por registro, login y GET /auth/yo:
// el distrito del usuario con su municipio, derivado del catálogo (Parte 2).
export const SELECT_DISTRITO = {
  select: {
    id: true,
    nombre: true,
    municipio: { select: { id: true, nombre: true } },
  },
} as const;