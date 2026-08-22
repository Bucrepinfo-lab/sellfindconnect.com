import { industryCategories, supplyChainRoles, type SupplyChainRole } from './industries';
import { FIND_QUICK_INDUSTRIES } from './onboarding';
import { sanitizeText } from './sanitization';

export const HOME_WORKSPACE_VIEWS = ['discover', 'adverts'] as const;
export type HomeWorkspaceView = (typeof HOME_WORKSPACE_VIEWS)[number];

export const HOME_WORKSPACE_PANEL_IDS = {
  discover: 'source-finder',
  adverts: 'advertiser-setup',
} as const;

const catalogIndustryCodes = new Set(industryCategories.map((item) => item.code));
const onboardingIndustryCatalogCodes = new Map(
  FIND_QUICK_INDUSTRIES.map((item) => [item.code.toUpperCase(), item.catalogCode]),
);

export type HomeWorkspaceLanding = {
  view: HomeWorkspaceView | undefined;
  panelId: string | undefined;
  query: string | undefined;
  industryCode: string | undefined;
  role: SupplyChainRole | undefined;
  onboarding: boolean;
};

function firstQueryValue(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  if (input instanceof URLSearchParams) {
    const value = input.get(key);
    return value == null ? undefined : value;
  }

  const raw = input[key];
  if (Array.isArray(raw)) {
    return raw[0];
  }

  return raw;
}

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function resolveCatalogIndustryCode(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = sanitizeText(value, { maxLength: 64 })
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (catalogIndustryCodes.has(normalized)) {
    return normalized;
  }

  const mapped = onboardingIndustryCatalogCodes.get(normalized);
  if (mapped && catalogIndustryCodes.has(mapped)) {
    return mapped;
  }

  return undefined;
}

export function safeInternalRedirect(path: string | undefined, fallback: string): string {
  if (
    path &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\')
  ) {
    return path;
  }

  return fallback;
}

export function parseHomeWorkspaceQuery(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): HomeWorkspaceLanding {
  const rawView = sanitizeText(firstQueryValue(input, 'view') ?? '', {
    maxLength: 32,
  }).toLowerCase();
  const view = HOME_WORKSPACE_VIEWS.includes(rawView as HomeWorkspaceView)
    ? (rawView as HomeWorkspaceView)
    : undefined;

  const queryRaw = firstQueryValue(input, 'q') ?? firstQueryValue(input, 'query');
  const query =
    queryRaw == null || queryRaw.trim() === ''
      ? undefined
      : sanitizeText(queryRaw, { maxLength: 200 });

  const rawRole = sanitizeText(firstQueryValue(input, 'role') ?? '', {
    maxLength: 32,
  }).toUpperCase();
  const role = supplyChainRoles.includes(rawRole as SupplyChainRole)
    ? (rawRole as SupplyChainRole)
    : undefined;

  return {
    view,
    panelId: view ? HOME_WORKSPACE_PANEL_IDS[view] : undefined,
    query: query || undefined,
    industryCode: resolveCatalogIndustryCode(
      firstQueryValue(input, 'industry') ?? firstQueryValue(input, 'industryCode'),
    ),
    role,
    onboarding: isTruthyFlag(firstQueryValue(input, 'onboarding')),
  };
}
