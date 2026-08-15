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

WITH latest AS (
  SELECT DISTINCT ON ("space_id")
    "space_id",
    "amount_cents",
    "confirmed_at",
    "author_id",
    "balance_mode"
  FROM "confirmed_balances"
  ORDER BY "space_id", "confirmed_at" DESC, "created_at" DESC
), cash_events AS (
  SELECT
    latest."space_id",
    latest."amount_cents" + COALESCE(SUM(
      CASE
        WHEN movement."direction" = 'income' THEN event_amount.amount_cents
        ELSE -event_amount.amount_cents
      END
    ), 0) AS "amount_cents",
    latest."author_id"
  FROM latest
  LEFT JOIN "financial_movements" AS movement
    ON movement."space_id" = latest."space_id"
   AND movement."status" <> 'canceled'
  LEFT JOIN LATERAL (
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM "financial_payments" AS any_payment
        WHERE any_payment."movement_id" = movement."id"
      ) THEN COALESCE(SUM(payment."amount_cents"), 0)::integer
      WHEN movement."status" = 'realized'
       AND movement."realized_date" <= CURRENT_DATE
       AND (
         latest."balance_mode" = 'reconstruct_history'
         OR movement."realized_date" > latest."confirmed_at"::date
       )
      THEN COALESCE(movement."realized_amount_cents", movement."expected_amount_cents")
      ELSE 0
    END::integer AS amount_cents
    FROM "financial_payments" AS payment
    WHERE payment."movement_id" = movement."id"
      AND payment."paid_date" <= CURRENT_DATE
      AND (
        latest."balance_mode" = 'reconstruct_history'
        OR payment."paid_date" > latest."confirmed_at"::date
        OR (
          payment."paid_date" = latest."confirmed_at"::date
          AND payment."created_at" > latest."confirmed_at"
        )
      )
  ) AS event_amount ON TRUE
  GROUP BY latest."space_id", latest."amount_cents", latest."author_id"
)
INSERT INTO "opening_balances" ("space_id", "amount_cents", "effective_at", "author_id")
SELECT "space_id", "amount_cents", now(), "author_id"
FROM cash_events
ON CONFLICT ("space_id") DO NOTHING;
