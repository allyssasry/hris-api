/*
  Warnings:

  - You are about to alter the column `contractType` on the `employee` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `phone` on the `employee` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE `employee` ADD COLUMN `accountName` VARCHAR(100) NULL,
    ADD COLUMN `accountNumber` VARCHAR(100) NULL,
    ADD COLUMN `bank` VARCHAR(50) NULL,
    ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `branch` VARCHAR(100) NULL,
    ADD COLUMN `gender` VARCHAR(10) NULL,
    ADD COLUMN `grade` VARCHAR(50) NULL,
    ADD COLUMN `jobdesk` VARCHAR(100) NULL,
    ADD COLUMN `nik` VARCHAR(50) NULL,
    ADD COLUMN `spType` VARCHAR(20) NULL,
    MODIFY `contractType` VARCHAR(50) NULL,
    MODIFY `phone` VARCHAR(50) NULL;
