import { describe, expect, it } from 'vitest';

import { ConversationsRealtimeService } from './conversations.realtime.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('ConversationsRealtimeService', () => {
  it('fans message events to the conversation room and presence to the tenant room', () => {
    const realtime = new ConversationsRealtimeService();
    const emitted: Array<{ room: string; event: string }> = [];
    realtime.attachEmitter({
      emitToRoom: (room, event) => {
        emitted.push({ room, event });
      },
    });

    realtime.connect({
      connectionId: 'socket-1',
      userId: 'agent-1',
      tenantId,
      conversationId,
      participantRole: 'TENANT_AGENT',
      nowIso: '2026-08-21T12:00:00.000Z',
    });
    realtime.publishEvent({
      type: 'conversation.message',
      tenantId,
      conversationId,
      occurredAt: '2026-08-21T12:00:01.000Z',
      payload: { message: { id: 'msg-1' } },
    });

    expect(emitted).toEqual(
      expect.arrayContaining([
        {
          room: `tenant:${tenantId}:conversation:${conversationId}`,
          event: 'conversation.presence',
        },
        {
          room: `tenant:${tenantId}:presence`,
          event: 'conversation.presence',
        },
        {
          room: `tenant:${tenantId}:conversation:${conversationId}`,
          event: 'conversation.message',
        },
      ]),
    );
    expect(realtime.snapshot(tenantId, conversationId, '2026-08-21T12:00:00.000Z').onlineCount).toBe(
      1,
    );
  });

  it('drops presence after the last connection leaves', () => {
    const realtime = new ConversationsRealtimeService();
    realtime.connect({
      connectionId: 'socket-1',
      userId: 'agent-1',
      tenantId,
      conversationId,
      participantRole: 'TENANT_AGENT',
      nowIso: '2026-08-21T12:00:00.000Z',
    });

    realtime.disconnect('socket-1', '2026-08-21T12:00:02.000Z');
    expect(realtime.snapshot(tenantId, conversationId, '2026-08-21T12:00:02.000Z').onlineCount).toBe(
      0,
    );
  });
});
