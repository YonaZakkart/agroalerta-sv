/*
  Warnings:

  - You are about to drop the column `distrito` on the `usuarios` table. All the data in the column will be lost.
  - Added the required column `distrito_id` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usuarios` DROP COLUMN `distrito`,
    ADD COLUMN `distrito_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_distrito_id_fkey` FOREIGN KEY (`distrito_id`) REFERENCES `distritos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
