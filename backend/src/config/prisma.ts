import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
}

const url = new URL(connectionString);

const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    // MySQL 8.4 usa caching_sha2_password; sin TLS el conector necesita esto
    // para la autenticación completa. Solo en desarrollo: en producción usar TLS.
    allowPublicKeyRetrieval: process.env.NODE_ENV !== "production",
});

export const prisma = new PrismaClient({ adapter });