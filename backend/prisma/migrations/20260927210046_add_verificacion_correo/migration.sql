/*
  Warnings:

  - A unique constraint covering the columns `[token_verificacion]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `token_verificacion` VARCHAR(64) NULL,
    ADD COLUMN `token_verificacion_expira` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_token_verificacion_key` ON `usuarios`(`token_verificacion`);
