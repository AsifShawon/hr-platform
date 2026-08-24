-- DropForeignKey
ALTER TABLE "org_units" DROP CONSTRAINT "org_units_parent_id_fkey";

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
