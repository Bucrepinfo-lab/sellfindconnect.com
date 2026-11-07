import type { AccessScopeLevel } from './access-control';

const allScopes: AccessScopeLevel[] = ['GLOBAL', 'REGIONAL', 'CONTINENT', 'COUNTRY', 'TENANT'];

/**
 * Report scopes a staff role may pick in the analytics console (least privilege:
 * each role sees only its own reach; global staff keep the full view). The API
 * enforces the same limit through `requirePlatformAccess`; this keeps the picker
 * from offering scopes that would only be refused.
 */
export function reportScopeLevelsForRole(role: string | undefined): AccessScopeLevel[] {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'GLOBAL_OPERATIONS_ADMIN':
    case 'GLOBAL_FINANCE_ADMIN':
    case 'GLOBAL_ANALYTICS_VIEWER':
    case 'GLOBAL_MODERATOR_LEAD':
      return [...allScopes];
    case 'REGIONAL_ADMIN':
      return ['REGIONAL', 'CONTINENT', 'COUNTRY', 'TENANT'];
    case 'CONTINENTAL_ADMIN':
      return ['CONTINENT', 'COUNTRY', 'TENANT'];
    case 'COUNTRY_ADMIN':
    case 'COUNTRY_FINANCE_ADMIN':
    case 'COUNTRY_MODERATOR':
    case 'COUNTRY_SUPPORT_AGENT':
    case 'COUNTRY_SALES_ACCOUNT_MANAGER':
      return ['COUNTRY', 'TENANT'];
    default:
      return [];
  }
}
