import { Router } from "express";
import { registrarUsuario, verificarUsuario, RegistroError } from "./registro.service";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUI_RE = /^\d{9}$/;

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

    if (errores.length > 0) return res.status(400).json({ errores });

    try {
        const usuario = await registrarUsuario({
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            correo: correo.trim().toLowerCase(),
            contrasena,
            dui,
            distrito: distrito.trim(),
        });

        // NOTA (simulación, Parte 1 Punto C): no hay envío real de correo todavía.
        // El token se expone aquí solo para pruebas del equipo. Quitar este campo
        // cuando se integre Nodemailer/SMTP real (ver Estado_del_Proyecto.txt).
        const { tokenVerificacion, ...usuarioPublico } = usuario;
        return res.status(201).json({ ...usuarioPublico, tokenVerificacion_DEV: tokenVerificacion });

    } catch (e) {
        if (e instanceof RegistroError) return res.status(e.status).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: "Error interno" });
    }
});


router.get("/verificar/:token", async (req, res) => {
    const { token } = req.params;

    if (typeof token !== "string" || token.length !== 64) {
        return res.status(400).json({ error: "token inválido" });
    }

    try {
        const usuario = await verificarUsuario(token);
        return res.status(200).json({ mensaje: "Correo verificado correctamente", usuario });
    } catch (e) {
        if (e instanceof RegistroError) return res.status(e.status).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: "Error interno" });
    }
});

export default router;