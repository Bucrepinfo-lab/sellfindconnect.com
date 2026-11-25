/**
 * The colour theme (owner 25/11/26: "a dark theme"). "system" follows the
 * phone (prefers-color-scheme); "light" / "dark" are set on <html data-theme>
 * and kept in localStorage on this phone only. Storage can be blocked (private
 * tabs, the Android app's first run): every access is guarded.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'sfc-theme';
export const THEME_EVENT = 'sfc-theme-change';

export function parseThemeChoice(raw: unknown): ThemeChoice {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export function readThemeChoice(): ThemeChoice {
  try {
    return parseThemeChoice(window.localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Kept for this visit only.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Runs in <head> before the first paint so a saved Dark choice never flashes
 * light. Plain ES5 string; no imports.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;
