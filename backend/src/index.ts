import "dotenv/config";
import express from "express";
import registroRouter from "./auth/registro.routes";
import { loginRouter } from "./auth/login.routes";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", registroRouter);

app.use("/auth", loginRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));