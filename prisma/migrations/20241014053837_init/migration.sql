/*
  Warnings:

  - Added the required column `address` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `experience` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `place` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "experience" INTEGER NOT NULL,
ADD COLUMN     "place" TEXT NOT NULL;
