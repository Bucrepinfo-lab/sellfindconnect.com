'use client';

/**
 * "Read text from a photo" (OCR), owner standing rule 25/11/26. Tesseract.js 7
 * (Apache-2.0), loaded only when tapped. The photo is read on the phone and
 * never uploaded; the engine and the compact English + Kiswahili models are
 * served from our own site (/ocr, copied at build by scripts/copy-ocr-assets.mjs).
 * The person checks and edits the words before they are added.
 */
import { useRef, useState } from 'react';

export function ReadTextButton(props: { onText: (text: string) => void; label?: string; addLabel?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function read(file: File) {
    setBusy(true);
    setError(null);
    setText(null);
    setProgress(0);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['eng', 'swa'], 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr',
        langPath: '/ocr/lang',
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const clean = data.text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (clean) setText(clean);
      else setError('No words found. Take the photo closer, in good light, with the words straight.');
    } catch {
      setError('This phone could not read the photo. Type the words instead.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="read-text">
      <button type="button" className="secondary-button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? `Reading… ${progress}%` : (props.label ?? 'Read text from a photo')}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const f = event.target.files?.[0];
          event.target.value = '';
          if (f) void read(f);
        }}
      />
      <small className="biz-sub">The photo stays on your phone; only the words are added, if you choose.</small>
      {error ? <p className="biz-note error">{error}</p> : null}
      {text ? (
        <div className="read-text__result">
          <span className="biz-sub">Words found. Check them before adding:</span>
          <textarea value={text} rows={Math.min(8, text.split('\n').length + 1)} onChange={(e) => setText(e.target.value)} />
          <div className="biz-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                props.onText(text);
                setText(null);
              }}
            >
              {props.addLabel ?? 'Add to the description'}
            </button>
            <button type="button" className="secondary-button" onClick={() => setText(null)}>
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
