import { industryCategories } from '@telpen/domain';

export function codeLabel(value: string): string {
  return value
    .split('_')
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

export function industryLabel(code: string): string {
  return industryCategories.find((item) => item.code === code)?.name ?? codeLabel(code);
}

export function advertStatusLabel(status: string): string {
  switch (status) {
    case 'LIVE':
      return 'Live';
    case 'RENEWAL_DUE':
      return 'Live – renew soon';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'PAUSED':
      return 'Unpublished';
    default:
      return codeLabel(status);
  }
}
