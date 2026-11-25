-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoCapa" AS ENUM ('POTENCIAL', 'RIESGO');

-- CreateEnum
CREATE TYPE "CondicionClima" AS ENUM ('SEQUIA', 'EXCESO_LLUVIA', 'INVIERNO_ACEPTABLE');

-- CreateEnum
CREATE TYPE "NivelSequia" AS ENUM ('DEBIL', 'MODERADA', 'FUERTE', 'SEVERA');

-- CreateEnum
CREATE TYPE "Cultivo" AS ENUM ('MAIZ', 'FRIJOL', 'MAICILLO');

-- CreateEnum
CREATE TYPE "EstadoSiembra" AS ENUM ('POR_SEMBRAR', 'SEMBRADO');

-- CreateEnum
CREATE TYPE "UnidadSemilla" AS ENUM ('LIBRAS', 'BOLSAS');

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('VERDE', 'AMARILLO', 'ROJO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(255) NOT NULL,
    "contrasena_hash" VARCHAR(255) NOT NULL,
    "dui_hash" CHAR(64) NOT NULL,
    "distrito_id" INTEGER NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "token_verificacion" VARCHAR(64),
    "token_verificacion_expira" TIMESTAMP(3),
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distritos" (
    "id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "nombre_normalizado" VARCHAR(100) NOT NULL,
    "municipio_id" INTEGER NOT NULL,
    "latitud" DECIMAL(9,6),
    "longitud" DECIMAL(9,6),

    CONSTRAINT "distritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capas" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" "TipoCapa" NOT NULL,
    "cultivo" VARCHAR(50),

    CONSTRAINT "capas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clases_capa" (
    "id" SERIAL NOT NULL,
    "capa_id" INTEGER NOT NULL,
    "valor" INTEGER NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,

    CONSTRAINT "clases_capa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas_clase" (
    "id" SERIAL NOT NULL,
    "distrito_id" INTEGER NOT NULL,
    "clase_id" INTEGER NOT NULL,
    "area_ha" DECIMAL(12,3) NOT NULL,
    "fuente" VARCHAR(50) NOT NULL,
    "fecha_extraccion" DATE NOT NULL,

    CONSTRAINT "areas_clase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condiciones_distrito" (
    "distrito_id" INTEGER NOT NULL,
    "condicion" "CondicionClima",
    "nivel_sequia" "NivelSequia",
    "dias_secos_consecutivos" INTEGER NOT NULL,
    "acumulado_30_mm" DECIMAL(8,2),
    "normal_30_mm" DECIMAL(8,2),
    "razon30" DECIMAL(6,3),
    "fecha_datos" DATE NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "condicion_desde" TIMESTAMP(3),

    CONSTRAINT "condiciones_distrito_pkey" PRIMARY KEY ("distrito_id")
);

-- CreateTable
CREATE TABLE "siembras" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "distrito_id" INTEGER NOT NULL,
    "cultivo" "Cultivo" NOT NULL,
    "estado" "EstadoSiembra" NOT NULL,
    "fecha_siembra" DATE NOT NULL,
    "area_mz" DECIMAL(8,2) NOT NULL,
    "cantidad_semilla" DECIMAL(10,2),
    "unidad_semilla" "UnidadSemilla",
    "alquila_terreno" BOOLEAN NOT NULL DEFAULT false,
    "usa_maquinaria" BOOLEAN NOT NULL DEFAULT false,
    "usa_riego" BOOLEAN NOT NULL DEFAULT false,
    "inversion_total_usd" DECIMAL(10,2) NOT NULL,
    "costo_semilla_usd" DECIMAL(10,2),
    "costo_alquiler_usd" DECIMAL(10,2),
    "costo_maquinaria_usd" DECIMAL(10,2),
    "costo_riego_usd" DECIMAL(10,2),
    "costo_otros_usd" DECIMAL(10,2),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siembras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimaciones" (
    "id" SERIAL NOT NULL,
    "siembra_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "distrito_id" INTEGER NOT NULL,
    "cultivo" "Cultivo" NOT NULL,
    "estado" "EstadoSiembra" NOT NULL,
    "area_mz" DECIMAL(8,2) NOT NULL,
    "fecha_siembra" DATE NOT NULL,
    "condicion" "CondicionClima",
    "nivelSequia" "NivelSequia",
    "fecha_datos" DATE,
    "actualizado_en" TIMESTAMP(3),
    "rendimiento_base_qq_por_mz" DECIMAL(8,2) NOT NULL,
    "factor_climatico" DECIMAL(5,3) NOT NULL,
    "rendimiento_estimado_qq_por_mz" DECIMAL(8,2) NOT NULL,
    "produccion_estimada_qq" DECIMAL(12,2) NOT NULL,
    "precio_venta_qq_usd" DECIMAL(10,2) NOT NULL,
    "ingreso_estimado_usd" DECIMAL(12,2) NOT NULL,
    "nivel_riesgo" "NivelRiesgo" NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "mensaje" VARCHAR(500) NOT NULL,
    "motivos" JSONB NOT NULL,
    "viabilidad" JSONB,
    "supuestos" JSONB NOT NULL,
    "calculado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_dui_hash_key" ON "usuarios"("dui_hash");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_token_verificacion_key" ON "usuarios"("token_verificacion");

-- CreateIndex
CREATE UNIQUE INDEX "municipios_nombre_key" ON "municipios"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "distritos_nombre_normalizado_key" ON "distritos"("nombre_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "capas_codigo_key" ON "capas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "clases_capa_capa_id_valor_key" ON "clases_capa"("capa_id", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "areas_clase_distrito_id_clase_id_key" ON "areas_clase"("distrito_id", "clase_id");

-- CreateIndex
CREATE INDEX "siembras_usuario_id_creado_en_idx" ON "siembras"("usuario_id", "creado_en");

-- CreateIndex
CREATE INDEX "estimaciones_usuario_id_calculado_en_idx" ON "estimaciones"("usuario_id", "calculado_en");

-- CreateIndex
CREATE INDEX "estimaciones_siembra_id_calculado_en_idx" ON "estimaciones"("siembra_id", "calculado_en");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_distrito_id_fkey" FOREIGN KEY ("distrito_id") REFERENCES "distritos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distritos" ADD CONSTRAINT "distritos_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clases_capa" ADD CONSTRAINT "clases_capa_capa_id_fkey" FOREIGN KEY ("capa_id") REFERENCES "capas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas_clase" ADD CONSTRAINT "areas_clase_distrito_id_fkey" FOREIGN KEY ("distrito_id") REFERENCES "distritos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas_clase" ADD CONSTRAINT "areas_clase_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases_capa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_distrito" ADD CONSTRAINT "condiciones_distrito_distrito_id_fkey" FOREIGN KEY ("distrito_id") REFERENCES "distritos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siembras" ADD CONSTRAINT "siembras_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siembras" ADD CONSTRAINT "siembras_distrito_id_fkey" FOREIGN KEY ("distrito_id") REFERENCES "distritos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimaciones" ADD CONSTRAINT "estimaciones_siembra_id_fkey" FOREIGN KEY ("siembra_id") REFERENCES "siembras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimaciones" ADD CONSTRAINT "estimaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

