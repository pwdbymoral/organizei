CREATE TYPE "public"."recurrence_cadence" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "financial_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"movement_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_date" date NOT NULL,
	"author_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_payment_amount_positive" CHECK ("financial_payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "recurrence_rule_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"version" integer NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"max_occurrences" integer,
	"description" text NOT NULL,
	"direction" "movement_direction" NOT NULL,
	"expected_amount_cents" integer NOT NULL,
	"cadence" "recurrence_cadence" NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurrence_rule_amount_positive" CHECK ("recurrence_rule_versions"."expected_amount_cents" > 0),
	CONSTRAINT "recurrence_rule_max_occurrences_positive" CHECK ("recurrence_rule_versions"."max_occurrences" > 0 OR "recurrence_rule_versions"."max_occurrences" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "recurrence_series" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_movements" DROP CONSTRAINT "realized_date_requires_realized_status";--> statement-breakpoint
ALTER TABLE "financial_movements" ADD COLUMN "recurrence_rule_version_id" text;--> statement-breakpoint
ALTER TABLE "financial_movements" ADD COLUMN "occurrence_sequence" integer;--> statement-breakpoint
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_movement_id_financial_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."financial_movements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rule_versions" ADD CONSTRAINT "recurrence_rule_versions_series_id_recurrence_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."recurrence_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rule_versions" ADD CONSTRAINT "recurrence_rule_versions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_space_id_family_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."family_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_payment_movement_id_idx" ON "financial_payments" USING btree ("movement_id");--> statement-breakpoint
CREATE INDEX "financial_payment_paid_date_idx" ON "financial_payments" USING btree ("paid_date");--> statement-breakpoint
CREATE UNIQUE INDEX "recurrence_rule_version_unique" ON "recurrence_rule_versions" USING btree ("series_id","version");--> statement-breakpoint
CREATE INDEX "recurrence_rule_effective_from_idx" ON "recurrence_rule_versions" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "recurrence_series_space_id_idx" ON "recurrence_series" USING btree ("space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_movement_recurrence_occurrence_unique" ON "financial_movements" USING btree ("recurrence_rule_version_id","occurrence_sequence");--> statement-breakpoint
ALTER TABLE "financial_movements" ADD CONSTRAINT "realized_date_requires_realized_status" CHECK (("financial_movements"."status" = 'realized' AND "financial_movements"."realized_date" IS NOT NULL AND "financial_movements"."realized_amount_cents" IS NOT NULL) OR ("financial_movements"."status" IN ('pending', 'canceled') AND "financial_movements"."realized_date" IS NULL AND "financial_movements"."realized_amount_cents" IS NULL));
