-- CreateTable
CREATE TABLE `estimaciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `siembra_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `distrito_id` INTEGER NOT NULL,
    `cultivo` ENUM('MAIZ', 'FRIJOL', 'MAICILLO') NOT NULL,
    `estado` ENUM('POR_SEMBRAR', 'SEMBRADO') NOT NULL,
    `area_mz` DECIMAL(8, 2) NOT NULL,
    `fecha_siembra` DATE NOT NULL,
    `condicion` ENUM('SEQUIA', 'EXCESO_LLUVIA', 'INVIERNO_ACEPTABLE') NULL,
    `nivelSequia` ENUM('DEBIL', 'MODERADA', 'FUERTE', 'SEVERA') NULL,
    `fecha_datos` DATE NULL,
    `actualizado_en` DATETIME(3) NULL,
    `rendimiento_base_qq_por_mz` DECIMAL(8, 2) NOT NULL,
    `factor_climatico` DECIMAL(5, 3) NOT NULL,
    `rendimiento_estimado_qq_por_mz` DECIMAL(8, 2) NOT NULL,
    `produccion_estimada_qq` DECIMAL(12, 2) NOT NULL,
    `precio_venta_qq_usd` DECIMAL(10, 2) NOT NULL,
    `ingreso_estimado_usd` DECIMAL(12, 2) NOT NULL,
    `nivel_riesgo` ENUM('VERDE', 'AMARILLO', 'ROJO') NOT NULL,
    `titulo` VARCHAR(100) NOT NULL,
    `mensaje` VARCHAR(500) NOT NULL,
    `motivos` JSON NOT NULL,
    `viabilidad` JSON NULL,
    `supuestos` JSON NOT NULL,
    `calculado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `estimaciones_usuario_id_calculado_en_idx`(`usuario_id`, `calculado_en`),
    INDEX `estimaciones_siembra_id_calculado_en_idx`(`siembra_id`, `calculado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `estimaciones` ADD CONSTRAINT `estimaciones_siembra_id_fkey` FOREIGN KEY (`siembra_id`) REFERENCES `siembras`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estimaciones` ADD CONSTRAINT `estimaciones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
