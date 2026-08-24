-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('HEADQUARTERS', 'OFFICE', 'FACTORY', 'BRANCH', 'SITE', 'WAREHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('DIVISION', 'DEPARTMENT', 'SECTION', 'TEAM', 'LINE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProvisioningTokenType" AS ENUM ('FIRST_OWNER_ACTIVATION', 'PASSWORD_RESET');

-- DropIndex
DROP INDEX "role_grants_user_id_role_id_key";

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "accent_color" TEXT NOT NULL DEFAULT '#14B8A6',
ADD COLUMN     "address" JSONB,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "employee_number_rule" JSONB,
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en-US',
ADD COLUMN     "logo_path" TEXT,
ADD COLUMN     "primary_color" TEXT NOT NULL DEFAULT '#134E4A',
ADD COLUMN     "secondary_color" TEXT NOT NULL DEFAULT '#0F766E',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka';

-- AlterTable
ALTER TABLE "role_grants" ADD COLUMN     "location_id" TEXT,
ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_temporary_bootstrap" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "locked_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "system_installations" (
    "id" TEXT NOT NULL,
    "is_activated" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(3),
    "deployment_mode" TEXT NOT NULL DEFAULT 'local',
    "lan_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'OFFICE',
    "address" JSONB,
    "contact_phone" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "name_bangla" TEXT,
    "code" TEXT NOT NULL,
    "type" "OrgUnitType" NOT NULL DEFAULT 'DEPARTMENT',
    "location_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" "ProvisioningTokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provisioning_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE INDEX "locations_organization_id_idx" ON "locations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organization_id_code_key" ON "locations"("organization_id", "code");

-- CreateIndex
CREATE INDEX "org_units_tenant_id_idx" ON "org_units"("tenant_id");

-- CreateIndex
CREATE INDEX "org_units_organization_id_idx" ON "org_units"("organization_id");

-- CreateIndex
CREATE INDEX "org_units_parent_id_idx" ON "org_units"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_units_organization_id_parent_id_name_key" ON "org_units"("organization_id", "parent_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "org_units_organization_id_code_key" ON "org_units"("organization_id", "code");

-- CreateIndex
CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_tokens_token_hash_key" ON "provisioning_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "provisioning_tokens_token_hash_idx" ON "provisioning_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "provisioning_tokens_user_id_idx" ON "provisioning_tokens"("user_id");

-- CreateIndex
CREATE INDEX "role_grants_organization_id_idx" ON "role_grants"("organization_id");

-- CreateIndex
CREATE INDEX "role_grants_location_id_idx" ON "role_grants"("location_id");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_tokens" ADD CONSTRAINT "provisioning_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provisioning_tokens" ADD CONSTRAINT "provisioning_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
