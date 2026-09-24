export const EVENTOS = {
    AGRICULTOR_REGISTRADO: "AgricultorRegistrado",
} as const;

export interface AgricultorRegistradoPayload {
    usuarioId: number;
    correo: string;
    distrito: string;
    fechaRegistro: Date;
}