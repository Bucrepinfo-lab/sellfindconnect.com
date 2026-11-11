import { describe, expect, it } from 'vitest';

import {
  enhancePhotoPixels,
  measurePhotoLevels,
  photoScreenMessage,
  screenPhoto,
  targetPhotoSize,
} from './photo-filters';

const good = { fileName: 'sukuma-harvest.jpg', mimeType: 'image/jpeg', fileSizeBytes: 900_000, width: 1200, height: 900 };

describe('screenPhoto', () => {
  it('passes a normal produce photo', () => {
    expect(screenPhoto({ ...good, caption: 'Fresh sukuma wiki from our shamba' })).toEqual({
      allowed: true,
      reasons: [],
    });
    expect(screenPhoto({ fileName: 'Fresh Stall.JPG', mimeType: 'IMAGE/JPEG', fileSizeBytes: 10 }).allowed).toBe(true);
  });

  it('refuses mismatched or risky file names', () => {
    expect(screenPhoto({ ...good, fileName: 'photo.png' }).reasons).toContain('EXTENSION_MISMATCH');
    expect(screenPhoto({ ...good, fileName: 'photo.exe.jpg' }).reasons).toContain('UNSAFE_FILE_NAME');
    expect(screenPhoto({ ...good, fileName: '../photo.jpg' }).reasons).toContain('UNSAFE_FILE_NAME');
  });

  it('refuses tiny photos and thin strips, only when the size is known', () => {
    expect(screenPhoto({ ...good, width: 320, height: 240 }).reasons).toEqual(['IMAGE_TOO_SMALL']);
    expect(screenPhoto({ ...good, width: 2400, height: 500 }).reasons).toEqual(['IMAGE_SHAPE_TOO_NARROW']);
    expect(screenPhoto({ ...good, width: undefined, height: undefined }).allowed).toBe(true);
    expect(screenPhoto({ ...good, width: 200, height: 200 }, [], { logo: true }).allowed).toBe(true);
    expect(screenPhoto({ ...good, width: 80, height: 80 }, [], { logo: true }).allowed).toBe(false);
  });

  it('refuses repeats and blocked words', () => {
    expect(screenPhoto(good, [{ fileName: 'Sukuma-Harvest.jpg', fileSizeBytes: 900_000 }]).reasons).toEqual([
      'DUPLICATE_PHOTO',
    ]);
    expect(screenPhoto({ ...good, caption: 'ammunition for sale' }).reasons).toEqual(['UNSAFE_PHOTO_TEXT']);
    expect(screenPhoto({ ...good, fileName: 'ammunition.jpg' }).reasons).toEqual(['UNSAFE_PHOTO_TEXT']);
  });

  it('explains every refusal in plain words', () => {
    expect(photoScreenMessage('IMAGE_TOO_SMALL')).toMatch(/too small/);
    expect(photoScreenMessage('UNSUPPORTED_MEDIA_TYPE')).toMatch(/JPG/);
    expect(photoScreenMessage('SOMETHING_NEW')).toMatch(/Choose another/);
  });
});

describe('photo look', () => {
  it('scales down large photos and never scales up', () => {
    expect(targetPhotoSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(targetPhotoSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(targetPhotoSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('stretches a flat, dull photo within the allowed gain', () => {
    // Greys from 60 to 180: a hazy phone photo.
    const pixels: number[] = [];
    for (let value = 60; value <= 180; value += 1) pixels.push(value, value, value, 255);
    const levels = measurePhotoLevels(pixels);
    expect(levels.high - levels.low).toBeGreaterThanOrEqual(Math.floor(255 / 1.25));

    const before = [...pixels];
    enhancePhotoPixels(pixels, levels);
    expect(pixels[0]).toBeLessThan(before[0]!);
    expect(pixels[pixels.length - 4]).toBeGreaterThan(before[before.length - 4]!);
    expect(pixels[3]).toBe(255);
  });

  it('leaves a full-range photo almost unchanged and lifts colour slightly', () => {
    const pixels = [0, 0, 0, 255, 255, 255, 255, 255, 200, 100, 50, 128];
    const levels = measurePhotoLevels(pixels);
    expect(levels).toEqual({ low: 0, high: 255 });
    enhancePhotoPixels(pixels, levels);
    expect(pixels.slice(0, 8)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
    expect(pixels[8]).toBeGreaterThan(200);
    expect(pixels[10]).toBeLessThan(50);
    expect(pixels[11]).toBe(128);
  });
});
