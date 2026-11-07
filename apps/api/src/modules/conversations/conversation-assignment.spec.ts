import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { InMemoryAuthRepository } from '../auth/in-memory-auth.repository';
import { ConversationsService } from './conversations.service';

const strongPassword = 'Strong-owner#2026';

async function setup() {
  const repository = new InMemoryAuthRepository();
  const auth = new AuthService(repository);
  const register = (email: string, tenantDisplayName: string) =>
    auth.registerTenantOwner({
      email,
      password: strongPassword,
      displayName: 'Owner',
      tenantDisplayName,
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      primaryRole: 'SUPPLIER',
      userType: 'ADVERTISER',
      acceptedTerms: true,
    });
  const ours = await register('owner@fresh.example', 'Nairobi Fresh Produce');
  const theirs = await register('owner@cold.example', 'Mombasa Cold Chain');
  const tenantId = ours.tenant.id;

  // A read-only teammate in our tenant (member, but no chat permission).
  repository.createTenantMembershipWithTerms({
    membership: {
      id: 'membership-viewer',
      userId: theirs.user.id,
      tenantId,
      role: 'READ_ONLY_VIEWER',
      createdAt: '2026-11-07T08:00:00.000Z',
    },
    termsAcceptance: { ...ours.termsAcceptance, userId: theirs.user.id },
  });

  const service = new ConversationsService(undefined, undefined, undefined, undefined, auth);
  const conversation = await service.createConversation(tenantId, {
    sourceRecordId: 'r1',
    query: 'fresh produce',
    inquiryType: 'RFQ',
    message: 'Please confirm weekly supply availability.',
    acceptedTerms: true,
  });
  return { auth, service, tenantId, conversation, ours, theirs };
}

describe('conversation assignment stays inside the tenant', () => {
  it('assigns to a member of the tenant whose role can chat', async () => {
    const { service, tenantId, conversation, ours } = await setup();

    const assigned = await service.assignConversation(tenantId, conversation.id, {
      assigneeUserId: ours.user.id,
      assigneeDisplayName: 'Owner',
    });

    expect(assigned.status).toBe('ASSIGNED');
  });

  it('rejects a user who is not a member of the tenant', async () => {
    const { service, conversation, ours, theirs } = await setup();
    await expect(
      service.assignConversation(ours.tenant.id, conversation.id, { assigneeUserId: 'someone-else' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      service.assignConversation(ours.tenant.id, conversation.id, { assigneeUserId: `${theirs.user.id}-x` }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects the owner of another tenant', async () => {
    const { auth, theirs, ours } = await setup();
    const service = new ConversationsService(undefined, undefined, undefined, undefined, auth);
    const conversation = await service.createConversation(theirs.tenant.id, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });

    await expect(
      service.assignConversation(theirs.tenant.id, conversation.id, { assigneeUserId: ours.user.id }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a member whose role cannot handle conversations', async () => {
    const { service, tenantId, conversation, theirs } = await setup();

    await expect(
      service.assignConversation(tenantId, conversation.id, { assigneeUserId: theirs.user.id }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('applies the same check when a conversation is opened already assigned', async () => {
    const { service, tenantId } = await setup();

    await expect(
      service.createConversation(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'RFQ',
        message: 'Please confirm weekly supply availability.',
        acceptedTerms: true,
        assigneeUserId: 'outsider',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('looks up membership through the auth module', async () => {
    const { auth, ours, theirs } = await setup();

    expect(await auth.findTenantMembership(ours.tenant.id, ours.user.id)).toMatchObject({ role: 'OWNER' });
    expect(await auth.findTenantMembership(ours.tenant.id, theirs.user.id)).toMatchObject({
      role: 'READ_ONLY_VIEWER',
    });
    expect(await auth.findTenantMembership(theirs.tenant.id, ours.user.id)).toBeUndefined();
  });
});
