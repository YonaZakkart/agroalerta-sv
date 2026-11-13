import "dotenv/config";
import express from "express";
import registroRouter from "./auth/registro.routes";
import { loginRouter } from "./auth/login.routes";
import { perfilRouter } from "./auth/perfil.routes";
import { viabilidadRouter } from "./viabilidad/viabilidad.routes";
import { distritosRouter } from "./viabilidad/distritos.routes";
import { climaRouter } from "./clima/clima.routes";
import { leerPuerto } from "./config/puerto";
import { manejarErrores, rutaNoEncontrada } from "./comun/http-errores";

// Falla al arrancar si falta configuración crítica, en vez de al primer login/registro.
for (const nombre of ["JWT_SECRET", "DUI_PEPPER"] as const) {
  if (!process.env[nombre]) {
    console.error(`Falta ${nombre} en backend/.env (ver .env.example)`);
    process.exit(1);
  }
}
if ((process.env.JWT_SECRET as string).length < 32) {
  console.error("JWT_SECRET debe tener al menos 32 caracteres");
  process.exit(1);
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", registroRouter);

app.use("/auth", loginRouter);

app.use("/auth", perfilRouter);

app.use("/viabilidad", viabilidadRouter);

app.use("/distritos", distritosRouter);

app.use("/clima", climaRouter);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

function obtenerPuerto(): number {
  try {
    return leerPuerto(process.env.PORT, 3000);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const PORT = obtenerPuerto();
const servidor = app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});

// El callback de listen solo se ejecuta cuando el servidor ya escucha; los
// errores de arranque (por ejemplo, puerto ocupado) llegan por el evento "error".
servidor.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`El puerto ${PORT} ya está en uso. Cierra el otro proceso o define otro PORT.`);
  } else {
    console.error(`No se pudo iniciar el backend en el puerto ${PORT}:`, error);
  }
  process.exit(1);
});