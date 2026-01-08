/*
  Warnings:

  - You are about to drop the column `note` on the `checkclock` table. All the data in the column will be lost.
  - You are about to alter the column `checkType` on the `checkclock` table. The data in that column could be lost. The data in that column will be cast from `VarChar(30)` to `Enum(EnumId(1))`.
  - You are about to drop the column `breakEnd` on the `checkclocksettingtime` table. All the data in the column will be lost.
  - You are about to drop the column `breakStart` on the `checkclocksettingtime` table. All the data in the column will be lost.
  - You are about to drop the column `clockIn` on the `checkclocksettingtime` table. All the data in the column will be lost.
  - You are about to drop the column `clockOut` on the `checkclocksettingtime` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[number]` on the table `Letter` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Letter` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `checkclock` DROP FOREIGN KEY `CheckClock_userId_fkey`;

-- DropForeignKey
ALTER TABLE `checkclocksettingtime` DROP FOREIGN KEY `CheckClockSettingTime_checkClockSettingId_fkey`;

-- DropForeignKey
ALTER TABLE `employeecredential` DROP FOREIGN KEY `EmployeeCredential_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `oauthaccount` DROP FOREIGN KEY `OAuthAccount_userId_fkey`;

-- DropForeignKey
ALTER TABLE `salary` DROP FOREIGN KEY `Salary_userId_fkey`;

-- DropIndex
DROP INDEX `CheckClock_userId_fkey` ON `checkclock`;

-- DropIndex
DROP INDEX `CheckClockSettingTime_checkClockSettingId_fkey` ON `checkclocksettingtime`;

-- DropIndex
DROP INDEX `EmployeeCredential_employeeId_fkey` ON `employeecredential`;

-- DropIndex
DROP INDEX `OAuthAccount_userId_fkey` ON `oauthaccount`;

-- DropIndex
DROP INDEX `Salary_userId_fkey` ON `salary`;

-- AlterTable
ALTER TABLE `checkclock` DROP COLUMN `note`,
    ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `assignmentId` INTEGER NULL,
    ADD COLUMN `attendanceType` ENUM('WFO', 'WFH', 'VISIT', 'ONSITE') NULL,
    ADD COLUMN `deviceInfo` VARCHAR(191) NULL,
    ADD COLUMN `geoRadius` INTEGER NULL,
    ADD COLUMN `invalidReason` TEXT NULL,
    ADD COLUMN `ipAddress` VARCHAR(45) NULL,
    ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `locationName` VARCHAR(191) NULL,
    ADD COLUMN `longitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `photoUrl` VARCHAR(191) NULL,
    ADD COLUMN `verifiedAt` DATETIME(3) NULL,
    ADD COLUMN `verifiedBy` INTEGER NULL,
    ADD COLUMN `verifyStatus` ENUM('PENDING', 'VALID', 'INVALID') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `workNote` TEXT NULL,
    MODIFY `checkType` ENUM('IN', 'OUT', 'BREAK_START', 'BREAK_END') NOT NULL;

-- AlterTable
ALTER TABLE `checkclocksettingtime` DROP COLUMN `breakEnd`,
    DROP COLUMN `breakStart`,
    DROP COLUMN `clockIn`,
    DROP COLUMN `clockOut`,
    ADD COLUMN `breakEndMinutes` INTEGER NULL,
    ADD COLUMN `breakStartMinutes` INTEGER NULL,
    ADD COLUMN `clockInMinutes` INTEGER NULL,
    ADD COLUMN `clockOutMinutes` INTEGER NULL;

-- AlterTable
ALTER TABLE `letter` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approverId` INTEGER NULL,
    ADD COLUMN `fileUrl` VARCHAR(191) NULL,
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `rejectedReason` TEXT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `UserShift` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `checkClockSettingId` INTEGER NOT NULL,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,

    INDEX `UserShift_userId_effectiveFrom_idx`(`userId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckAssignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `attendanceType` ENUM('WFO', 'WFH', 'VISIT', 'ONSITE') NOT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `address` VARCHAR(191) NULL,
    `locationName` VARCHAR(191) NULL,
    `geoRadius` INTEGER NULL,
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `CheckAssignment_userId_startAt_endAt_idx`(`userId`, `startAt`, `endAt`),
    INDEX `CheckAssignment_latitude_longitude_idx`(`latitude`, `longitude`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CheckClock_userId_time_idx` ON `CheckClock`(`userId`, `time`);

-- CreateIndex
CREATE INDEX `CheckClock_assignmentId_idx` ON `CheckClock`(`assignmentId`);

-- CreateIndex
CREATE INDEX `CheckClock_latitude_longitude_idx` ON `CheckClock`(`latitude`, `longitude`);

-- CreateIndex
CREATE INDEX `CheckClockSettingTime_checkClockSettingId_day_idx` ON `CheckClockSettingTime`(`checkClockSettingId`, `day`);

-- CreateIndex
CREATE UNIQUE INDEX `Letter_number_key` ON `Letter`(`number`);

-- AddForeignKey
ALTER TABLE `EmployeeCredential` ADD CONSTRAINT `EmployeeCredential_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OAuthAccount` ADD CONSTRAINT `OAuthAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Salary` ADD CONSTRAINT `Salary_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckClockSettingTime` ADD CONSTRAINT `CheckClockSettingTime_checkClockSettingId_fkey` FOREIGN KEY (`checkClockSettingId`) REFERENCES `CheckClockSetting`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserShift` ADD CONSTRAINT `UserShift_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserShift` ADD CONSTRAINT `UserShift_checkClockSettingId_fkey` FOREIGN KEY (`checkClockSettingId`) REFERENCES `CheckClockSetting`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckAssignment` ADD CONSTRAINT `CheckAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckClock` ADD CONSTRAINT `CheckClock_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckClock` ADD CONSTRAINT `CheckClock_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `CheckAssignment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Letter` ADD CONSTRAINT `Letter_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Letter` ADD CONSTRAINT `Letter_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
