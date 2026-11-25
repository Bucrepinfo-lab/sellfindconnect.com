'use client';

import { applyPhotoLook, targetPhotoSize, type PhotoLook } from '@telpen/domain';

export type PreparedPhoto = {
  file: File;
  width: number;
  height: number;
  /** Object URL of the photo as it will be posted. Revoke when done. */
  previewUrl: string;
  improved: boolean;
  look: PhotoLook;
};

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall through to the <img> decoder.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Get a photo ready to post, on the device: turn it the right way up, scale
 * it down, and (when asked) tidy levels and colour. Nothing is uploaded here.
 */
export async function preparePhoto(
  file: File,
  /** `look` wins; `improve` (older callers) means Fresh, false means As taken. */
  options: { improve?: boolean; look?: PhotoLook; keepPng?: boolean },
): Promise<PreparedPhoto> {
  const look: PhotoLook = options.look ?? (options.improve === false ? 'asTaken' : 'fresh');
  const improve = look !== 'asTaken';
  let decoded: Awaited<ReturnType<typeof decode>>;
  try {
    decoded = await decode(file);
  } catch {
    throw new Error('This photo could not be opened. Use a JPG or PNG from your gallery.');
  }
  const size = targetPhotoSize(decoded.width, decoded.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d', { willReadFrequently: improve });
  if (!context) {
    decoded.close();
    throw new Error('This browser cannot prepare photos. Try another browser.');
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(decoded.source, 0, 0, size.width, size.height);
  decoded.close();

  if (improve) {
    const image = context.getImageData(0, 0, size.width, size.height);
    applyPhotoLook(image.data, look);
    context.putImageData(image, 0, 0);
  }

  const png = Boolean(options.keepPng) && file.type === 'image/png';
  const type = png ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
  if (!blob) throw new Error('This photo could not be prepared. Choose another one.');
  const base = (file.name.replace(/\.[^.]*$/, '') || 'photo').replace(/[^\w -]+/g, '-').slice(0, 100);
  const prepared = new File([blob], `${base}.${png ? 'png' : 'jpg'}`, { type });
  return {
    file: prepared,
    width: size.width,
    height: size.height,
    previewUrl: URL.createObjectURL(prepared),
    improved: improve,
    look,
  };
}
