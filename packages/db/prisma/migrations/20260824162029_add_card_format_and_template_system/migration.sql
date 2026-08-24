-- CreateEnum
CREATE TYPE "CardOrientation" AS ENUM ('VERTICAL', 'HORIZONTAL');

-- CreateEnum
CREATE TYPE "CardFormatPreset" AS ENUM ('COMPANY_VERTICAL_60X90', 'ISO_ID1_HORIZONTAL', 'ISO_ID1_VERTICAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TemplatePresetId" AS ENUM ('CLASSIC_VERTICAL', 'MODERN_STRIPE', 'PHOTO_FOCUS', 'FACTORY_INDUSTRIAL', 'CONTRACTOR', 'VISITOR');

-- CreateEnum
CREATE TYPE "TemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateAssignmentTarget" AS ENUM ('WORKER_OVERRIDE', 'JOB_CATEGORY', 'ORG_UNIT', 'LOCATION', 'ORGANIZATION', 'SYSTEM');

-- CreateTable
CREATE TABLE "card_formats" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preset" "CardFormatPreset" NOT NULL DEFAULT 'COMPANY_VERTICAL_60X90',
    "width_mm" DECIMAL(6,2) NOT NULL,
    "height_mm" DECIMAL(6,2) NOT NULL,
    "bleed_mm" DECIMAL(4,2) NOT NULL DEFAULT 3.00,
    "safe_area_mm" DECIMAL(4,2) NOT NULL DEFAULT 3.00,
    "orientation" "CardOrientation" NOT NULL DEFAULT 'VERTICAL',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "format_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "preset_id" "TemplatePresetId" NOT NULL DEFAULT 'CLASSIC_VERTICAL',
    "active_version_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "TemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "layout_schema_version" TEXT NOT NULL DEFAULT '1.0.0',
    "layout" JSONB NOT NULL,
    "checksum_sha256" TEXT,
    "published_at" TIMESTAMP(3),
    "published_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "target_type" "TemplateAssignmentTarget" NOT NULL,
    "target_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_formats_tenant_id_idx" ON "card_formats"("tenant_id");

-- CreateIndex
CREATE INDEX "card_templates_tenant_id_idx" ON "card_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "card_templates_tenant_id_organization_id_idx" ON "card_templates"("tenant_id", "organization_id");

-- CreateIndex
CREATE INDEX "template_versions_tenant_id_idx" ON "template_versions"("tenant_id");

-- CreateIndex
CREATE INDEX "template_versions_template_id_status_idx" ON "template_versions"("template_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_template_id_version_number_key" ON "template_versions"("template_id", "version_number");

-- CreateIndex
CREATE INDEX "template_assignments_tenant_id_idx" ON "template_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "template_assignments_tenant_id_target_type_target_id_idx" ON "template_assignments"("tenant_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "card_formats" ADD CONSTRAINT "card_formats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_templates" ADD CONSTRAINT "card_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_templates" ADD CONSTRAINT "card_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_templates" ADD CONSTRAINT "card_templates_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "card_formats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "card_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_assignments" ADD CONSTRAINT "template_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_assignments" ADD CONSTRAINT "template_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "card_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
