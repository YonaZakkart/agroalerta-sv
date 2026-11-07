-- CreateTable
CREATE TABLE `condiciones_distrito` (
    `distrito_id` INTEGER NOT NULL,
    `condicion` ENUM('SEQUIA', 'EXCESO_LLUVIA', 'INVIERNO_ACEPTABLE') NULL,
    `nivel_sequia` ENUM('DEBIL', 'MODERADA', 'FUERTE', 'SEVERA') NULL,
    `dias_secos_consecutivos` INTEGER NOT NULL,
    `acumulado_30_mm` DECIMAL(8, 2) NULL,
    `normal_30_mm` DECIMAL(8, 2) NULL,
    `razon30` DECIMAL(6, 3) NULL,
    `fecha_datos` DATE NOT NULL,
    `actualizado_en` DATETIME(3) NOT NULL,
    `condicion_desde` DATETIME(3) NULL,

    PRIMARY KEY (`distrito_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `condiciones_distrito` ADD CONSTRAINT `condiciones_distrito_distrito_id_fkey` FOREIGN KEY (`distrito_id`) REFERENCES `distritos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
