import argon2 from "argon2";
import { createHmac } from "crypto";
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

export async function registrarUsuario(datos: DatosRegistro) {
    const contrasenaHash = await argon2.hash(datos.contrasena);
    const duiHash = hashDui(datos.dui);

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

    return usuario;
}