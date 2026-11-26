/**
 * Speak instead of type (owner 26/11/26). Many sellers have something to
 * advertise but cannot type. They tap the microphone and talk; the words land
 * in the box for them to check. Pure and tested: the languages a phone can
 * write down, and the screen words in English and Kiswahili.
 */
export const appLanguages = ['en', 'sw'] as const;
export type AppLanguage = (typeof appLanguages)[number];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'sw';
}

export type SpeechLanguage = { id: string; native: string; app: AppLanguage };

/**
 * Languages the phone's own speech recognition (Chrome on Android, which the
 * Play app uses) writes down. Kikuyu, Dholuo, Kalenjin and Luhya have no
 * phone speech recognition yet, so they are not offered: a button that hears
 * nothing loses the seller's trust.
 */
export const speechLanguages: SpeechLanguage[] = [
  { id: 'sw-KE', native: 'Kiswahili', app: 'sw' },
  { id: 'en-KE', native: 'English', app: 'en' },
];

export function speechLanguageFor(app: AppLanguage | null | undefined): string {
  return app === 'sw' ? 'sw-KE' : 'en-KE';
}

export const speechWords = {
  tap: { en: 'Tap and speak', sw: 'Bonyeza uongee' },
  stop: { en: 'Stop', sw: 'Simamisha' },
  listening: { en: 'Listening… speak clearly, close to the phone', sw: 'Ninasikiliza… ongea wazi, karibu na simu' },
  speakIn: { en: 'I will speak in', sw: 'Nitaongea kwa' },
  none: {
    en: 'Your phone cannot listen inside the app. Tap the box, then the microphone key on your keyboard, and speak.',
    sw: 'Simu yako haiwezi kusikiliza ndani ya programu. Gusa kisanduku, kisha kitufe cha maikrofoni kwenye kibodi, uongee.',
  },
  denied: {
    en: 'The microphone is blocked for SellFindConnect. Allow it in your phone settings, or use the keyboard microphone.',
    sw: 'Maikrofoni imezuiwa kwa SellFindConnect. Iruhusu kwenye mipangilio ya simu, au tumia maikrofoni ya kibodi.',
  },
  check: { en: 'Read it through and correct any wrong words.', sw: 'Soma tena na urekebishe maneno yasiyo sahihi.' },
  gap: {
    en: 'Kikuyu, Dholuo, Kalenjin and Luhya cannot be written down by phones yet. Speak in Kiswahili or English, or mix them.',
    sw: 'Simu bado haziwezi kuandika Kikuyu, Dholuo, Kalenjin wala Luhya. Ongea kwa Kiswahili au Kiingereza, au changanya.',
  },
  sayTitle: { en: 'Cannot type? Say it.', sw: 'Huwezi kuandika? Sema tu.' },
  sayBody: {
    en: 'Tap the microphone and say what you sell, your prices and where you deliver. The words are written for you.',
    sw: 'Bonyeza maikrofoni useme unauza nini, bei zako na unapopeleka. Maneno yataandikwa kwa niaba yako.',
  },
  myLanguage: { en: 'My language', sw: 'Lugha yangu' },
} as const satisfies Record<string, Record<AppLanguage, string>>;

export type SpeechWord = keyof typeof speechWords;

export function speechWord(language: AppLanguage | null | undefined, key: SpeechWord): string {
  return speechWords[key][language === 'sw' ? 'sw' : 'en'];
}

/** Add newly spoken words to what is already in a box, within its length limit. */
export function appendSpoken(current: string, spoken: string, maxLength: number): string {
  const words = spoken.replace(/\s+/g, ' ').trim();
  if (!words) return current;
  const joined = current.trim() ? `${current.trimEnd()} ${words}` : words;
  return joined.slice(0, maxLength);
}
