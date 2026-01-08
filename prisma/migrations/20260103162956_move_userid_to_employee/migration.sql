/*
  Warnings:

  - You are about to drop the column `userId` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeId` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `User_userId_key` ON `user`;

-- AlterTable
ALTER TABLE `employee` ADD COLUMN `employeeId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `userId`;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_employeeId_key` ON `Employee`(`employeeId`);
