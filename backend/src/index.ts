import "dotenv/config";
import express from "express";
import registroRouter from "./auth/registro.routes";
import { loginRouter } from "./auth/login.routes";
import { perfilRouter } from "./auth/perfil.routes";
import { viabilidadRouter } from "./viabilidad/viabilidad.routes";
import { distritosRouter } from "./viabilidad/distritos.routes";
import { climaRouter } from "./clima/clima.routes";
import { actualizarClima } from "./clima/orquestador";
import { iniciarJobClima, leerIntervaloJob } from "./clima/job";
import type { JobClima } from "./clima/job";
import { leerPuerto } from "./config/puerto";
import { validarEntorno } from "./config/entorno";
import { manejarErrores, rutaNoEncontrada } from "./comun/http-errores";

// Falla al arrancar si falta configuración crítica, en vez de al primer login/registro.
const erroresEntorno = validarEntorno(process.env);
if (erroresEntorno.length > 0) {
  for (const error of erroresEntorno) console.error(error);
  console.error("Revisa backend/.env (ver .env.example)");
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
let jobClima: JobClima | null = null;

const servidor = app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
  iniciarJobSiCorresponde();
});

function iniciarJobSiCorresponde(): void {
  if (process.env.CLIMA_JOB_ACTIVO === "false") {
    console.log("Job de clima desactivado (CLIMA_JOB_ACTIVO=false)");
    return;
  }

  try {
    const intervaloMs = leerIntervaloJob(process.env.CLIMA_JOB_INTERVALO_MS);
    jobClima = iniciarJobClima({
      intervaloMs,
      // La primera ejecución ocurre después del primer intervalo: el arranque no
      // depende de Open-Meteo y el endpoint sigue disponible para forzarla.
      ejecutar: () => actualizarClima(),
    });
    console.log(`Job de clima activo cada ${Math.round(intervaloMs / 60_000)} min`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

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