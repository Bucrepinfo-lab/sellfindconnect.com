import { describe, expect, it } from 'vitest';

import {
  ConversationPresenceRegistry,
  ConversationRealtimeError,
  assertConversationRealtimeSession,
  buildConversationRealtimeEvent,
  conversationRealtimeNamespace,
  conversationRealtimeRoom,
  describeConversationPresenceStatus,
  httpConversationPresenceConnectionId,
  readConversationRealtimeHandshake,
  resolveConversationPresenceStatus,
  tenantPresenceRoom,
} from './conversation-realtime';

const tenantId = '11111111-1111-4111-8111-111111111111';
const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('conversation realtime helpers', () => {
  it('names tenant-scoped conversation and presence rooms', () => {
    expect(conversationRealtimeRoom(tenantId, conversationId)).toBe(
      `tenant:${tenantId}:conversation:${conversationId}`,
    );
    expect(tenantPresenceRoom(tenantId)).toBe(`tenant:${tenantId}:presence`);
    expect(conversationRealtimeNamespace).toBe('/v1/conversations');
    expect(httpConversationPresenceConnectionId('user-1', conversationId)).toBe(
      `http:user-1:${conversationId}`,
    );
  });

  it('rejects incomplete room names and events', () => {
    expect(() => conversationRealtimeRoom('', conversationId)).toThrow(ConversationRealtimeError);
    expect(() => tenantPresenceRoom(' ')).toThrow(/Presence rooms require a tenant/);
    expect(() =>
      buildConversationRealtimeEvent({
        type: 'conversation.message',
        tenantId,
        payload: { ok: true },
      }),
    ).toThrow(/require a conversation/);
  });

  it('reads handshake credentials from auth, query, or headers', () => {
    expect(
      readConversationRealtimeHandshake({
        auth: { token: 'session-token', tenantId, conversationId, participantRole: 'REQUESTER' },
      }),
    ).toEqual({
      tenantId,
      sessionToken: 'session-token',
      conversationId,
      participantRole: 'REQUESTER',
    });

    expect(
      readConversationRealtimeHandshake({
        query: { sessionToken: ['session-token'], tenantId: [tenantId] },
      }),
    ).toEqual({
      tenantId,
      sessionToken: 'session-token',
      participantRole: 'TENANT_AGENT',
    });

    expect(
      readConversationRealtimeHandshake({
        headers: {
          'X-Tenant-Id': tenantId,
          'X-Session-Token': 'session-token',
          'X-Conversation-Id': conversationId,
        },
      }).conversationId,
    ).toBe(conversationId);
  });

  it('rejects missing credentials, unknown roles, and unverified MFA', () => {
    expect(() => readConversationRealtimeHandshake({ auth: { tenantId } })).toThrow(
      /session token is required/,
    );
    expect(() =>
      readConversationRealtimeHandshake({
        auth: { tenantId, token: 'session-token', participantRole: 'SYSTEM' },
      }),
    ).toThrow(/System actors cannot publish/);
    expect(() =>
      readConversationRealtimeHandshake({
        auth: { tenantId: 'not-a-tenant', token: 'session-token' },
      }),
    ).toThrow(/valid tenant id/);
    expect(() => assertConversationRealtimeSession({ mfaVerified: false })).toThrow(
      /MFA verification is required/,
    );
  });

  it('resolves online, away, and offline presence from last-seen freshness', () => {
    const now = '2026-08-21T12:00:00.000Z';
    expect(resolveConversationPresenceStatus(now, now, 1)).toBe('ONLINE');
    expect(describeConversationPresenceStatus('ONLINE')).toBe('Online');
    expect(resolveConversationPresenceStatus('2026-08-21T11:59:10.000Z', now, 1)).toBe('AWAY');
    expect(resolveConversationPresenceStatus('2026-08-21T11:58:00.000Z', now, 1)).toBe('OFFLINE');
    expect(resolveConversationPresenceStatus(undefined, now, 0)).toBe('OFFLINE');
  });

  it('tracks live presence per tenant conversation and ignores other tenants', () => {
    const registry = new ConversationPresenceRegistry();
    const now = '2026-08-21T12:00:00.000Z';

    registry.connect({
      connectionId: 'socket-1',
      userId: 'agent-1',
      tenantId,
      conversationId,
      participantRole: 'TENANT_AGENT',
      nowIso: now,
    });
    registry.connect({
      connectionId: 'socket-2',
      userId: 'requester-1',
      tenantId,
      participantRole: 'REQUESTER',
      nowIso: now,
    });
    registry.connect({
      connectionId: 'socket-other',
      userId: 'agent-2',
      tenantId: '22222222-2222-4222-8222-222222222222',
      conversationId,
      participantRole: 'TENANT_AGENT',
      nowIso: now,
    });

    const snapshot = registry.snapshot(tenantId, conversationId, now);
    expect(snapshot.onlineCount).toBe(2);
    expect(snapshot.participants.map((participant) => participant.userId)).toEqual([
      'agent-1',
      'requester-1',
    ]);

    registry.disconnect('socket-1');
    const afterLeave = registry.snapshot(tenantId, conversationId, now);
    expect(afterLeave.onlineCount).toBe(1);
    expect(afterLeave.participants[0]?.userId).toBe('requester-1');
  });

  it('builds typed conversation events for live fan-out', () => {
    const event = buildConversationRealtimeEvent({
      type: 'conversation.typing',
      tenantId,
      conversationId,
      occurredAt: '2026-08-21T12:00:10.000Z',
      payload: { typingRole: 'TENANT_AGENT', typingAt: '2026-08-21T12:00:10.000Z', typingActive: true },
    });

    expect(event.type).toBe('conversation.typing');
    expect(event.payload.typingActive).toBe(true);
  });
});
