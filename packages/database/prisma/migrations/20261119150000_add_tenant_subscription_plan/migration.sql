-- The tenant's subscription plan, BASIC or PRO (owner decision 19/11/26).
-- Pro unlocks 20 media items per listing (Basic keeps 10); RFQs stay on
-- every plan. Additive only: one new column with a default, so every
-- existing tenant becomes BASIC and keeps exactly what it has today.
ALTER TABLE "Tenant" ADD COLUMN "subscriptionPlan" VARCHAR(16) NOT NULL DEFAULT 'BASIC';
