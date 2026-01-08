/*
  Warnings:

  - The values [BREAK_START,BREAK_END] on the enum `CheckClock_checkType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `checkclock` MODIFY `checkType` ENUM('IN', 'OUT') NOT NULL;
