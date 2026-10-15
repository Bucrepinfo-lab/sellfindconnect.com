import { NextResponse } from 'next/server';

/**
 * Digital Asset Links for the Android app (Trusted Web Activity).
 * Served at /.well-known/assetlinks.json via a rewrite in next.config.mjs.
 *
 * ANDROID_CERT_FINGERPRINTS: comma-separated SHA-256 fingerprints — the Play
 * App Signing key and the upload key (Play Console → Test and release →
 * App integrity). Keep both; add new ones, never replace.
 */
export const dynamic = 'force-dynamic';

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME?.trim() || 'com.sellfindconnect.app';
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => FINGERPRINT.test(value));

  const body =
    fingerprints.length === 0
      ? []
      : [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: PACKAGE_NAME,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ];

  return NextResponse.json(body, {
    headers: { 'cache-control': 'public, max-age=300' },
  });
}
