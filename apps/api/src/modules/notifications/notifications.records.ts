import type {
  NotificationChannel,
  NotificationDeliveryPlan,
  NotificationDestination,
} from '@telpen/domain';

export type NotificationChannelStatus = {
  channel: NotificationChannel;
  status: 'QUEUED' | 'SUPPRESSED' | 'SENT' | 'FAILED';
  reason?: string;
  provider?: string;
  providerReference?: string;
};

export type NotificationDeliveryAttemptRecord = {
  id: string;
  channel: NotificationChannel;
  status: 'SENT' | 'FAILED' | 'SUPPRESSED';
  provider?: string;
  providerReference?: string;
  failureReason?: string;
  attemptedAt: string;
};

export type NotificationOutboxRecord = {
  id: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  destination?: NotificationDestination;
  plan: NotificationDeliveryPlan;
  channelStatuses: NotificationChannelStatus[];
  deliveryAttempts: NotificationDeliveryAttemptRecord[];
  createdAt: string;
  updatedAt: string;
};
