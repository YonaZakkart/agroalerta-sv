import { Router } from "express";
import { registrarUsuario, verificarUsuario, reenviarVerificacion, RegistroError } from "./registro.service";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUI_RE = /^\d{9}$/;
const TOKEN_RE = /^[a-f0-9]{64}$/;

const texto = (v: unknown, max = 100): v is string =>
    typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;

router.post("/registro", async (req, res) => {
    const { nombres, apellidos, correo, contrasena, dui, distrito } = req.body ?? {};
    const errores: string[] = [];

    if (!texto(nombres)) errores.push("nombres inválido");
    if (!texto(apellidos)) errores.push("apellidos inválido");
    if (!texto(correo, 255) || !EMAIL_RE.test(correo.trim())) errores.push("correo inválido");
    if (typeof contrasena !== "string" || contrasena.length < 8 || contrasena.length > 128)
        errores.push("contrasena debe tener entre 8 y 128 caracteres");
    if (typeof dui !== "string" || !DUI_RE.test(dui)) errores.push("dui debe tener 9 dígitos sin guiones");
    // TODO Parte 2: validar contra el catálogo de los 26 distritos de Morazán
    if (!texto(distrito)) errores.push("distrito inválido");

    if (errores.length > 0) return res.status(400).json({ error: "Datos inválidos", detalles: errores });

    try {
        const usuario = await registrarUsuario({
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            correo: correo.trim().toLowerCase(),
            contrasena,
            dui,
            distrito: distrito.trim(),
        });

        // Simulación (Parte 1 Punto C): sin envío real de correo. El token solo se expone
        // si EXPONER_TOKEN_VERIFICACION=true en .env (opt-in; por defecto NO se devuelve).
        // Retirar junto con el flag cuando se integre Nodemailer/SMTP.
        const { tokenVerificacion, ...usuarioPublico } = usuario;
        if (process.env.EXPONER_TOKEN_VERIFICACION === "true") {
            return res.status(201).json({ ...usuarioPublico, tokenVerificacion_DEV: tokenVerificacion });
        }
        return res.status(201).json(usuarioPublico);

    } catch (e) {
        if (e instanceof RegistroError) return res.status(e.status).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});


router.get("/verificar/:token", async (req, res) => {
    const { token } = req.params;

    if (typeof token !== "string" || !TOKEN_RE.test(token)) {
        return res.status(400).json({ error: "token inválido" });
    }

    try {
        const usuario = await verificarUsuario(token);
        return res.status(200).json({ mensaje: "Correo verificado correctamente", usuario });
    } catch (e) {
        if (e instanceof RegistroError) return res.status(e.status).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

router.post("/reenviar-verificacion", async (req, res) => {
    const { correo } = req.body ?? {};
    if (!texto(correo, 255) || !EMAIL_RE.test(correo.trim())) {
        return res.status(400).json({ error: "Datos inválidos", detalles: ["correo inválido"] });
    }

    try {
        const token = await reenviarVerificacion(correo.trim().toLowerCase());
        const respuesta: Record<string, unknown> = {
            mensaje: "Si el correo está registrado y pendiente de verificación, se generó un nuevo enlace",
        };
        if (token && process.env.EXPONER_TOKEN_VERIFICACION === "true") {
            respuesta.tokenVerificacion_DEV = token;
        }
        return res.status(200).json(respuesta);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

export default router;