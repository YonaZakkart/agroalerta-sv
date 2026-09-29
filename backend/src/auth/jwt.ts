import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

export interface UsuarioAutenticado {
  id: number;
  correo: string;
}

function obtenerSecreto(): string {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("JWT_SECRET no está definido o tiene menos de 32 caracteres");
  }
  return secreto;
}

export function firmarToken(usuario: UsuarioAutenticado): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "2h") as NonNullable<SignOptions["expiresIn"]>;
  return jwt.sign({ correo: usuario.correo }, obtenerSecreto(), {
    algorithm: "HS256",
    expiresIn,
    subject: String(usuario.id),
  });
}

// Lanza jwt.JsonWebTokenError / TokenExpiredError si el token no es válido.
// Lanza Error genérico si falta JWT_SECRET (error de configuración).
export function verificarToken(token: string): UsuarioAutenticado {
  const decoded = jwt.verify(token, obtenerSecreto(), { algorithms: ["HS256"] });
  if (typeof decoded === "string" || typeof decoded.sub !== "string" || typeof decoded.correo !== "string") {
    throw new jwt.JsonWebTokenError("Payload inválido");
  }
  const id = Number(decoded.sub);
  if (!Number.isInteger(id)) {
    throw new jwt.JsonWebTokenError("Payload inválido");
  }
  return { id, correo: decoded.correo };
}