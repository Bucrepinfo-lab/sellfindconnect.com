import type { InquiryType, LeadConversionIntelligence, LeadPriority } from './lead-conversion';

export const conversationStatuses = [
  'OPEN',
  'ASSIGNED',
  'WAITING_ON_ADVERTISER',
  'WAITING_ON_REQUESTER',
  'RESOLVED',
  'BLOCKED',
] as const;

export type ConversationStatus = (typeof conversationStatuses)[number];

export const conversationParticipantRoles = [
  'REQUESTER',
  'ADVERTISER',
  'TENANT_AGENT',
  'SYSTEM',
] as const;

export type ConversationParticipantRole = (typeof conversationParticipantRoles)[number];

export const conversationNotificationTypes = [
  'NEW_CONVERSATION',
  'NEW_MESSAGE',
  'ASSIGNMENT',
  'SLA_DUE_SOON',
  'SLA_BREACHED',
] as const;

export type ConversationNotificationType = (typeof conversationNotificationTypes)[number];

export type ConversationSlaState = 'ON_TRACK' | 'DUE_SOON' | 'BREACHED' | 'PAUSED';

export type ConversationSlaDecision = {
  state: ConversationSlaState;
  priority: LeadPriority;
  responseSlaHours: number;
  dueAt: string;
  minutesUntilDue: number;
  alertType?: Extract<ConversationNotificationType, 'SLA_DUE_SOON' | 'SLA_BREACHED'>;
  message: string;
};

export type ConversationRecord = {
  id: string;
  tenantId: string;
  sourceRecordId: string;
  sourceName: string;
  sourceRole: string;
  inquiryType: InquiryType;
  status: ConversationStatus;
  priority: LeadPriority;
  matchConfidence: number;
  responseSlaHours: number;
  assigneeUserId?: string;
  assigneeDisplayName?: string;
  openedAt: string;
  firstResponseDueAt: string;
  firstResponseAt?: string;
  lastInboundMessageAt: string;
  lastMessageAt: string;
  resolvedAt?: string;
  blockedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  tenantId: string;
  senderRole: ConversationParticipantRole;
  body: string;
  createdAt: string;
};

export type ConversationNotification = {
  id: string;
  tenantId: string;
  conversationId: string;
  type: ConversationNotificationType;
  title: string;
  message: string;
  scheduledFor: string;
  createdAt: string;
};

export type SavedReplySuggestion = {
  id: string;
  title: string;
  body: string;
};

export function getConversationResponseSlaHours(
  intelligence: Pick<LeadConversionIntelligence, 'priority' | 'responseSlaHours'>,
): number {
  return intelligence.responseSlaHours;
}

export function calculateConversationSlaDecision(
  input: {
    openedAt: string;
    lastInboundMessageAt: string;
    firstResponseAt?: string;
    responseSlaHours: number;
    priority: LeadPriority;
    status: ConversationStatus;
  },
  nowIso = new Date().toISOString(),
): ConversationSlaDecision {
  const dueAt = new Date(
    Date.parse(input.lastInboundMessageAt || input.openedAt) +
      input.responseSlaHours * 60 * 60 * 1000,
  ).toISOString();
  const minutesUntilDue = Math.round((Date.parse(dueAt) - Date.parse(nowIso)) / 60_000);

  if (input.status === 'RESOLVED' || input.status === 'BLOCKED') {
    return {
      state: 'PAUSED',
      priority: input.priority,
      responseSlaHours: input.responseSlaHours,
      dueAt,
      minutesUntilDue,
      message: input.status === 'RESOLVED' ? 'Conversation resolved.' : 'Conversation blocked.',
    };
  }

  if (!input.firstResponseAt && minutesUntilDue < 0) {
    return {
      state: 'BREACHED',
      priority: input.priority,
      responseSlaHours: input.responseSlaHours,
      dueAt,
      minutesUntilDue,
      alertType: 'SLA_BREACHED',
      message: 'First response SLA has been breached.',
    };
  }

  if (!input.firstResponseAt && minutesUntilDue <= 60) {
    return {
      state: 'DUE_SOON',
      priority: input.priority,
      responseSlaHours: input.responseSlaHours,
      dueAt,
      minutesUntilDue,
      alertType: 'SLA_DUE_SOON',
      message: 'First response SLA is due soon.',
    };
  }

  if (minutesUntilDue < 0 && input.status === 'WAITING_ON_ADVERTISER') {
    return {
      state: 'BREACHED',
      priority: input.priority,
      responseSlaHours: input.responseSlaHours,
      dueAt,
      minutesUntilDue,
      alertType: 'SLA_BREACHED',
      message: 'Follow-up response SLA has been breached.',
    };
  }

  if (minutesUntilDue <= 60 && input.status === 'WAITING_ON_ADVERTISER') {
    return {
      state: 'DUE_SOON',
      priority: input.priority,
      responseSlaHours: input.responseSlaHours,
      dueAt,
      minutesUntilDue,
      alertType: 'SLA_DUE_SOON',
      message: 'Follow-up response SLA is due soon.',
    };
  }

  return {
    state: 'ON_TRACK',
    priority: input.priority,
    responseSlaHours: input.responseSlaHours,
    dueAt,
    minutesUntilDue,
    message: 'Conversation response is on track.',
  };
}

export function buildSavedReplySuggestions(input: {
  sourceName: string;
  inquiryType: InquiryType;
  quantity?: string;
  urgency?: string;
  nextBestActions?: string[];
}): SavedReplySuggestion[] {
  const contextParts = [
    input.quantity ? `Quantity: ${input.quantity}.` : undefined,
    input.urgency ? `Timing: ${input.urgency}.` : undefined,
  ].filter(Boolean);
  const context = contextParts.length > 0 ? ` ${contextParts.join(' ')}` : '';

  return [
    {
      id: 'reply-introduction',
      title: 'Qualified introduction',
      body: `Hello ${input.sourceName}, thank you for connecting on Sell Find Connect. We are reviewing this ${input.inquiryType.toLowerCase().replaceAll('_', ' ')} and would like to confirm fit, availability, and next steps.${context}`,
    },
    {
      id: 'reply-rfq',
      title: 'RFQ details request',
      body: `Please share your current price terms, delivery coverage, minimum order, lead time, and contact person so we can qualify this opportunity accurately.${context}`,
    },
    {
      id: 'reply-compliance',
      title: 'Compliance check',
      body: 'Before we proceed, please confirm that the goods, services, documentation, payment path, and communications are lawful, accurate, and compliant with platform terms and local requirements.',
    },
    {
      id: 'reply-follow-up',
      title: 'SLA follow-up',
      body: `Following up on this opportunity with ${input.sourceName}. Please reply with the latest status so we can keep the lead moving within the response SLA.`,
    },
  ];
}

export function shouldCountAsTenantResponse(senderRole: ConversationParticipantRole): boolean {
  return senderRole === 'ADVERTISER' || senderRole === 'TENANT_AGENT';
}

export function shouldCreateInboundResponseSla(senderRole: ConversationParticipantRole): boolean {
  return senderRole === 'REQUESTER';
}
