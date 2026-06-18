const dangerousFormatCharacters = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const disallowedControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const horizontalWhitespace = /[^\S\n]+/g;
const repeatedBlankLines = /\n{3,}/g;
declare const URL: {
  new (input: string): {
    password: string;
    protocol: string;
    toString(): string;
    username: string;
  };
};

const defaultSensitiveFieldNames = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'sessiontoken',
  'token',
  'secret',
  'clientsecret',
  'apikey',
  'code',
]);

export type SanitizeTextOptions = {
  preserveNewlines?: boolean;
  maxLength?: number;
};

export type SanitizeInputOptions = {
  maxDepth?: number;
  maxArrayItems?: number;
  sensitiveFieldNames?: Iterable<string>;
};

export function sanitizeText(value: string, options: SanitizeTextOptions = {}): string {
  const preserveNewlines = options.preserveNewlines ?? false;
  const maxLength = options.maxLength ?? 5000;
  const normalized = value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(dangerousFormatCharacters, '')
    .replace(disallowedControlCharacters, ' ');

  const whitespaceSafe = preserveNewlines
    ? normalized.replace(horizontalWhitespace, ' ').replace(repeatedBlankLines, '\n\n')
    : normalized.replace(/\s+/g, ' ');

  return whitespaceSafe.trim().slice(0, maxLength);
}

export function sanitizeEmailAddress(value: string): string {
  return sanitizeText(value, { maxLength: 320 }).toLowerCase();
}

export function sanitizeHttpUrl(value: string): string | null {
  const candidate = sanitizeText(value, { maxLength: 2048 });

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeInputFields<T>(value: T, options: SanitizeInputOptions = {}): T {
  const maxDepth = options.maxDepth ?? 8;
  const maxArrayItems = options.maxArrayItems ?? 100;
  const sensitiveFieldNames = new Set(
    Array.from(options.sensitiveFieldNames ?? defaultSensitiveFieldNames, (field) =>
      normalizeFieldName(field),
    ),
  );

  function sanitize(current: unknown, depth: number, fieldName?: string): unknown {
    if (typeof current === 'string') {
      if (fieldName && sensitiveFieldNames.has(normalizeFieldName(fieldName))) {
        return current;
      }

      return sanitizeText(current, { preserveNewlines: true });
    }

    if (!current || typeof current !== 'object') {
      return current;
    }

    if (depth >= maxDepth) {
      return Array.isArray(current) ? [] : {};
    }

    if (Array.isArray(current)) {
      return current.slice(0, maxArrayItems).map((item) => sanitize(item, depth + 1, fieldName));
    }

    return Object.fromEntries(
      Object.entries(current as Record<string, unknown>).map(([key, item]) => [
        sanitizeText(key, { maxLength: 120 }),
        sanitize(item, depth + 1, key),
      ]),
    );
  }

  return sanitize(value, 0) as T;
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
