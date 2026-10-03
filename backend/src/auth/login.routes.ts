import { Router } from "express";
import * as argon2 from "argon2";
import { prisma } from "../config/prisma";
import { firmarToken } from "./jwt";

export const loginRouter = Router();

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe
// (evita enumeración de usuarios por timing).
let hashFicticio: Promise<string> | null = null;
const obtenerHashFicticio = () => (hashFicticio ??= argon2.hash("contrasena-ficticia-timing"));

loginRouter.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body ?? {};

  if (
    typeof correo !== "string" ||
    typeof contrasena !== "string" ||
    !CORREO_RE.test(correo.trim()) ||
    correo.trim().length > 255 ||
    contrasena.length === 0 ||
    contrasena.length > 128
  ) {
    res.status(400).json({ error: "Datos inválidos", detalles: ["correo y contrasena son obligatorios y deben tener formato válido"] });
    return;
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correo.trim().toLowerCase() },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        distrito: true,
        verificado: true,
        contrasenaHash: true,
      },
    });

    const hash = usuario ? usuario.contrasenaHash : await obtenerHashFicticio();
    const passwordOk = await argon2.verify(hash, contrasena);

    if (!usuario || !passwordOk) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    // El 403 se evalúa DESPUÉS de validar la contraseña: así no se revela
    // a un tercero si un correo existe y está sin verificar.
    if (!usuario.verificado) {
      res.status(403).json({
        error: "Cuenta no verificada",
        detalles:
          "Revisa tu correo para verificarla o solicita un nuevo enlace en POST /auth/reenviar-verificacion",
      });
      return;
    }

    const token = firmarToken({ id: usuario.id, correo: usuario.correo });

    res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        distrito: usuario.distrito,
      },
    });
  } catch (error) {
    console.error("Error en POST /auth/login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});