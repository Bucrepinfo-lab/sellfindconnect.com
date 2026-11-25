'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { applyTheme, readThemeChoice, THEME_EVENT, type ThemeChoice } from '../lib/theme';

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

const CHOICES: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { id: 'system', label: 'Auto', Icon: Monitor },
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
];

/**
 * Light / Dark / Auto (owner 25/11/26: "a dark theme"). Auto follows the
 * phone's setting. The choice is kept on this phone only.
 */
export function ThemeToggle({ tone = 'band' }: { tone?: 'band' | 'page' }) {
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => 'system' as ThemeChoice);
  return (
    <div className={tone === 'page' ? 'theme-toggle theme-toggle--page' : 'theme-toggle'} role="radiogroup" aria-label="Colour theme">
      {CHOICES.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={choice === id}
          className={choice === id ? 'theme-toggle__btn is-on' : 'theme-toggle__btn'}
          onClick={() => applyTheme(id)}
        >
          <Icon size={14} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
