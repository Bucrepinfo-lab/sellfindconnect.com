import type { NotificationChannel } from './notifications';

export const notificationDispatchAttemptStatuses = ['QUEUED', 'SUPPRESSED', 'SENT', 'FAILED'] as const;

export type NotificationDispatchAttemptStatus = (typeof notificationDispatchAttemptStatuses)[number];

export type NotificationDestination = {
  userId?: string;
  email?: string;
  phone?: string;
  pushToken?: string;
};

export type NotificationDispatchAddress =
  | {
      to: string;
    }
  | {
      skippedReason: string;
    };

export type NotificationDispatchPlanItem = {
  channel: NotificationChannel;
  action: 'SEND' | 'SKIP';
  to?: string;
  reason?: string;
};

export function notificationDispatchIdempotencyKey(
  outboxRecordId: string,
  channel: NotificationChannel,
): string {
  return `${outboxRecordId}:${channel}`;
}

export function resolveNotificationDispatchAddress(
  channel: NotificationChannel,
  destination: NotificationDestination | undefined,
  tenantId: string,
): NotificationDispatchAddress {
  switch (channel) {
    case 'IN_APP': {
      const userId = destination?.userId?.trim();
      return { to: userId || `tenant:${tenantId}` };
    }
    case 'EMAIL': {
      const email = destination?.email?.trim();
      if (!email) {
        return { skippedReason: 'No email destination is configured.' };
      }
      return { to: email };
    }
    case 'SMS':
    case 'WHATSAPP': {
      const phone = destination?.phone?.trim();
      if (!phone) {
        return { skippedReason: 'No phone destination is configured.' };
      }
      return { to: phone };
    }
    case 'PUSH': {
      const token = destination?.pushToken?.trim();
      if (!token) {
        return { skippedReason: 'No push token is configured.' };
      }
      return { to: token };
    }
  }
}

export function planNotificationDispatchAttempts(input: {
  selectedChannels: NotificationChannel[];
  destination?: NotificationDestination;
  tenantId: string;
}): NotificationDispatchPlanItem[] {
  return input.selectedChannels.map((channel) => {
    const address = resolveNotificationDispatchAddress(channel, input.destination, input.tenantId);
    if ('skippedReason' in address) {
      return {
        channel,
        action: 'SKIP' as const,
        reason: address.skippedReason,
      };
    }

    return {
      channel,
      action: 'SEND' as const,
      to: address.to,
    };
  });
}

export function shouldRetryNotificationChannel(
  status: NotificationDispatchAttemptStatus,
): boolean {
  return status === 'QUEUED' || status === 'FAILED';
}

export function describeNotificationDispatchAttemptStatus(
  status: NotificationDispatchAttemptStatus,
): string {
  switch (status) {
    case 'QUEUED':
      return 'Queued';
    case 'SUPPRESSED':
      return 'Suppressed';
    case 'SENT':
      return 'Sent';
    case 'FAILED':
      return 'Failed';
  }
}

export function resolveNotificationDispatchContent(input: {
  title: string;
  message: string;
}): { subject: string; body: string } {
  return {
    subject: input.title.trim(),
    body: input.message.trim(),
  };
}
