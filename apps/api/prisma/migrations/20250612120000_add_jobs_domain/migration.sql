-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('WEBHOOK_DELIVERY', 'NOTIFICATION', 'LICENSE_EXPIRY_REMINDER', 'MAINTENANCE_REMINDER', 'REPORT_GENERATION');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "failure_reason" TEXT,
    "bull_job_id" TEXT,
    "queue_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_organization_id_status_idx" ON "jobs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "jobs_type_idx" ON "jobs"("type");

-- CreateIndex
CREATE INDEX "jobs_queue_name_idx" ON "jobs"("queue_name");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
