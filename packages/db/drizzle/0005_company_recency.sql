ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "recency" text DEFAULT 'mid' NOT NULL;
UPDATE "companies" SET "recency" = CASE WHEN "display_order" % 2 = 0 THEN 'high' ELSE 'mid' END;
