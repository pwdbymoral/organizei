CREATE TYPE "public"."family_membership_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."movement_direction" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."movement_status" AS ENUM('pending', 'realized', 'canceled');--> statement-breakpoint
CREATE TABLE "confirmed_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"author_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "family_membership_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"movement_id" text,
	"author_id" text NOT NULL,
	"action" text NOT NULL,
	"changes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"description" text NOT NULL,
	"direction" "movement_direction" NOT NULL,
	"expected_amount_cents" integer NOT NULL,
	"planned_date" date NOT NULL,
	"status" "movement_status" NOT NULL,
	"realized_amount_cents" integer,
	"realized_date" date,
	"category_id" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "amount_positive" CHECK ("financial_movements"."expected_amount_cents" > 0),
	CONSTRAINT "realized_amount_positive" CHECK ("financial_movements"."realized_amount_cents" > 0 OR "financial_movements"."realized_amount_cents" IS NULL),
	CONSTRAINT "realized_date_requires_realized_status" CHECK (("financial_movements"."status" = 'realized' AND "financial_movements"."realized_date" IS NOT NULL) OR ("financial_movements"."status" != 'realized'))
);
--> statement-breakpoint
ALTER TABLE "confirmed_balances" ADD CONSTRAINT "confirmed_balances_space_id_family_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."family_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmed_balances" ADD CONSTRAINT "confirmed_balances_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_space_id_family_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."family_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_audit_logs" ADD CONSTRAINT "financial_audit_logs_space_id_family_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."family_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_audit_logs" ADD CONSTRAINT "financial_audit_logs_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_movements" ADD CONSTRAINT "financial_movements_space_id_family_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."family_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_movements" ADD CONSTRAINT "financial_movements_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_movements" ADD CONSTRAINT "financial_movements_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "confirmed_balance_space_id_idx" ON "confirmed_balances" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "family_membership_space_id_idx" ON "family_memberships" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "family_membership_user_id_idx" ON "family_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "financial_movement_space_id_idx" ON "financial_movements" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "financial_movement_planned_date_idx" ON "financial_movements" USING btree ("planned_date");