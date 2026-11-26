'use client';

/**
 * A photo chosen before having an account (owner 26/11/26): the visitor writes
 * the advert and picks a photo first. The photo waits on this phone
 * (IndexedDB) until the account exists; then BusinessManager shows it for one
 * tap to use as the business picture. Nothing is uploaded before sign-up.
 * Every access is guarded: private tabs may block storage.
 */
const DB = 'sfc-pending';
const STORE = 'photo';
const KEY = 'advert-photo';
const MAX_BYTES = 40 * 1024 * 1024;

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE);
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        try {
          const request = work(open.result.transaction(STORE, mode).objectStore(STORE));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/** Why this file cannot be kept; null when it can. */
export function pendingPhotoProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return 'Choose a JPG, PNG or WebP photo.';
  if (file.size > MAX_BYTES) return 'That photo is too big. Choose one under 40 MB.';
  return null;
}

export async function savePendingPhoto(file: File): Promise<boolean> {
  return (await run('readwrite', (store) => store.put(file, KEY))) !== null;
}

export async function readPendingPhoto(): Promise<File | null> {
  const value = await run<unknown>('readonly', (store) => store.get(KEY));
  if (value instanceof File) return value;
  return value instanceof Blob ? new File([value], 'photo.jpg', { type: value.type || 'image/jpeg' }) : null;
}

export async function clearPendingPhoto(): Promise<void> {
  await run('readwrite', (store) => store.delete(KEY));
}
