'use client';

import { useSyncExternalStore } from 'react';

import { globalAccessRoles, regionalAccessRoles } from '@telpen/domain';

import { ROLE_STORAGE_KEY, SESSION_TOKEN_STORAGE_KEY, TENANT_ID_STORAGE_KEY } from './public-api';

/** The signed-in session as the browser holds it. Server routes still enforce every permission. */
export type StoredSession = { token: string; tenantId: string; role: string };

const SESSION_EVENT = 'sfc-session-change';
const staffRoles = new Set<string>([...globalAccessRoles, ...regionalAccessRoles]);

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(SESSION_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SESSION_EVENT, onChange);
  };
}

function snapshot(): string {
  try {
    return [
      window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) ?? '',
      window.localStorage.getItem(TENANT_ID_STORAGE_KEY) ?? '',
      window.localStorage.getItem(ROLE_STORAGE_KEY) ?? '',
    ].join('\n');
  } catch {
    return '';
  }
}

function serverSnapshot(): string {
  return '';
}

export function useStoredSession(): StoredSession | null {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [token = '', tenantId = '', role = ''] = raw.split('\n');
  return token && tenantId ? { token, tenantId, role } : null;
}

export function isStaffRole(role: string | undefined): boolean {
  return Boolean(role && staffRoles.has(role));
}

export function saveSession(session: StoredSession) {
  try {
    window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, session.token);
    window.localStorage.setItem(TENANT_ID_STORAGE_KEY, session.tenantId);
    window.localStorage.setItem(ROLE_STORAGE_KEY, session.role);
  } catch {
    // Storage unavailable (private mode): the session lasts for this page only.
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(TENANT_ID_STORAGE_KEY);
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
  } catch {
    // nothing stored
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}
