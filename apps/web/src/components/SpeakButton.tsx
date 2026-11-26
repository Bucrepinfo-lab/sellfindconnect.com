'use client';

/**
 * Tap to speak (owner 26/11/26): for people who cannot type. Each finished
 * phrase is handed to `onWords`; the caller adds it to its box, where the
 * person can still correct it by hand. Where the phone cannot listen inside
 * the app, they are told to use the keyboard's microphone key instead.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { speechLanguages, speechWord, type AppLanguage } from '@telpen/domain';

import { recogniser, saveSpeechLanguage, useSpeechLanguage, type Recogniser } from '../lib/speech';

export function SpeakButton(props: { onWords: (words: string) => void; showLanguages?: boolean }) {
  const language = useSpeechLanguage();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const supported = !unsupported;
  const rec = useRef<Recogniser | null>(null);
  const onWords = useRef(props.onWords);
  useEffect(() => {
    onWords.current = props.onWords;
  });
  const words: AppLanguage = speechLanguages.find((l) => l.id === language)?.app ?? 'en';

  useEffect(() => () => rec.current?.stop(), []);

  function start() {
    const R = recogniser();
    if (!R) {
      setUnsupported(true);
      return;
    }
    const r = new R();
    r.lang = language;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) onWords.current(res[0].transcript);
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setNote(speechWord(words, 'denied'));
      else if (e.error === 'language-not-supported') setNote(speechWord(words, 'none'));
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
      setNote((current) => current ?? speechWord(words, 'check'));
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
      setNote(null);
    } catch {
      setNote(speechWord(words, 'none'));
    }
  }

  return (
    <div className="speak">
      {props.showLanguages ? (
        <div className="speak__langs" role="radiogroup" aria-label={speechWord(words, 'speakIn')}>
          <span className="biz-sub">{speechWord(words, 'speakIn')}</span>
          {speechLanguages.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={language === l.id}
              className={language === l.id ? 'speak__lang is-on' : 'speak__lang'}
              onClick={() => {
                saveSpeechLanguage(l.id);
                if (listening) rec.current?.stop();
              }}
            >
              {l.native}
            </button>
          ))}
        </div>
      ) : null}
      {supported ? (
        <button
          type="button"
          className={listening ? 'speak__mic is-live' : 'speak__mic'}
          aria-pressed={listening}
          onClick={() => (listening ? rec.current?.stop() : start())}
        >
          <Mic size={18} aria-hidden /> {speechWord(words, listening ? 'stop' : 'tap')}
        </button>
      ) : null}
      {listening ? (
        <p className="biz-sub" role="status">
          {speechWord(words, 'listening')}
          {interim ? ` — “${interim}”` : ''}
        </p>
      ) : null}
      {note || !supported ? (
        <p className="biz-sub" role="status">
          {note ?? speechWord(words, 'none')}
        </p>
      ) : null}
    </div>
  );
}
