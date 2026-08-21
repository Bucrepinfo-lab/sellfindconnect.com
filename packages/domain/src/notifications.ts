export const notificationChannels = ['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP'] as const;

export type NotificationChannel = (typeof notificationChannels)[number];

export const notificationEventTypes = [
  'ADVERT_RENEWAL_DAY_35',
  'ADVERT_RENEWAL_DAY_39',
  'ADVERT_AUTO_DELETE',
  'CONVERSATION_NEW',
  'CONVERSATION_MESSAGE',
  'CONVERSATION_ASSIGNMENT',
  'CONVERSATION_SLA_DUE_SOON',
  'CONVERSATION_SLA_BREACHED',
  'FINANCE_REMITTANCE_ALERT',
  'SOURCE_FINDER_OPPORTUNITY',
  'SUBSCRIPTION_TRIAL_ENDING',
  'SECURITY_ALERT',
] as const;

export type NotificationEventType = (typeof notificationEventTypes)[number];

export type NotificationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationConsentState = 'GRANTED' | 'DENIED' | 'REQUIRED' | 'NOT_REQUIRED';

export type NotificationPreference = {
  channel: NotificationChannel;
  enabled: boolean;
  consentState: NotificationConsentState;
};

export type NotificationRecipient = {
  userId?: string;
  countryCode: string;
  locale: string;
  timezone: string;
  preferences: NotificationPreference[];
};

export type NotificationDeliveryInput = {
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  recipient: NotificationRecipient;
  requiredChannels?: NotificationChannel[];
  fallbackChannels?: NotificationChannel[];
};

export type NotificationDeliveryPlan = {
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  selectedChannels: NotificationChannel[];
  suppressedChannels: {
    channel: NotificationChannel;
    reason: string;
  }[];
  requiresImmediateAttention: boolean;
  title: string;
  message: string;
};

export const defaultNotificationPreferences: NotificationPreference[] = [
  { channel: 'IN_APP', enabled: true, consentState: 'NOT_REQUIRED' },
  { channel: 'EMAIL', enabled: true, consentState: 'GRANTED' },
  { channel: 'SMS', enabled: false, consentState: 'REQUIRED' },
  { channel: 'PUSH', enabled: false, consentState: 'REQUIRED' },
  { channel: 'WHATSAPP', enabled: false, consentState: 'REQUIRED' },
];

export function buildNotificationDeliveryPlan(
  input: NotificationDeliveryInput,
): NotificationDeliveryPlan {
  const requiredChannels = new Set<NotificationChannel>(input.requiredChannels ?? ['IN_APP']);
  const fallbackChannels = input.fallbackChannels ?? defaultFallbackChannels(input.severity);
  const candidateChannels = uniqueChannels([...requiredChannels, ...fallbackChannels]);
  const selectedChannels: NotificationChannel[] = [];
  const suppressedChannels: NotificationDeliveryPlan['suppressedChannels'] = [];

  for (const channel of candidateChannels) {
    const preference = getPreference(input.recipient.preferences, channel);
    if (!preference.enabled) {
      suppressedChannels.push({ channel, reason: 'Recipient disabled this channel.' });
      continue;
    }

    if (preference.consentState === 'DENIED') {
      suppressedChannels.push({ channel, reason: 'Recipient denied consent.' });
      continue;
    }

    if (preference.consentState === 'REQUIRED') {
      suppressedChannels.push({ channel, reason: 'Recipient consent is required first.' });
      continue;
    }

    selectedChannels.push(channel);
  }

  if (!selectedChannels.includes('IN_APP')) {
    selectedChannels.unshift('IN_APP');
  }

  return {
    eventType: input.eventType,
    severity: input.severity,
    selectedChannels: uniqueChannels(selectedChannels),
    suppressedChannels,
    requiresImmediateAttention: input.severity === 'HIGH' || input.severity === 'CRITICAL',
    title: input.title,
    message: input.message,
  };
}

export function defaultFallbackChannels(severity: NotificationSeverity): NotificationChannel[] {
  if (severity === 'CRITICAL') return ['EMAIL', 'PUSH', 'SMS', 'WHATSAPP'];
  if (severity === 'HIGH') return ['EMAIL', 'PUSH', 'SMS'];
  if (severity === 'MEDIUM') return ['EMAIL', 'PUSH'];
  return ['EMAIL'];
}

export function getPreference(
  preferences: NotificationPreference[],
  channel: NotificationChannel,
): NotificationPreference {
  return (
    preferences.find((preference) => preference.channel === channel) ??
    defaultNotificationPreferences.find((preference) => preference.channel === channel) ?? {
      channel,
      enabled: false,
      consentState: 'REQUIRED',
    }
  );
}

function uniqueChannels(channels: NotificationChannel[]): NotificationChannel[] {
  return Array.from(new Set(channels));
}
