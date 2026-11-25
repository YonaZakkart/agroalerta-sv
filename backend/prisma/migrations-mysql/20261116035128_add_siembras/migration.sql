-- CreateTable
CREATE TABLE `siembras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `distrito_id` INTEGER NOT NULL,
    `cultivo` ENUM('MAIZ', 'FRIJOL', 'MAICILLO') NOT NULL,
    `estado` ENUM('POR_SEMBRAR', 'SEMBRADO') NOT NULL,
    `fecha_siembra` DATE NOT NULL,
    `area_mz` DECIMAL(8, 2) NOT NULL,
    `cantidad_semilla` DECIMAL(10, 2) NULL,
    `unidad_semilla` ENUM('LIBRAS', 'BOLSAS') NULL,
    `alquila_terreno` BOOLEAN NOT NULL DEFAULT false,
    `usa_maquinaria` BOOLEAN NOT NULL DEFAULT false,
    `usa_riego` BOOLEAN NOT NULL DEFAULT false,
    `inversion_total_usd` DECIMAL(10, 2) NOT NULL,
    `costo_semilla_usd` DECIMAL(10, 2) NULL,
    `costo_alquiler_usd` DECIMAL(10, 2) NULL,
    `costo_maquinaria_usd` DECIMAL(10, 2) NULL,
    `costo_riego_usd` DECIMAL(10, 2) NULL,
    `costo_otros_usd` DECIMAL(10, 2) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `siembras_usuario_id_creado_en_idx`(`usuario_id`, `creado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `siembras` ADD CONSTRAINT `siembras_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `siembras` ADD CONSTRAINT `siembras_distrito_id_fkey` FOREIGN KEY (`distrito_id`) REFERENCES `distritos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
