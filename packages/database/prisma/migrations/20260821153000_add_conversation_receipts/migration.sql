ALTER TABLE "Conversation" ADD COLUMN "typingRole" "ConversationParticipantRole";
ALTER TABLE "Conversation" ADD COLUMN "typingAt" TIMESTAMP(3);

ALTER TABLE "ConversationMessage" ADD COLUMN "deliveryStatus" VARCHAR(20) NOT NULL DEFAULT 'SENT';
ALTER TABLE "ConversationMessage" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "ConversationMessage" ADD COLUMN "readAt" TIMESTAMP(3);
ALTER TABLE "ConversationMessage" ADD COLUMN "readByRole" "ConversationParticipantRole";

CREATE INDEX "ConversationMessage_deliveryStatus_createdAt_idx" ON "ConversationMessage"("deliveryStatus", "createdAt");
