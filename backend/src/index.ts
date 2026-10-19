import "dotenv/config";
import express from "express";
import registroRouter from "./auth/registro.routes";
import { loginRouter } from "./auth/login.routes";
import { perfilRouter } from "./auth/perfil.routes";
import { viabilidadRouter } from "./viabilidad/viabilidad.routes";

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

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));