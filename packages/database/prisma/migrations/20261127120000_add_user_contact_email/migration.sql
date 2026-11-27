-- My email (owner 27/11/26): an optional contact email for receipts and
-- replies, kept apart from "email" (the sign-in email, a .invalid placeholder
-- for phone-only accounts). Additive only: one nullable column.
ALTER TABLE "User" ADD COLUMN "contactEmail" VARCHAR(320);
