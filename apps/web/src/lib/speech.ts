'use client';

import { useSyncExternalStore } from 'react';

import { isAppLanguage, speechLanguageFor, speechLanguages, type AppLanguage } from '@telpen/domain';

/**
 * The phone's own speech recognition (Chrome on Android, which the Play app
 * uses). Words are written on the phone; SellFindConnect keeps no recording.
 */
export type Recogniser = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

export function recogniser(): (new () => Recogniser) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recogniser; webkitSpeechRecognition?: new () => Recogniser };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANGUAGE_KEY = 'sfc.language';
const SPEECH_KEY = 'sfc.speechLanguage';
export const LANGUAGE_EVENT = 'sfc-language-change';

/** The language the person chose on this phone (English until they choose). */
export function storedLanguage(): AppLanguage {
  try {
    const value = window.localStorage.getItem(LANGUAGE_KEY);
    return isAppLanguage(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguage(language: AppLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    window.localStorage.setItem(SPEECH_KEY, speechLanguageFor(language));
  } catch {
    // Private mode: the choice lasts for this page.
  }
  document.documentElement.lang = language;
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}

export function storedSpeechLanguage(): string {
  try {
    const value = window.localStorage.getItem(SPEECH_KEY);
    if (value && speechLanguages.some((l) => l.id === value)) return value;
  } catch {
    // fall through
  }
  return speechLanguageFor(storedLanguage());
}

/** For useSyncExternalStore: re-read when the language is changed here or in another tab. */
export function subscribeLanguage(onChange: () => void): () => void {
  window.addEventListener(LANGUAGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** The chosen language, live. English on the server and until the person chooses. */
export function useLanguage(): AppLanguage {
  return useSyncExternalStore(subscribeLanguage, storedLanguage, () => 'en' as AppLanguage);
}

/** The language the person speaks in, live. */
export function useSpeechLanguage(): string {
  return useSyncExternalStore(subscribeLanguage, storedSpeechLanguage, () => 'en-KE');
}

export function saveSpeechLanguage(id: string): void {
  try {
    window.localStorage.setItem(SPEECH_KEY, id);
  } catch {
    // Private mode.
  }
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}
