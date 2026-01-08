/*
  Warnings:

  - You are about to drop the column `address` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `idCard` on the `employee` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `CheckAssignment_latitude_longitude_idx` ON `checkassignment`;

-- AlterTable
ALTER TABLE `employee` DROP COLUMN `address`,
    DROP COLUMN `birthDate`,
    DROP COLUMN `deletedAt`,
    DROP COLUMN `gender`,
    DROP COLUMN `idCard`,
    ADD COLUMN `contractType` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    MODIFY `firstName` VARCHAR(191) NOT NULL,
    MODIFY `lastName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `isAdmin` BOOLEAN NOT NULL DEFAULT true;
