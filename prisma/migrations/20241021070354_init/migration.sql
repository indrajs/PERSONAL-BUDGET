-- AlterTable
ALTER TABLE "Savings" ADD COLUMN     "goalId" INTEGER;

-- AddForeignKey
ALTER TABLE "Savings" ADD CONSTRAINT "Savings_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
