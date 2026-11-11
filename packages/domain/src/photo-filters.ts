import { evaluateSafetyText } from './safety';

/**
 * Photo filters for every place a picture is uploaded (profile, advert,
 * chat), owner request 11/11/26. Two parts:
 *  1. screening: refuse photos that are the wrong type, too small, an odd
 *     strip shape, a repeat, or carry blocked words, before review;
 *  2. look: a gentle, honest tidy-up (size, levels, colour) so phone photos
 *     of goods and farm produce are clear. It never adds or removes content.
 * Pure functions: the same rules run in the browser preview and on the API.
 */

export const photoFilterPolicy = {
  /** Shortest side, in pixels, that still looks sharp on a phone card. */
  minShortSidePx: 400,
  /** Logos are shown small, so a smaller file is still sharp. */
  minLogoShortSidePx: 120,
  /** Longest side divided by shortest; beyond this it is a strip or banner. */
  maxAspectRatio: 3,
  /** Photos are scaled down to this longest side before upload. */
  maxLongSidePx: 1600,
  /** Share of darkest and brightest pixels ignored when stretching levels. */
  levelsClip: 0.005,
  /** The most that levels may brighten or deepen a photo. */
  maxLevelsGain: 1.25,
  saturationBoost: 1.08,
} as const;

export const photoScreenReasons = [
  'EXTENSION_MISMATCH',
  'UNSAFE_FILE_NAME',
  'IMAGE_TOO_SMALL',
  'IMAGE_SHAPE_TOO_NARROW',
  'DUPLICATE_PHOTO',
  'UNSAFE_PHOTO_TEXT',
] as const;

export type PhotoScreenReason = (typeof photoScreenReasons)[number];

export type PhotoScreenInput = {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  caption?: string;
  altText?: string;
};

export type PhotoScreenDecision = { allowed: boolean; reasons: PhotoScreenReason[] };

const extensionsByMimeType: Record<string, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/heic': ['heic', 'heif'],
};

const riskyExtensions = new Set([
  'exe', 'js', 'mjs', 'html', 'htm', 'svg', 'php', 'bat', 'cmd', 'sh', 'apk', 'msi', 'scr', 'jar', 'vbs', 'ps1',
]);

function fileNameParts(fileName: string): string[] {
  return fileName.trim().toLowerCase().split('.').filter(Boolean);
}

/** Screen one image. Dimensions are checked only when they are known. */
export function screenPhoto(
  input: PhotoScreenInput,
  existing: ReadonlyArray<Pick<PhotoScreenInput, 'fileName' | 'fileSizeBytes'>> = [],
  options: { logo?: boolean } = {},
): PhotoScreenDecision {
  const reasons: PhotoScreenReason[] = [];
  const mimeType = input.mimeType.trim().toLowerCase();
  const parts = fileNameParts(input.fileName);
  const extension = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const allowedExtensions = extensionsByMimeType[mimeType];

  if (allowedExtensions && extension && !allowedExtensions.includes(extension)) {
    reasons.push('EXTENSION_MISMATCH');
  }
  if (/[\\/<>:"|?*]/.test(input.fileName) || parts.slice(1).some((part) => riskyExtensions.has(part))) {
    reasons.push('UNSAFE_FILE_NAME');
  }

  const { width, height } = input;
  if (width !== undefined && height !== undefined && width > 0 && height > 0) {
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    const minShortSide = options.logo
      ? photoFilterPolicy.minLogoShortSidePx
      : photoFilterPolicy.minShortSidePx;
    if (shortSide < minShortSide) {
      reasons.push('IMAGE_TOO_SMALL');
    }
    if (longSide / shortSide > photoFilterPolicy.maxAspectRatio) {
      reasons.push('IMAGE_SHAPE_TOO_NARROW');
    }
  }

  const name = input.fileName.trim().toLowerCase();
  if (
    existing.some(
      (item) => item.fileSizeBytes === input.fileSizeBytes && item.fileName.trim().toLowerCase() === name,
    )
  ) {
    reasons.push('DUPLICATE_PHOTO');
  }

  const words = [input.fileName.replace(/[._-]+/g, ' '), input.caption ?? '', input.altText ?? ''].join(' ');
  if (!evaluateSafetyText(words).allowed) {
    reasons.push('UNSAFE_PHOTO_TEXT');
  }

  return { allowed: reasons.length === 0, reasons };
}

const photoScreenMessages: Record<PhotoScreenReason, string> = {
  EXTENSION_MISMATCH: 'The file name does not match the photo type. Save it again as JPG or PNG.',
  UNSAFE_FILE_NAME: 'Rename the file with plain letters and numbers, then try again.',
  IMAGE_TOO_SMALL: 'This picture is too small to look clear. Use a larger one.',
  IMAGE_SHAPE_TOO_NARROW: 'This photo is a long thin strip. Use a normal photo shape.',
  DUPLICATE_PHOTO: 'You have already added this photo.',
  UNSAFE_PHOTO_TEXT: 'The file name or caption has words we never allow. Change them and try again.',
};

/** Plain words for a refusal; also understands the older media reason codes. */
export function photoScreenMessage(reason: string): string {
  if ((photoScreenReasons as readonly string[]).includes(reason)) {
    return photoScreenMessages[reason as PhotoScreenReason];
  }
  if (reason === 'UNSUPPORTED_MEDIA_TYPE') return 'Use a JPG, PNG or WebP photo.';
  if (reason === 'IMAGE_TOO_LARGE') return 'This photo is too big. Use one under 10 MB.';
  if (reason === 'INVALID_FILE_SIZE') return 'This file looks empty. Choose another photo.';
  return 'This photo cannot be used. Choose another one.';
}

/** Size to scale a photo to before upload; never scales up. */
export function targetPhotoSize(
  width: number,
  height: number,
  maxLongSide: number = photoFilterPolicy.maxLongSidePx,
): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (!(longSide > 0) || longSide <= maxLongSide) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxLongSide / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type PhotoLevels = { low: number; high: number };

/**
 * Find the dark and bright points of a photo (RGBA bytes), ignoring a sliver
 * at each end, and limit the stretch so the picture stays true to life.
 */
export function measurePhotoLevels(pixels: ArrayLike<number>): PhotoLevels {
  const histogram = new Array<number>(256).fill(0);
  let count = 0;
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const luma = Math.round(
      0.299 * (pixels[index] ?? 0) + 0.587 * (pixels[index + 1] ?? 0) + 0.114 * (pixels[index + 2] ?? 0),
    );
    histogram[Math.min(255, Math.max(0, luma))] = (histogram[Math.min(255, Math.max(0, luma))] ?? 0) + 1;
    count += 1;
  }
  if (count === 0) return { low: 0, high: 255 };

  const clip = count * photoFilterPolicy.levelsClip;
  let low = 0;
  let seen = 0;
  while (low < 255 && seen + (histogram[low] ?? 0) <= clip) {
    seen += histogram[low] ?? 0;
    low += 1;
  }
  let high = 255;
  seen = 0;
  while (high > 0 && seen + (histogram[high] ?? 0) <= clip) {
    seen += histogram[high] ?? 0;
    high -= 1;
  }
  if (high <= low) return { low: 0, high: 255 };

  // Never stretch by more than the allowed gain, keeping the mid-point fixed.
  const minSpan = 255 / photoFilterPolicy.maxLevelsGain;
  if (high - low < minSpan) {
    const middle = (high + low) / 2;
    low = Math.max(0, Math.round(middle - minSpan / 2));
    high = Math.min(255, Math.round(low + minSpan));
    low = Math.max(0, Math.round(high - minSpan));
  }
  return { low, high };
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

/**
 * Tidy a photo in place (RGBA bytes): stretch levels, then lift colour a
 * little. Transparency is untouched. Returns the levels that were applied.
 */
export function enhancePhotoPixels(
  pixels: { length: number; [index: number]: number },
  levels: PhotoLevels = measurePhotoLevels(pixels),
): PhotoLevels {
  const span = Math.max(1, levels.high - levels.low);
  const gain = 255 / span;
  const saturation = photoFilterPolicy.saturationBoost;
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const red = ((pixels[index] ?? 0) - levels.low) * gain;
    const green = ((pixels[index + 1] ?? 0) - levels.low) * gain;
    const blue = ((pixels[index + 2] ?? 0) - levels.low) * gain;
    const grey = 0.299 * red + 0.587 * green + 0.114 * blue;
    pixels[index] = clampByte(grey + (red - grey) * saturation);
    pixels[index + 1] = clampByte(grey + (green - grey) * saturation);
    pixels[index + 2] = clampByte(grey + (blue - grey) * saturation);
  }
  return levels;
}
