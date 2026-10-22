ALTER TABLE "NotificationOutboxRecord" ADD COLUMN "destination" JSONB;
ALTER TABLE "NotificationOutboxRecord" ADD COLUMN "channelStatuses" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "NotificationOutboxRecord" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
