-- HRIS Database Schema for TiDB
-- Run this in TiDB SQL Editor

USE test;

-- CreateTable User
CREATE TABLE IF NOT EXISTS `User` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL DEFAULT '',
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(50) NULL,
    `nik` VARCHAR(50) NULL,
    `gender` VARCHAR(10) NULL,
    `birthDate` DATETIME(3) NULL,
    `birthPlace` VARCHAR(100) NULL,
    `education` VARCHAR(50) NULL,
    `bank` VARCHAR(50) NULL,
    `accountName` VARCHAR(100) NULL,
    `accountNumber` VARCHAR(100) NULL,
    `avatar` VARCHAR(191) NULL,
    `position` VARCHAR(100) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `companyId` INT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resetPasswordToken` VARCHAR(191) NULL,
    `resetPasswordExp` DATETIME(3) NULL,
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Company
CREATE TABLE IF NOT EXISTS `Company` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `ownerId` INT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CompanyLocation
CREATE TABLE IF NOT EXISTS `CompanyLocation` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `address` VARCHAR(255) NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `companyId` INT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CompanyLocation_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Employee
CREATE TABLE IF NOT EXISTS `Employee` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `employeeId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(50) NULL,
    `nik` VARCHAR(50) NULL,
    `gender` VARCHAR(10) NULL,
    `birthDate` DATETIME(3) NULL,
    `jobdesk` VARCHAR(100) NULL,
    `branch` VARCHAR(100) NULL,
    `contractType` VARCHAR(50) NULL,
    `grade` VARCHAR(50) NULL,
    `bank` VARCHAR(50) NULL,
    `accountName` VARCHAR(100) NULL,
    `accountNumber` VARCHAR(100) NULL,
    `spType` VARCHAR(20) NULL,
    `education` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `terminationType` VARCHAR(20) NULL,
    `terminatedAt` DATETIME(3) NULL,
    `companyId` INT NOT NULL,
    `userId` INT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `Employee_employeeId_companyId_key`(`employeeId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable EmployeeCredential
CREATE TABLE IF NOT EXISTS `EmployeeCredential` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `employeeId` INT NOT NULL,
    `companyUser` VARCHAR(100) NOT NULL,
    `empCode` VARCHAR(100) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE INDEX `EmployeeCredential_companyUser_empCode_key`(`companyUser`, `empCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable OAuthAccount
CREATE TABLE IF NOT EXISTS `OAuthAccount` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    UNIQUE INDEX `OAuthAccount_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Salary
CREATE TABLE IF NOT EXISTS `Salary` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `note` TEXT NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CheckClockSetting
CREATE TABLE IF NOT EXISTS `CheckClockSetting` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CheckClockSettingTime
CREATE TABLE IF NOT EXISTS `CheckClockSettingTime` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `checkClockSettingId` INT NOT NULL,
    `day` INT NOT NULL,
    `clockInMinutes` INT NULL,
    `breakStartMinutes` INT NULL,
    `breakEndMinutes` INT NULL,
    `clockOutMinutes` INT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    INDEX `CheckClockSettingTime_checkClockSettingId_day_idx`(`checkClockSettingId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable checkclock
CREATE TABLE IF NOT EXISTS `checkclock` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `employeeId` INT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `clockOutTime` DATETIME(3) NULL,
    `time` DATETIME(3) NULL,
    `status` VARCHAR(191) NULL,
    `approval` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` INT NULL,
    `approvedAt` DATETIME(3) NULL,
    `locationName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `proofPath` VARCHAR(191) NULL,
    `proofName` VARCHAR(191) NULL,
    `clockOutProofPath` VARCHAR(191) NULL,
    `clockOutProofName` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable UserShift
CREATE TABLE IF NOT EXISTS `UserShift` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `checkClockSettingId` INT NOT NULL,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    INDEX `UserShift_userId_effectiveFrom_idx`(`userId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CheckAssignment
CREATE TABLE IF NOT EXISTS `CheckAssignment` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `attendanceType` ENUM('WFO', 'WFH', 'VISIT', 'ONSITE') NOT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `address` VARCHAR(191) NULL,
    `locationName` VARCHAR(191) NULL,
    `geoRadius` INT NULL,
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `createdBy` INT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    INDEX `CheckAssignment_userId_startAt_endAt_idx`(`userId`, `startAt`, `endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Leave
CREATE TABLE IF NOT EXISTS `Leave` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `type` ENUM('ABSENT', 'ANNUAL_LEAVE', 'SICK_LEAVE') NOT NULL,
    `note` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `attachment` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    INDEX `Leave_userId_startDate_endDate_idx`(`userId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable LetterFormat
CREATE TABLE IF NOT EXISTS `LetterFormat` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Letter
CREATE TABLE IF NOT EXISTS `Letter` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `letterFormatId` INT NOT NULL,
    `userId` INT NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `payload` LONGTEXT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `approverId` INT NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    UNIQUE INDEX `Letter_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Notification
CREATE TABLE IF NOT EXISTS `Notification` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `userId` INT NOT NULL,
    `fromUserId` INT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `data` LONGTEXT NULL,
    `isRead` TINYINT(1) NOT NULL DEFAULT 0,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` INT NULL,
    INDEX `Notification_userId_isRead_idx`(`userId`, `isRead`),
    INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
