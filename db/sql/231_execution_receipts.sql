-- Additive SQL for databases already matching the previous schema.
-- This repository has no Prisma migration baseline; do not use this as an initial migration.
CREATE TABLE "ExecutionReceiptRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt" JSONB NOT NULL,
    CONSTRAINT "ExecutionReceiptRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExecutionReceiptRecord_projectId_runId_key" ON "ExecutionReceiptRecord"("projectId", "runId");
CREATE INDEX "ExecutionReceiptRecord_projectId_startedAt_id_idx" ON "ExecutionReceiptRecord"("projectId", "startedAt", "id");
ALTER TABLE "ExecutionReceiptRecord" ADD CONSTRAINT "ExecutionReceiptRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
