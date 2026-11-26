import * as nodemailer from "nodemailer";

// Envío real del enlace de verificación. Se activa configurando SMTP_*.
// Si no hay SMTP, el registro sigue funcionando y el error se registra; en
// producción se puede usar VERIFICACION_AUTOMATICA=true como respaldo temporal.

export function correoConfigurado(entorno: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(entorno.SMTP_HOST && entorno.SMTP_PORT && entorno.SMTP_FROM);
}

export function enlaceVerificacion(
  token: string,
  base: string = process.env.FRONTEND_URL ?? "http://localhost:4200",
): string {
  return `${base.replace(/\/+$/, "")}/verificar/${encodeURIComponent(token)}`;
}

export async function enviarCorreoVerificacion(correo: string, token: string): Promise<void> {
  if (!correoConfigurado()) {
    throw new Error("SMTP no configurado (SMTP_HOST, SMTP_PORT, SMTP_FROM)");
  }

  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  const enlace = enlaceVerificacion(token);
  await transporte.sendMail({
    from: process.env.SMTP_FROM,
    to: correo,
    subject: "Verifica tu cuenta de AgroAlerta Morazán",
    text: `Verifica tu cuenta abriendo este enlace: ${enlace}`,
    html: `<p>Verifica tu cuenta de AgroAlerta Morazán.</p><p><a href="${enlace}">Verificar mi correo</a></p><p>Si no creaste esta cuenta, ignora este mensaje.</p>`,
  });
}
