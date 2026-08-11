CREATE INDEX "financial_movement_space_status_idx" ON "financial_movements" USING btree ("space_id","status");--> statement-breakpoint
DELETE FROM "financial_movements" AS movement
WHERE movement."status" = 'canceled'
  AND NOT EXISTS (
    SELECT 1
    FROM "financial_payments" AS payment
    WHERE payment."movement_id" = movement."id"
  );
