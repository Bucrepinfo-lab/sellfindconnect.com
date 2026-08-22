'use client';

import { useSyncExternalStore } from 'react';

import { parseHomeWorkspaceQuery, type HomeWorkspaceLanding } from '@telpen/domain';

function subscribeToSearch(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  return () => window.removeEventListener('popstate', onStoreChange);
}

function getSearchSnapshot() {
  return window.location.search;
}

function getSearchServerSnapshot() {
  return '';
}

export function useHomeWorkspaceLanding(): HomeWorkspaceLanding {
  const search = useSyncExternalStore(
    subscribeToSearch,
    getSearchSnapshot,
    getSearchServerSnapshot,
  );
  return parseHomeWorkspaceQuery(new URLSearchParams(search));
}
