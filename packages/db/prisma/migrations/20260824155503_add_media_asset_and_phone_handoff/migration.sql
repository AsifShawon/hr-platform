-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "person_id" TEXT,
    "storage_key_master" TEXT NOT NULL,
    "storage_key_card_ready" TEXT,
    "storage_key_thumbnail" TEXT,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_handoff_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMP(3),
    "media_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_handoff_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_tenant_id_idx" ON "media_assets"("tenant_id");

-- CreateIndex
CREATE INDEX "media_assets_tenant_id_person_id_idx" ON "media_assets"("tenant_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "phone_handoff_tokens_token_hash_key" ON "phone_handoff_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "phone_handoff_tokens_tenant_id_idx" ON "phone_handoff_tokens"("tenant_id");

-- CreateIndex
CREATE INDEX "phone_handoff_tokens_token_hash_idx" ON "phone_handoff_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "phone_handoff_tokens_expires_at_idx" ON "phone_handoff_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_photo_media_id_fkey" FOREIGN KEY ("photo_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_handoff_tokens" ADD CONSTRAINT "phone_handoff_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
