'use client';

import { useEffect, useState } from 'react';

import { photoScreenMessage, screenPhoto } from '@telpen/domain';

import { preparePhoto, type PreparedPhoto } from '../lib/prepare-photo';
import { SfcIcon } from './SfcIcon';

type State =
  | { status: 'working' }
  | { status: 'error'; message: string }
  | { status: 'ready'; photo: PreparedPhoto; problems: string[]; file: File };

/**
 * Preview before posting: shows the photo exactly as it will be posted, the
 * checks it passed or failed, and a switch for the colour tidy-up. Nothing is
 * uploaded until the person taps the post button.
 */
export function PhotoPreview(props: {
  file: File;
  /** What the picture is of, for the labels: "logo", "photo". */
  noun?: string;
  improveByDefault?: boolean;
  keepPng?: boolean;
  logo?: boolean;
  caption?: string;
  existing?: Array<{ fileName: string; fileSizeBytes: number }>;
  busy?: boolean;
  onUse: (photo: PreparedPhoto) => void;
  onCancel: () => void;
}) {
  const { file, keepPng, caption, existing, logo } = props;
  const noun = props.noun ?? 'photo';
  const [improve, setImprove] = useState(props.improveByDefault ?? true);
  const [state, setState] = useState<State>({ status: 'working' });

  useEffect(() => {
    let cancelled = false;
    let url = '';
    preparePhoto(file, { improve, keepPng })
      .then((photo) => {
        url = photo.previewUrl;
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        const decision = screenPhoto(
          {
            fileName: photo.file.name,
            mimeType: photo.file.type,
            fileSizeBytes: photo.file.size,
            width: photo.width,
            height: photo.height,
            caption,
          },
          existing,
          { logo },
        );
        setState({ status: 'ready', photo, problems: decision.reasons.map(photoScreenMessage), file });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : 'This photo cannot be used.' });
        }
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, improve, keepPng, caption, existing, logo]);

  // A result for an earlier file or switch position is treated as still preparing.
  const ready = state.status === 'ready' && state.file === file && state.photo.improved === improve ? state : null;
  const ok = Boolean(ready && ready.problems.length === 0);

  return (
    <div className="photo-preview" role="group" aria-label={`Preview your ${noun} before posting`}>
      <h4>Preview before posting</h4>
      <div className="photo-preview__frame" aria-busy={!ready && state.status !== 'error'}>
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ready.photo.previewUrl} alt={`Your ${noun} as it will be posted`} />
        ) : (
          <span className="biz-sub">{state.status === 'error' ? 'No preview' : 'Preparing…'}</span>
        )}
      </div>

      {ready ? (
        <ul className="photo-preview__checks">
          {ok ? (
            <>
              <li className="is-ok">
                <SfcIcon name="checked" size={16} /> Clear enough: {ready.photo.width} × {ready.photo.height} pixels
              </li>
              <li className="is-ok">
                <SfcIcon name="checked" size={16} /> Right shape and file type
              </li>
            </>
          ) : (
            ready.problems.map((problem) => (
              <li key={problem} className="is-bad">
                <SfcIcon name="report" size={16} /> {problem}
              </li>
            ))
          )}
        </ul>
      ) : null}
      {state.status === 'error' ? <p className="biz-note error">{state.message}</p> : null}

      <label className="photo-preview__toggle">
        <input type="checkbox" checked={improve} onChange={(event) => setImprove(event.target.checked)} />
        <span>
          Improve light and colour
          <small>A gentle tidy-up so the {noun} looks true and clear. It never changes what is in the picture.</small>
        </span>
      </label>

      <p className="biz-sub">Our team still checks every {noun} before the public sees it.</p>
      <div className="biz-actions">
        <button
          className="primary-button"
          type="button"
          disabled={!ok || props.busy}
          onClick={() => ready && props.onUse(ready.photo)}
        >
          {props.busy ? 'Posting…' : `Post this ${noun}`}
        </button>
        <button className="secondary-button" type="button" disabled={props.busy} onClick={props.onCancel}>
          Choose another
        </button>
      </div>
    </div>
  );
}
