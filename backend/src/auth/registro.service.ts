import argon2 from "argon2";
import { createHmac, randomBytes } from "crypto";
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

function generarTokenVerificacion(): { token: string; expira: Date } {
    const token = randomBytes(32).toString("hex"); // 64 caracteres hex
    const expira = new Date(Date.now() + HORAS_EXPIRACION_TOKEN * 60 * 60 * 1000);
    return { token, expira };
}

export async function registrarUsuario(datos: DatosRegistro) {
    const contrasenaHash = await argon2.hash(datos.contrasena);
    const duiHash = hashDui(datos.dui);
    const { token: tokenVerificacion, expira: tokenVerificacionExpira } = generarTokenVerificacion();

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
                tokenVerificacion,
                tokenVerificacionExpira,
            },
            select: {
                id: true, nombres: true, apellidos: true,
                correo: true, distrito: true, verificado: true, tokenVerificacion: true, fechaRegistro: true,   
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

    return usuario;
}

export async function verificarUsuario(token: string) {
    const usuario = await prisma.usuario.findUnique({ where: { tokenVerificacion: token } });

    if (!usuario) throw new RegistroError(404, "Token de verificación inválido");
    if (usuario.verificado) throw new RegistroError(409, "El usuario ya está verificado");
    if (!usuario.tokenVerificacionExpira || usuario.tokenVerificacionExpira < new Date()) {
        throw new RegistroError(410, "El token de verificación expiró, solicita uno nuevo");
    }

    return prisma.usuario.update({
        where: { id: usuario.id },
        data: { verificado: true, tokenVerificacion: null, tokenVerificacionExpira: null },
        select: { id: true, correo: true, verificado: true },
    });
}