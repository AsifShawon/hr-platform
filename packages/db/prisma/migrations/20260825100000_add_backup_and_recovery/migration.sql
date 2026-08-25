-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'RUNNING', 'VERIFYING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'PRE_RESTORE_SAFETY');

-- CreateTable
CREATE TABLE "backup_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "trigger" "BackupTrigger" NOT NULL DEFAULT 'MANUAL',
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "checksum_sha256" TEXT,
    "app_version" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "total_media_files" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "cron_expression" TEXT NOT NULL DEFAULT '0 2 * * *',
    "retention_count" INTEGER NOT NULL DEFAULT 7,
    "target_directory" TEXT NOT NULL DEFAULT './backups',
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backup_jobs_tenant_id_status_idx" ON "backup_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "backup_jobs_created_at_idx" ON "backup_jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "backup_schedules_tenant_id_key" ON "backup_schedules"("tenant_id");

-- AddForeignKey
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_schedules" ADD CONSTRAINT "backup_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
