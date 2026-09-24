-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombres` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `correo` VARCHAR(255) NOT NULL,
    `contrasena_hash` VARCHAR(255) NOT NULL,
    `dui_hash` CHAR(64) NOT NULL,
    `distrito` VARCHAR(100) NOT NULL,
    `verificado` BOOLEAN NOT NULL DEFAULT false,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_correo_key`(`correo`),
    UNIQUE INDEX `usuarios_dui_hash_key`(`dui_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
