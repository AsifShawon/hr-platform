-- CreateEnum
CREATE TYPE "CardIssueStatus" AS ENUM ('DRAFT', 'RENDER_READY', 'PRINTED', 'ISSUED', 'REPLACED', 'REVOKED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CardIssueReason" AS ENUM ('INITIAL', 'DAMAGED', 'LOST', 'STOLEN', 'NAME_CHANGE', 'TITLE_CHANGE', 'PROMOTION', 'TRANSFER', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "CardRevocationReason" AS ENUM ('SEPARATION', 'SUSPENSION', 'LOST_STOLEN', 'SECURITY_REVOCATION', 'ADMINISTRATIVE_CORRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrintJobItemStatus" AS ENUM ('PENDING', 'RENDERING', 'RENDERED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PrintOutputFormat" AS ENUM ('A4_SHEET', 'LETTER_SHEET', 'INDIVIDUAL_PDF', 'HIGH_RES_PNG');

-- CreateEnum
CREATE TYPE "PrintJobSide" AS ENUM ('FRONT', 'BACK', 'DUPLEX');

-- CreateEnum
CREATE TYPE "OperatorPrintStatus" AS ENUM ('UNCONFIRMED', 'CONFIRMED_PRINTED', 'REJECTED_DEFECT');

-- CreateTable
CREATE TABLE "card_issues" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "employment_id" TEXT NOT NULL,
    "template_version_id" TEXT NOT NULL,
    "card_serial" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL DEFAULT 1,
    "issue_reason" "CardIssueReason" NOT NULL DEFAULT 'INITIAL',
    "reason_notes" TEXT,
    "status" "CardIssueStatus" NOT NULL DEFAULT 'DRAFT',
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "printed_snapshot" JSONB NOT NULL,
    "layout_snapshot" JSONB NOT NULL,
    "template_checksum" TEXT NOT NULL,
    "render_manifest" JSONB,
    "pdf_storage_key" TEXT,
    "pdf_checksum_sha256" TEXT,
    "previous_issue_id" TEXT,
    "issued_by_user_id" TEXT,
    "issued_at" TIMESTAMP(3),
    "valid_until" DATE,
    "revoked_by_user_id" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revocation_reason" "CardRevocationReason",
    "revocation_notes" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
    "output_format" "PrintOutputFormat" NOT NULL DEFAULT 'A4_SHEET',
    "side" "PrintJobSide" NOT NULL DEFAULT 'DUPLEX',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "output_storage_key" TEXT,
    "output_file_size_bytes" INTEGER,
    "output_checksum_sha256" TEXT,
    "mime_type" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "failed_reason" TEXT,
    "operator_status" "OperatorPrintStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "confirmed_by_user_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmation_notes" TEXT,
    "idempotency_key" TEXT,
    "created_by_user_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_job_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "print_job_id" TEXT NOT NULL,
    "card_issue_id" TEXT NOT NULL,
    "item_index" INTEGER NOT NULL DEFAULT 0,
    "status" "PrintJobItemStatus" NOT NULL DEFAULT 'PENDING',
    "sheet_number" INTEGER,
    "grid_row" INTEGER,
    "grid_column" INTEGER,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "error_message" TEXT,
    "rendered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_issues_tenant_id_status_idx" ON "card_issues"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "card_issues_tenant_id_person_id_idx" ON "card_issues"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "card_issues_tenant_id_employment_id_idx" ON "card_issues"("tenant_id", "employment_id");

-- CreateIndex
CREATE INDEX "card_issues_tenant_id_is_current_idx" ON "card_issues"("tenant_id", "is_current");

-- CreateIndex
CREATE INDEX "card_issues_tenant_id_card_serial_idx" ON "card_issues"("tenant_id", "card_serial");

-- CreateIndex
CREATE UNIQUE INDEX "card_issues_tenant_id_card_serial_key" ON "card_issues"("tenant_id", "card_serial");

-- CreateIndex
CREATE UNIQUE INDEX "card_issues_tenant_id_idempotency_key_key" ON "card_issues"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_status_idx" ON "print_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_operator_status_idx" ON "print_jobs"("tenant_id", "operator_status");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_created_at_idx" ON "print_jobs"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "print_jobs_tenant_id_idempotency_key_key" ON "print_jobs"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "print_job_items_tenant_id_print_job_id_idx" ON "print_job_items"("tenant_id", "print_job_id");

-- CreateIndex
CREATE INDEX "print_job_items_tenant_id_card_issue_id_idx" ON "print_job_items"("tenant_id", "card_issue_id");

-- CreateIndex
CREATE INDEX "print_job_items_print_job_id_item_index_idx" ON "print_job_items"("print_job_id", "item_index");

-- AddForeignKey
ALTER TABLE "card_issues" ADD CONSTRAINT "card_issues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_issues" ADD CONSTRAINT "card_issues_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_issues" ADD CONSTRAINT "card_issues_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "employments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_issues" ADD CONSTRAINT "card_issues_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_issues" ADD CONSTRAINT "card_issues_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_issues" ADD CONSTRAINT "card_issues_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_issues" ADD CONSTRAINT "card_issues_previous_issue_id_fkey" FOREIGN KEY ("previous_issue_id") REFERENCES "card_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job_items" ADD CONSTRAINT "print_job_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job_items" ADD CONSTRAINT "print_job_items_print_job_id_fkey" FOREIGN KEY ("print_job_id") REFERENCES "print_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job_items" ADD CONSTRAINT "print_job_items_card_issue_id_fkey" FOREIGN KEY ("card_issue_id") REFERENCES "card_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
