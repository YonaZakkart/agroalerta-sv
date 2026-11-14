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
import { prisma } from "./config/prisma";
import { manejarErrores, rutaNoEncontrada } from "./comun/http-errores";
import {
  LIMITE_CUERPO,
  cabecerasSeguridad,
  crearCors,
  leerOrigenesPermitidos,
} from "./comun/http-seguridad";
import { crearLimitador } from "./comun/rate-limit";
import { crearSalud } from "./comun/salud";
import { crearManejadorCierre } from "./comun/cierre";

// Falla al arrancar si falta configuración crítica, en vez de al primer login/registro.
const erroresEntorno = validarEntorno(process.env);
if (erroresEntorno.length > 0) {
  for (const error of erroresEntorno) console.error(error);
  console.error("Revisa backend/.env (ver .env.example)");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(cabecerasSeguridad);
app.use(crearCors(leerOrigenesPermitidos(process.env.CORS_ORIGINS)));
app.use(express.json({ limit: LIMITE_CUERPO }));

// Límites en memoria por IP. No sustituyen un límite compartido entre
// instancias, pero frenan fuerza bruta y abuso del endpoint que llama a Open-Meteo.
const limitarAcceso = crearLimitador({
  limite: 20,
  ventanaMs: 15 * 60_000,
  mensaje: "Demasiados intentos de acceso; espera unos minutos antes de reintentar",
});
const limitarClima = crearLimitador({
  limite: 6,
  ventanaMs: 10 * 60_000,
  mensaje: "La actualización del clima es costosa; espera unos minutos antes de reintentar",
});
const limitarLecturaClima = crearLimitador({ limite: 60, ventanaMs: 60_000 });

app.use("/auth/login", limitarAcceso);
app.use("/auth/registro", limitarAcceso);
app.use("/auth/reenviar-verificacion", limitarAcceso);
app.use("/clima/actualizar", limitarClima);
app.use("/clima", limitarLecturaClima);

// /health/live solo confirma que el proceso responde (para reinicios).
// /health comprueba la base y devuelve 503 si no contesta.
app.get("/health/live", (_req, res) => {
  res.json({ status: "ok" });
});

app.get(
  "/health",
  crearSalud(async () => {
    await prisma.$queryRaw`SELECT 1`;
  }),
);

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

// Cierre ordenado ante SIGTERM/SIGINT: detiene el job, deja de aceptar
// peticiones y desconecta Prisma. Si no termina en 10 s, sale con código 1.
const cerrar = crearManejadorCierre({
  detenerJob: () => jobClima?.detener(),
  cerrarServidor: () =>
    new Promise<void>((resolver, rechazar) => {
      servidor.close((error) => (error ? rechazar(error) : resolver()));
    }),
  desconectarBase: () => prisma.$disconnect(),
  salir: (codigo) => process.exit(codigo),
});

process.once("SIGTERM", () => {
  void cerrar("SIGTERM");
});
process.once("SIGINT", () => {
  void cerrar("SIGINT");
});