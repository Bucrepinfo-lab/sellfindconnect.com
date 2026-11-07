'use client';

import { useEffect } from 'react';

import { detectAndroidApp } from '../lib/app-context';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Record the Android (TWA) launch on the first page, before a full navigation drops the referrer.
    detectAndroidApp();
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The site works without it; offline support is a bonus.
    });
  }, []);
  return null;
}
