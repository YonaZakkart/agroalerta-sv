import argon2 from "argon2";
import { createHash, createHmac, randomBytes } from "crypto";
import { prisma } from "../config/prisma";
import { bus } from "../events/bus";
import { EVENTOS, AgricultorRegistradoPayload } from "../events/types";

export interface DatosRegistro {
    nombres: string;
    apellidos: string;
    correo: string;
    contrasena: string;
    dui: string;
    distrito: string;
}

export class RegistroError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

function hashDui(dui: string): string {
    const pepper = process.env.DUI_PEPPER;
    if (!pepper) throw new Error("DUI_PEPPER no está definido en .env");
    return createHmac("sha256", pepper).update(dui).digest("hex");
}

const HORAS_EXPIRACION_TOKEN = 24;

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function generarTokenVerificacion(): { token: string; tokenHash: string; expira: Date } {
    const token = randomBytes(32).toString("hex"); // 64 caracteres hex, es lo que viaja al usuario
    const expira = new Date(Date.now() + HORAS_EXPIRACION_TOKEN * 60 * 60 * 1000);
    return { token, tokenHash: hashToken(token), expira };
}

export async function registrarUsuario(datos: DatosRegistro) {
    const contrasenaHash = await argon2.hash(datos.contrasena);
    const duiHash = hashDui(datos.dui);
    const { token, tokenHash, expira: tokenVerificacionExpira } = generarTokenVerificacion();

    let usuario;
    try {
        usuario = await prisma.usuario.create({
            data: {
                nombres: datos.nombres,
                apellidos: datos.apellidos,
                correo: datos.correo,
                contrasenaHash,
                duiHash,
                distrito: datos.distrito,
                tokenVerificacion: tokenHash,
                tokenVerificacionExpira,
            },
            select: {
                id: true, nombres: true, apellidos: true,
                correo: true, distrito: true, verificado: true, fechaRegistro: true,
            },
        });

    } catch (e) {
        if ((e as { code?: string }).code === "P2002") {
            throw new RegistroError(409, "El correo o el DUI ya están registrados");
        }
        throw e;
    }

    const payload: AgricultorRegistradoPayload = {
        usuarioId: usuario.id,
        correo: usuario.correo,
        distrito: usuario.distrito,
        fechaRegistro: usuario.fechaRegistro,
    };
    try {
        bus.emit(EVENTOS.AGRICULTOR_REGISTRADO, payload);
    } catch (err) {
        console.error("Error en listener de AgricultorRegistrado:", err);
    }

    // El hash queda en BD; al llamador se le devuelve el token crudo (para el correo o la simulación).
    return { ...usuario, tokenVerificacion: token };
}

export async function verificarUsuario(token: string) {
    const tokenHash = hashToken(token);
    const usuario = await prisma.usuario.findUnique({ where: { tokenVerificacion: tokenHash } });

    if (!usuario) throw new RegistroError(404, "Token de verificación inválido");
    if (!usuario.tokenVerificacionExpira || usuario.tokenVerificacionExpira < new Date()) {
        throw new RegistroError(410, "El token de verificación expiró, solicita uno nuevo");
    }

    // updateMany con el token en el where: si dos peticiones llegan a la vez, solo una obtiene count = 1.
    const { count } = await prisma.usuario.updateMany({
        where: { id: usuario.id, tokenVerificacion: tokenHash },
        data: { verificado: true, tokenVerificacion: null, tokenVerificacionExpira: null },
    });
    if (count === 0) throw new RegistroError(404, "Token de verificación inválido");

    return { id: usuario.id, correo: usuario.correo, verificado: true };
}

// Devuelve el token crudo nuevo, o null si el correo no existe o ya está verificado.
// El llamador debe responder igual en ambos casos para no revelar qué correos existen.
export async function reenviarVerificacion(correo: string): Promise<string | null> {
    const usuario = await prisma.usuario.findUnique({ where: { correo } });
    if (!usuario || usuario.verificado) return null;

    const { token, tokenHash, expira } = generarTokenVerificacion();
    await prisma.usuario.update({
        where: { id: usuario.id },
        data: { tokenVerificacion: tokenHash, tokenVerificacionExpira: expira },
    });
    return token;
}