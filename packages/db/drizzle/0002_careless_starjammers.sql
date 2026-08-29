CREATE TABLE IF NOT EXISTS "momentum_reports" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"thesis" text NOT NULL,
	"events" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "phase" text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "properties" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "relationships" ADD COLUMN "evidence_url" text;--> statement-breakpoint
ALTER TABLE "relationships" ADD COLUMN "confidence" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "momentum_reports" ADD CONSTRAINT "momentum_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_entity_type_external_id_unique" UNIQUE("entity_type","external_id");