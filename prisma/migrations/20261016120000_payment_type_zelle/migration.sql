-- AlterEnum
-- Kept in its own migration: ADD VALUE can't be used in the same transaction that adds it.
ALTER TYPE "PaymentType" ADD VALUE 'ZELLE';
