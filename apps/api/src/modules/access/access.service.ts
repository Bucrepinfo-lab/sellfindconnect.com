import { Injectable } from '@nestjs/common';
import {
  accessRoles,
  evaluateAccess,
  getRolePermissions,
  operationalRegions,
  requiresMfa,
  type AccessDecision,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { EvaluateAccessDto } from './dto/access.dto';

type AccessAuditRecord = {
  id: string;
  actorUserId: string;
  role: string;
  permission: string;
  allowed: boolean;
  reason: string;
  targetTenantId?: string;
  targetCountryCode?: string;
  createdAt: string;
};

@Injectable()
export class AccessService {
  private readonly audit = new Map<string, AccessAuditRecord>();

  getRoleMatrix() {
    return {
      roles: accessRoles.map((role) => ({
        role,
        permissions: getRolePermissions(role),
        mfaRequired: requiresMfa(role),
      })),
      operationalRegions,
    };
  }

  evaluate(input: EvaluateAccessDto): { decision: AccessDecision; audit: AccessAuditRecord } {
    const decision = evaluateAccess({
      subject: {
        userId: input.userId,
        role: input.role,
        mfaVerified: input.mfaVerified,
        scope: {
          level: input.scopeLevel,
          regionCodes: input.regionCodes,
          continentCodes: input.continentCodes,
          countryCodes: input.countryCodes,
          tenantIds: input.tenantIds,
        },
      },
      permission: input.permission,
      resource: {
        tenantId: input.targetTenantId,
        countryCode: input.targetCountryCode,
        continentCode: input.targetContinentCode,
        regionCode: input.targetRegionCode,
      },
    });
    const audit: AccessAuditRecord = {
      id: randomUUID(),
      actorUserId: input.userId,
      role: input.role,
      permission: input.permission,
      allowed: decision.allowed,
      reason: decision.reason,
      targetTenantId: input.targetTenantId,
      targetCountryCode: input.targetCountryCode,
      createdAt: new Date().toISOString(),
    };

    this.audit.set(audit.id, audit);
    return { decision, audit };
  }

  listAudit(): AccessAuditRecord[] {
    return Array.from(this.audit.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
