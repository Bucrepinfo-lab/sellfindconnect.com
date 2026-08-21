import {
  conversationParticipantRoles,
  type ConversationMessage,
  type ConversationParticipantRole,
} from './messaging';

export const conversationRealtimeNamespace = '/v1/conversations';
export const conversationPresenceWindowMs = 60_000;
export const conversationPresenceAwayAfterMs = 45_000;

export const conversationPresenceStatuses = ['ONLINE', 'AWAY', 'OFFLINE'] as const;
export type ConversationPresenceStatus = (typeof conversationPresenceStatuses)[number];

export const conversationRealtimeEventTypes = [
  'conversation.connected',
  'conversation.message',
  'conversation.typing',
  'conversation.receipt',
  'conversation.presence',
  'conversation.error',
] as const;
export type ConversationRealtimeEventType = (typeof conversationRealtimeEventTypes)[number];

export class ConversationRealtimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationRealtimeError';
  }
}

export type ConversationRealtimeHandshake = {
  tenantId: string;
  sessionToken: string;
  conversationId?: string;
  participantRole: Exclude<ConversationParticipantRole, 'SYSTEM'>;
};

export type ConversationRealtimeEvent<T = unknown> = {
  type: ConversationRealtimeEventType;
  tenantId: string;
  conversationId?: string;
  occurredAt: string;
  payload: T;
};

export type ConversationPresenceConnection = {
  connectionId: string;
  userId: string;
  tenantId: string;
  conversationId?: string;
  participantRole: Exclude<ConversationParticipantRole, 'SYSTEM'>;
  connectedAt: string;
  lastSeenAt: string;
};

export type ConversationPresenceParticipant = {
  userId: string;
  participantRole: Exclude<ConversationParticipantRole, 'SYSTEM'>;
  status: ConversationPresenceStatus;
  connectionCount: number;
  lastSeenAt: string;
};

export type ConversationPresenceSnapshot = {
  tenantId: string;
  conversationId: string;
  onlineCount: number;
  participants: ConversationPresenceParticipant[];
};

const uuidLike =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function conversationRealtimeRoom(tenantId: string, conversationId: string): string {
  const safeTenantId = tenantId.trim();
  const safeConversationId = conversationId.trim();
  if (!safeTenantId || !safeConversationId) {
    throw new ConversationRealtimeError('Realtime rooms require a tenant and conversation.');
  }

  return `tenant:${safeTenantId}:conversation:${safeConversationId}`;
}

export function tenantPresenceRoom(tenantId: string): string {
  const safeTenantId = tenantId.trim();
  if (!safeTenantId) {
    throw new ConversationRealtimeError('Presence rooms require a tenant.');
  }

  return `tenant:${safeTenantId}:presence`;
}

export function httpConversationPresenceConnectionId(
  userId: string,
  conversationId: string,
): string {
  return `http:${userId}:${conversationId}`;
}

export function isConversationPresenceActive(
  lastSeenAt: string | undefined,
  nowIso = new Date().toISOString(),
  windowMs = conversationPresenceWindowMs,
): boolean {
  if (!lastSeenAt) {
    return false;
  }

  return Date.parse(nowIso) - Date.parse(lastSeenAt) <= windowMs;
}

export function resolveConversationPresenceStatus(
  lastSeenAt: string | undefined,
  nowIso = new Date().toISOString(),
  connectionCount = 0,
): ConversationPresenceStatus {
  if (connectionCount > 0 && isConversationPresenceActive(lastSeenAt, nowIso, conversationPresenceAwayAfterMs)) {
    return 'ONLINE';
  }

  if (isConversationPresenceActive(lastSeenAt, nowIso)) {
    return 'AWAY';
  }

  return 'OFFLINE';
}

export function describeConversationPresenceStatus(status: ConversationPresenceStatus): string {
  switch (status) {
    case 'ONLINE':
      return 'Online';
    case 'AWAY':
      return 'Away';
    case 'OFFLINE':
      return 'Offline';
  }
}

export function assertConversationRealtimeSession(session: { mfaVerified: boolean }): void {
  if (!session.mfaVerified) {
    throw new ConversationRealtimeError('MFA verification is required for conversation sockets.');
  }
}

export function assertConversationPresenceRole(
  role: ConversationParticipantRole,
): asserts role is Exclude<ConversationParticipantRole, 'SYSTEM'> {
  if (role === 'SYSTEM') {
    throw new ConversationRealtimeError('System actors cannot publish conversation presence.');
  }
}

export function buildConversationRealtimeEvent<T>(input: {
  type: ConversationRealtimeEventType;
  tenantId: string;
  conversationId?: string;
  payload: T;
  occurredAt?: string;
}): ConversationRealtimeEvent<T> {
  const tenantId = input.tenantId.trim();
  const conversationId = input.conversationId?.trim();
  if (!tenantId) {
    throw new ConversationRealtimeError('Realtime events require a tenant.');
  }

  if (input.type !== 'conversation.presence' && input.type !== 'conversation.connected' && !conversationId) {
    throw new ConversationRealtimeError('Realtime conversation events require a conversation.');
  }

  return {
    type: input.type,
    tenantId,
    conversationId: conversationId || undefined,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    payload: input.payload,
  };
}

export function readConversationRealtimeHandshake(source: {
  auth?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}): ConversationRealtimeHandshake {
  const tenantId =
    firstString(source.auth?.tenantId) ??
    firstString(source.query?.tenantId) ??
    headerValue(source.headers, 'x-tenant-id');
  const sessionToken =
    firstString(source.auth?.token) ??
    firstString(source.auth?.sessionToken) ??
    firstString(source.query?.token) ??
    firstString(source.query?.sessionToken) ??
    headerValue(source.headers, 'x-session-token');
  const conversationId =
    firstString(source.auth?.conversationId) ??
    firstString(source.query?.conversationId) ??
    headerValue(source.headers, 'x-conversation-id');
  const rawRole =
    firstString(source.auth?.participantRole) ??
    firstString(source.query?.participantRole) ??
    headerValue(source.headers, 'x-participant-role') ??
    'TENANT_AGENT';

  if (!tenantId || !uuidLike.test(tenantId)) {
    throw new ConversationRealtimeError('A valid tenant id is required to open a conversation socket.');
  }

  if (!sessionToken) {
    throw new ConversationRealtimeError('A session token is required to open a conversation socket.');
  }

  if (!isParticipantRole(rawRole)) {
    throw new ConversationRealtimeError('Unknown conversation participant role.');
  }

  assertConversationPresenceRole(rawRole);

  return {
    tenantId,
    sessionToken,
    conversationId,
    participantRole: rawRole,
  };
}

export function emptyConversationPresenceSnapshot(
  tenantId: string,
  conversationId: string,
): ConversationPresenceSnapshot {
  return {
    tenantId,
    conversationId,
    onlineCount: 0,
    participants: [],
  };
}

export class ConversationPresenceRegistry {
  private readonly connections = new Map<string, ConversationPresenceConnection>();

  connect(input: {
    connectionId: string;
    userId: string;
    tenantId: string;
    conversationId?: string;
    participantRole: ConversationParticipantRole;
    nowIso?: string;
  }): ConversationPresenceConnection {
    assertConversationPresenceRole(input.participantRole);
    const nowIso = input.nowIso ?? new Date().toISOString();
    const existing = this.connections.get(input.connectionId);
    const connection: ConversationPresenceConnection = {
      connectionId: input.connectionId,
      userId: input.userId,
      tenantId: input.tenantId,
      conversationId: input.conversationId?.trim() || undefined,
      participantRole: input.participantRole,
      connectedAt: existing?.connectedAt ?? nowIso,
      lastSeenAt: nowIso,
    };

    this.connections.set(input.connectionId, connection);
    return connection;
  }

  heartbeat(connectionId: string, nowIso = new Date().toISOString()): ConversationPresenceConnection {
    const existing = this.connections.get(connectionId);
    if (!existing) {
      throw new ConversationRealtimeError('Conversation presence connection was not found.');
    }

    const updated = { ...existing, lastSeenAt: nowIso };
    this.connections.set(connectionId, updated);
    return updated;
  }

  disconnect(connectionId: string): ConversationPresenceConnection | undefined {
    const existing = this.connections.get(connectionId);
    if (!existing) {
      return undefined;
    }

    this.connections.delete(connectionId);
    return existing;
  }

  snapshot(
    tenantId: string,
    conversationId: string,
    nowIso = new Date().toISOString(),
  ): ConversationPresenceSnapshot {
    const grouped = new Map<string, ConversationPresenceConnection[]>();

    for (const connection of this.connections.values()) {
      if (connection.tenantId !== tenantId) {
        continue;
      }

      if (connection.conversationId && connection.conversationId !== conversationId) {
        continue;
      }

      const current = grouped.get(connection.userId) ?? [];
      current.push(connection);
      grouped.set(connection.userId, current);
    }

    const participants = [...grouped.entries()]
      .map(([userId, connections]) => {
        const lastSeenAt = connections
          .map((connection) => connection.lastSeenAt)
          .sort()
          .at(-1)!;
        const participantRole = connections.at(-1)!.participantRole;
        const liveCount = connections.filter((connection) =>
          isConversationPresenceActive(connection.lastSeenAt, nowIso, conversationPresenceAwayAfterMs),
        ).length;

        return {
          userId,
          participantRole,
          status: resolveConversationPresenceStatus(lastSeenAt, nowIso, connections.length),
          connectionCount: liveCount,
          lastSeenAt,
        };
      })
      .sort((left, right) => left.userId.localeCompare(right.userId));

    return {
      tenantId,
      conversationId,
      onlineCount: participants.filter((participant) => participant.status === 'ONLINE').length,
      participants,
    };
  }
}

export type ConversationMessageRealtimePayload = {
  message: ConversationMessage;
};

export type ConversationReceiptRealtimePayload = {
  readerRole?: ConversationParticipantRole;
  messages: ConversationMessage[];
};

export type ConversationTypingRealtimePayload = {
  typingRole: ConversationParticipantRole;
  typingAt: string;
  typingActive: boolean;
};

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }

  return undefined;
}

function headerValue(headers: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return firstString(match?.[1]);
}

function isParticipantRole(value: string): value is ConversationParticipantRole {
  return (conversationParticipantRoles as readonly string[]).includes(value);
}
