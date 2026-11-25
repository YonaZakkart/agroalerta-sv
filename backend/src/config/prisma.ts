import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Neon/Postgres: Prisma 7 usa un driver adapter. En Render (Node de larga vida)
// se usa node-postgres con la URL pooled de Neon; las migraciones usan
// DATABASE_URL_UNPOOLED (conexión directa).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL no está definida");

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
