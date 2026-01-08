/*
  Warnings:

  - You are about to drop the column `assignmentId` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `attendanceType` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `checkType` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `deviceInfo` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `geoRadius` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `invalidReason` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedBy` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `verifyStatus` on the `checkclock` table. All the data in the column will be lost.
  - You are about to drop the column `workNote` on the `checkclock` table. All the data in the column will be lost.
  - You are about to alter the column `latitude` on the `checkclock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,7)` to `Double`.
  - You are about to alter the column `longitude` on the `checkclock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,7)` to `Double`.
  - You are about to drop the `admincheckclock` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `employeeId` to the `checkclock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `checkclock` table without a default value. This is not possible if the table is not empty.
  - Made the column `locationName` on table `checkclock` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `admincheckclock` DROP FOREIGN KEY `AdminCheckClock_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `checkclock` DROP FOREIGN KEY `CheckClock_assignmentId_fkey`;

-- DropForeignKey
ALTER TABLE `checkclock` DROP FOREIGN KEY `CheckClock_userId_fkey`;

-- DropIndex
DROP INDEX `CheckClock_assignmentId_idx` ON `checkclock`;

-- DropIndex
DROP INDEX `CheckClock_latitude_longitude_idx` ON `checkclock`;

-- DropIndex
DROP INDEX `CheckClock_userId_time_idx` ON `checkclock`;

-- AlterTable
ALTER TABLE `checkclock` DROP COLUMN `assignmentId`,
    DROP COLUMN `attendanceType`,
    DROP COLUMN `checkType`,
    DROP COLUMN `deletedAt`,
    DROP COLUMN `deviceInfo`,
    DROP COLUMN `geoRadius`,
    DROP COLUMN `invalidReason`,
    DROP COLUMN `ipAddress`,
    DROP COLUMN `photoUrl`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    DROP COLUMN `verifiedAt`,
    DROP COLUMN `verifiedBy`,
    DROP COLUMN `verifyStatus`,
    DROP COLUMN `workNote`,
    ADD COLUMN `approval` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` INTEGER NULL,
    ADD COLUMN `clockOutTime` DATETIME(3) NULL,
    ADD COLUMN `employeeId` INTEGER NOT NULL,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `proofName` VARCHAR(191) NULL,
    ADD COLUMN `proofPath` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL,
    MODIFY `latitude` DOUBLE NULL,
    MODIFY `locationName` VARCHAR(191) NOT NULL,
    MODIFY `longitude` DOUBLE NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `companyId` INTEGER NULL,
    ADD COLUMN `resetPasswordExp` DATETIME(3) NULL,
    ADD COLUMN `resetPasswordToken` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `admincheckclock`;

-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkclock` ADD CONSTRAINT `checkclock_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
