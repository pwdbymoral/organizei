CREATE TABLE "administrative_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"target_user_id" text,
	"target_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "administrative_audit" ADD CONSTRAINT "administrative_audit_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;