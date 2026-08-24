-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('PREBOARDING', 'ACTIVE', 'ON_LEAVE', 'INACTIVE', 'SEPARATED');

-- CreateEnum
CREATE TYPE "JobCategory" AS ENUM ('EXECUTIVE', 'MANAGEMENT', 'STAFF', 'OPERATOR', 'WORKER', 'CONTRACTOR', 'INTERN', 'OTHER');

-- CreateEnum
CREATE TYPE "IdentityDocumentType" AS ENUM ('NID', 'SMART_NID', 'BIRTH_CERTIFICATE', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN');

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "display_name_latin" TEXT,
    "display_name_native" TEXT,
    "given_name" TEXT,
    "family_name" TEXT,
    "middle_name" TEXT,
    "phonetic_name" TEXT,
    "date_of_birth" DATE,
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "blood_group" TEXT,
    "primary_phone" TEXT,
    "primary_email" TEXT,
    "address" JSONB,
    "photo_media_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "location_id" TEXT,
    "org_unit_id" TEXT,
    "employee_number" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "job_category" "JobCategory" NOT NULL DEFAULT 'STAFF',
    "join_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "document_type" "IdentityDocumentType" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'BGD',
    "document_number_encrypted" TEXT NOT NULL,
    "document_number_masked" TEXT NOT NULL,
    "document_number_hash" TEXT NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "field_type" "CustomFieldType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "validation_regex" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "person_id" TEXT,
    "employment_id" TEXT,
    "value_text" TEXT,
    "value_number" DOUBLE PRECISION,
    "value_date" DATE,
    "value_boolean" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "people_tenant_id_display_name_idx" ON "people"("tenant_id", "display_name");

-- CreateIndex
CREATE INDEX "people_tenant_id_display_name_native_idx" ON "people"("tenant_id", "display_name_native");

-- CreateIndex
CREATE INDEX "people_tenant_id_primary_phone_idx" ON "people"("tenant_id", "primary_phone");

-- CreateIndex
CREATE INDEX "people_tenant_id_primary_email_idx" ON "people"("tenant_id", "primary_email");

-- CreateIndex
CREATE INDEX "employments_tenant_id_organization_id_status_idx" ON "employments"("tenant_id", "organization_id", "status");

-- CreateIndex
CREATE INDEX "employments_tenant_id_location_id_idx" ON "employments"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "employments_tenant_id_org_unit_id_idx" ON "employments"("tenant_id", "org_unit_id");

-- CreateIndex
CREATE INDEX "employments_tenant_id_join_date_idx" ON "employments"("tenant_id", "join_date");

-- CreateIndex
CREATE INDEX "employments_tenant_id_employee_number_idx" ON "employments"("tenant_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employments_tenant_id_organization_id_employee_number_key" ON "employments"("tenant_id", "organization_id", "employee_number");

-- CreateIndex
CREATE INDEX "identity_documents_tenant_id_document_number_hash_idx" ON "identity_documents"("tenant_id", "document_number_hash");

-- CreateIndex
CREATE INDEX "identity_documents_tenant_id_person_id_idx" ON "identity_documents"("tenant_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_tenant_id_key_key" ON "custom_field_definitions"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "custom_field_values_tenant_id_person_id_idx" ON "custom_field_values"("tenant_id", "person_id");

-- CreateIndex
CREATE INDEX "custom_field_values_tenant_id_employment_id_idx" ON "custom_field_values"("tenant_id", "employment_id");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "employments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
