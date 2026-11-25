-- CreateTable
CREATE TABLE `municipios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `municipios_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `distritos` (
    `id` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `nombre_normalizado` VARCHAR(100) NOT NULL,
    `municipio_id` INTEGER NOT NULL,

    UNIQUE INDEX `distritos_nombre_normalizado_key`(`nombre_normalizado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `capas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `tipo` ENUM('POTENCIAL', 'RIESGO') NOT NULL,
    `cultivo` VARCHAR(50) NULL,

    UNIQUE INDEX `capas_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clases_capa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `capa_id` INTEGER NOT NULL,
    `valor` INTEGER NOT NULL,
    `nombre` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `clases_capa_capa_id_valor_key`(`capa_id`, `valor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `areas_clase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `distrito_id` INTEGER NOT NULL,
    `clase_id` INTEGER NOT NULL,
    `area_ha` DECIMAL(12, 3) NOT NULL,
    `fuente` VARCHAR(50) NOT NULL,
    `fecha_extraccion` DATE NOT NULL,

    UNIQUE INDEX `areas_clase_distrito_id_clase_id_key`(`distrito_id`, `clase_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `distritos` ADD CONSTRAINT `distritos_municipio_id_fkey` FOREIGN KEY (`municipio_id`) REFERENCES `municipios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clases_capa` ADD CONSTRAINT `clases_capa_capa_id_fkey` FOREIGN KEY (`capa_id`) REFERENCES `capas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `areas_clase` ADD CONSTRAINT `areas_clase_distrito_id_fkey` FOREIGN KEY (`distrito_id`) REFERENCES `distritos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `areas_clase` ADD CONSTRAINT `areas_clase_clase_id_fkey` FOREIGN KEY (`clase_id`) REFERENCES `clases_capa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
