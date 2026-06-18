import type { Request } from 'express';

export type TenantScopedRequest = Request & {
  tenantId?: string;
};
