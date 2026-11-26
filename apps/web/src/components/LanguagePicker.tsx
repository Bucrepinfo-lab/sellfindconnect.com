'use client';

/**
 * My language (owner 26/11/26): Kiswahili or English. Tap-to-speak starts in
 * it and the speaking words on screen follow it. Kept on this phone.
 */
import { speechWord, type AppLanguage } from '@telpen/domain';

import { saveLanguage, useLanguage } from '../lib/speech';

export function LanguagePicker() {
  const language = useLanguage();

  const chip = (id: AppLanguage, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={language === id}
      className={language === id ? 'speak__lang is-on' : 'speak__lang'}
      onClick={() => {
        saveLanguage(id);
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="speak__langs" role="radiogroup" aria-label="My language / Lugha yangu">
        {chip('sw', 'Kiswahili')}
        {chip('en', 'English')}
      </div>
      <p className="biz-sub" style={{ marginTop: 8 }}>
        {speechWord(language, 'gap')}
      </p>
    </div>
  );
}
