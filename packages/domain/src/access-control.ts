import { countries, getCountry } from './geography';

export const globalAccessRoles = [
  'SUPER_ADMIN',
  'GLOBAL_OPERATIONS_ADMIN',
  'GLOBAL_FINANCE_ADMIN',
  'GLOBAL_ANALYTICS_VIEWER',
  'GLOBAL_MODERATOR_LEAD',
] as const;

export const regionalAccessRoles = [
  'REGIONAL_ADMIN',
  'CONTINENTAL_ADMIN',
  'COUNTRY_ADMIN',
  'COUNTRY_MODERATOR',
  'COUNTRY_SUPPORT_AGENT',
  'COUNTRY_SALES_ACCOUNT_MANAGER',
] as const;

export const tenantAccessRoles = [
  'OWNER',
  'ADMIN',
  'EDITOR',
  'SALES_CHAT_AGENT',
  'BILLING_MANAGER',
  'ANALYTICS_VIEWER',
  'READ_ONLY_VIEWER',
] as const;

export type TenantAccessRole = (typeof tenantAccessRoles)[number];

export const accessRoles = [
  ...globalAccessRoles,
  ...regionalAccessRoles,
  ...tenantAccessRoles,
] as const;

export type AccessRole = (typeof accessRoles)[number];

export const accessScopeLevels = ['GLOBAL', 'REGIONAL', 'CONTINENT', 'COUNTRY', 'TENANT'] as const;

export type AccessScopeLevel = (typeof accessScopeLevels)[number];

export const accessPermissions = [
  'MANAGE_PLATFORM',
  'MANAGE_ACCESS',
  'VIEW_ANALYTICS',
  'MANAGE_FINANCE',
  'MODERATE_CONTENT',
  'MANAGE_COUNTRY',
  'MANAGE_TENANT',
  'EDIT_PROFILE',
  'MANAGE_LISTINGS',
  'MANAGE_LEADS',
  'CHAT_WITH_LEADS',
  'VIEW_BILLING',
  'VIEW_TENANT',
] as const;

export type AccessPermission = (typeof accessPermissions)[number];

export type OperationalRegion = {
  code: string;
  name: string;
  continentCodes: string[];
  countryCodes: string[];
};

export type AccessSubject = {
  userId: string;
  role: AccessRole;
  mfaVerified: boolean;
  scope: {
    level: AccessScopeLevel;
    regionCodes?: string[];
    continentCodes?: string[];
    countryCodes?: string[];
    tenantIds?: string[];
  };
};

export type AccessResourceScope = {
  tenantId?: string;
  countryCode?: string;
  continentCode?: string;
  regionCode?: string;
};

export type AccessDecision =
  | {
      allowed: true;
      permission: AccessPermission;
      role: AccessRole;
      scopeLevel: AccessScopeLevel;
      reason: 'ACCESS_GRANTED';
    }
  | {
      allowed: false;
      permission: AccessPermission;
      role: AccessRole;
      scopeLevel: AccessScopeLevel;
      reason:
        | 'ROLE_PERMISSION_DENIED'
        | 'MFA_REQUIRED'
        | 'SCOPE_MISMATCH'
        | 'UNKNOWN_COUNTRY'
        | 'UNKNOWN_REGION';
    };

export const operationalRegions: OperationalRegion[] = [
  {
    code: 'EMEA',
    name: 'Europe, Middle East and Africa',
    continentCodes: ['AF', 'EU'],
    countryCodes: countries.filter((country) => ['AF', 'EU'].includes(country.continentCode)).map((country) => country.code),
  },
  {
    code: 'AMERICAS',
    name: 'Americas',
    continentCodes: ['NA', 'SA'],
    countryCodes: countries.filter((country) => ['NA', 'SA'].includes(country.continentCode)).map((country) => country.code),
  },
  {
    code: 'APAC',
    name: 'Asia Pacific',
    continentCodes: ['AS', 'OC'],
    countryCodes: countries.filter((country) => ['AS', 'OC'].includes(country.continentCode)).map((country) => country.code),
  },
];

const permissionsByRole: Record<AccessRole, AccessPermission[]> = {
  SUPER_ADMIN: [...accessPermissions],
  GLOBAL_OPERATIONS_ADMIN: [
    'MANAGE_PLATFORM',
    'MANAGE_ACCESS',
    'VIEW_ANALYTICS',
    'MODERATE_CONTENT',
    'MANAGE_COUNTRY',
    'MANAGE_TENANT',
  ],
  GLOBAL_FINANCE_ADMIN: ['VIEW_ANALYTICS', 'MANAGE_FINANCE', 'VIEW_BILLING'],
  GLOBAL_ANALYTICS_VIEWER: ['VIEW_ANALYTICS'],
  GLOBAL_MODERATOR_LEAD: ['VIEW_ANALYTICS', 'MODERATE_CONTENT'],
  REGIONAL_ADMIN: ['VIEW_ANALYTICS', 'MODERATE_CONTENT', 'MANAGE_COUNTRY', 'MANAGE_TENANT'],
  CONTINENTAL_ADMIN: ['VIEW_ANALYTICS', 'MODERATE_CONTENT', 'MANAGE_COUNTRY', 'MANAGE_TENANT'],
  COUNTRY_ADMIN: ['VIEW_ANALYTICS', 'MODERATE_CONTENT', 'MANAGE_COUNTRY', 'MANAGE_TENANT'],
  COUNTRY_MODERATOR: ['VIEW_ANALYTICS', 'MODERATE_CONTENT'],
  COUNTRY_SUPPORT_AGENT: ['VIEW_ANALYTICS', 'VIEW_TENANT', 'MANAGE_LEADS', 'CHAT_WITH_LEADS'],
  COUNTRY_SALES_ACCOUNT_MANAGER: ['VIEW_ANALYTICS', 'VIEW_TENANT', 'MANAGE_LEADS', 'CHAT_WITH_LEADS'],
  OWNER: [
    'MANAGE_ACCESS',
    'VIEW_ANALYTICS',
    'MANAGE_TENANT',
    'EDIT_PROFILE',
    'MANAGE_LISTINGS',
    'MANAGE_LEADS',
    'CHAT_WITH_LEADS',
    'VIEW_BILLING',
    'VIEW_TENANT',
  ],
  ADMIN: [
    'VIEW_ANALYTICS',
    'MANAGE_TENANT',
    'EDIT_PROFILE',
    'MANAGE_LISTINGS',
    'MANAGE_LEADS',
    'CHAT_WITH_LEADS',
    'VIEW_BILLING',
    'VIEW_TENANT',
  ],
  EDITOR: ['EDIT_PROFILE', 'MANAGE_LISTINGS', 'VIEW_TENANT'],
  SALES_CHAT_AGENT: ['MANAGE_LEADS', 'CHAT_WITH_LEADS', 'VIEW_TENANT'],
  BILLING_MANAGER: ['VIEW_BILLING', 'VIEW_TENANT'],
  ANALYTICS_VIEWER: ['VIEW_ANALYTICS', 'VIEW_TENANT'],
  READ_ONLY_VIEWER: ['VIEW_TENANT'],
};

export function evaluateAccess(input: {
  subject: AccessSubject;
  permission: AccessPermission;
  resource: AccessResourceScope;
}): AccessDecision {
  const resource = normalizeResourceScope(input.resource);
  const subject = normalizeSubject(input.subject);

  if (input.resource.countryCode && !resource.countryCode) {
    return denied(subject, input.permission, 'UNKNOWN_COUNTRY');
  }

  if (input.resource.regionCode && !operationalRegions.some((region) => region.code === input.resource.regionCode)) {
    return denied(subject, input.permission, 'UNKNOWN_REGION');
  }

  if (!permissionsByRole[subject.role].includes(input.permission)) {
    return denied(subject, input.permission, 'ROLE_PERMISSION_DENIED');
  }

  if (requiresMfa(subject.role) && !subject.mfaVerified) {
    return denied(subject, input.permission, 'MFA_REQUIRED');
  }

  if (!scopeMatches(subject, resource)) {
    return denied(subject, input.permission, 'SCOPE_MISMATCH');
  }

  return {
    allowed: true,
    permission: input.permission,
    role: subject.role,
    scopeLevel: subject.scope.level,
    reason: 'ACCESS_GRANTED',
  };
}

export function roleHasPermission(role: AccessRole, permission: AccessPermission): boolean {
  return permissionsByRole[role].includes(permission);
}

export function requiresMfa(role: AccessRole): boolean {
  return (
    globalAccessRoles.includes(role as (typeof globalAccessRoles)[number]) ||
    role === 'REGIONAL_ADMIN' ||
    role === 'CONTINENTAL_ADMIN' ||
    role === 'COUNTRY_ADMIN' ||
    role === 'COUNTRY_MODERATOR' ||
    role === 'OWNER' ||
    role === 'ADMIN' ||
    role === 'BILLING_MANAGER'
  );
}

export function normalizeResourceScope(resource: AccessResourceScope): AccessResourceScope {
  const country = resource.countryCode ? getCountry(resource.countryCode) : undefined;
  const continentCode = resource.continentCode ?? country?.continentCode;
  const regionCode =
    resource.regionCode ??
    operationalRegions.find(
      (region) =>
        (country && region.countryCodes.includes(country.code)) ||
        (continentCode && region.continentCodes.includes(continentCode)),
    )?.code;

  return {
    ...resource,
    countryCode: country?.code ?? resource.countryCode,
    continentCode,
    regionCode,
  };
}

export function getRolePermissions(role: AccessRole): AccessPermission[] {
  return permissionsByRole[role];
}

function scopeMatches(subject: AccessSubject, resource: AccessResourceScope): boolean {
  if (subject.scope.level === 'GLOBAL') return true;
  if (subject.scope.level === 'REGIONAL') {
    return Boolean(resource.regionCode && subject.scope.regionCodes?.includes(resource.regionCode));
  }
  if (subject.scope.level === 'CONTINENT') {
    return Boolean(resource.continentCode && subject.scope.continentCodes?.includes(resource.continentCode));
  }
  if (subject.scope.level === 'COUNTRY') {
    return Boolean(resource.countryCode && subject.scope.countryCodes?.includes(resource.countryCode));
  }
  return Boolean(resource.tenantId && subject.scope.tenantIds?.includes(resource.tenantId));
}

function normalizeSubject(subject: AccessSubject): AccessSubject {
  return {
    ...subject,
    scope: {
      ...subject.scope,
      regionCodes: subject.scope.regionCodes?.map((code) => code.toUpperCase()),
      continentCodes: subject.scope.continentCodes?.map((code) => code.toUpperCase()),
      countryCodes: subject.scope.countryCodes?.map((code) => code.toUpperCase()),
    },
  };
}

function denied(
  subject: AccessSubject,
  permission: AccessPermission,
  reason: Exclude<AccessDecision['reason'], 'ACCESS_GRANTED'>,
): AccessDecision {
  return {
    allowed: false,
    permission,
    role: subject.role,
    scopeLevel: subject.scope.level,
    reason,
  };
}
