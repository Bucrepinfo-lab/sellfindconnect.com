import type { Request } from 'express';
import type { TenantSessionDecision } from './tenant-session.guard';

export type TenantScopedRequest = Request & {
  tenantId?: string;
  authSession?: TenantSessionDecision;
};
