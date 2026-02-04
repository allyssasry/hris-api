-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `companyId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Notification_companyId_idx` ON `Notification`(`companyId`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
