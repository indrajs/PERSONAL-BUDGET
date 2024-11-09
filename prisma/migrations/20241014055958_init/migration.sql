/*
  Warnings:

  - A unique constraint covering the columns `[bookingNo]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - The required column `bookingNo` was added to the `Booking` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingNo" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNo_key" ON "Booking"("bookingNo");
