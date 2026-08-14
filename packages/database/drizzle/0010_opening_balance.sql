CREATE TABLE IF NOT EXISTS "opening_balances" (
  "space_id" text PRIMARY KEY NOT NULL,
  "amount_cents" integer NOT NULL,
  "effective_at" timestamp with time zone NOT NULL,
  "author_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "opening_balance_amount_nonnegative" CHECK ("opening_balances"."amount_cents" >= 0),
  CONSTRAINT "opening_balances_space_id_family_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "family_spaces"("id") ON DELETE cascade,
  CONSTRAINT "opening_balances_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE restrict
);

INSERT INTO "opening_balances" ("space_id", "amount_cents", "effective_at", "author_id")
SELECT DISTINCT ON ("space_id")
  "space_id",
  "amount_cents",
  "confirmed_at",
  "author_id"
FROM "confirmed_balances"
ORDER BY "space_id", "confirmed_at" DESC, "created_at" DESC
ON CONFLICT ("space_id") DO NOTHING;
