'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_PHOTO_LOOK,
  MAX_ORIGINAL_PHOTO_BYTES,
  PHOTO_LOOK_IDS,
  PHOTO_LOOKS,
  photoScreenMessage,
  screenPhoto,
  type PhotoLook,
} from '@telpen/domain';

import { preparePhoto, type PreparedPhoto } from '../lib/prepare-photo';
import { PhotoCropper } from './PhotoCropper';
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
  const { keepPng, caption, existing, logo } = props;
  const noun = props.noun ?? 'photo';
  // The seller's own crop replaces the chosen file; looks apply on top.
  // A crop belongs to the file it was made from; a new file starts uncropped.
  const [cropped, setCropped] = useState<{ from: File; file: File } | null>(null);
  const file = cropped && cropped.from === props.file ? cropped.file : props.file;
  const tooBig = file.size > MAX_ORIGINAL_PHOTO_BYTES;
  const [cropping, setCropping] = useState(false);
  const [look, setLook] = useState<PhotoLook>(props.improveByDefault === false ? 'asTaken' : DEFAULT_PHOTO_LOOK);
  const [state, setState] = useState<State>({ status: 'working' });

  useEffect(() => {
    let cancelled = false;
    let url = '';
    if (tooBig) return;
    preparePhoto(file, { look, keepPng })
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
  }, [file, tooBig, look, keepPng, caption, existing, logo]);

  // A result for an earlier file or switch position is treated as still preparing.
  const ready = state.status === 'ready' && state.file === file && state.photo.look === look ? state : null;
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
      {tooBig ? (
        <p className="biz-note error">
          This photo is over {Math.round(MAX_ORIGINAL_PHOTO_BYTES / (1024 * 1024))} MB. Choose a smaller one.
        </p>
      ) : state.status === 'error' ? (
        <p className="biz-note error">{state.message}</p>
      ) : null}

      <div className="photo-preview__looks" role="radiogroup" aria-label="Look">
        {PHOTO_LOOK_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={look === id}
            title={PHOTO_LOOKS[id].help}
            className={look === id ? 'chip is-active' : 'chip'}
            onClick={() => setLook(id)}
          >
            {PHOTO_LOOKS[id].label}
          </button>
        ))}
      </div>
      <p className="biz-sub">
        {PHOTO_LOOKS[look].help} Looks are gentle and capped; they never change what is in the picture.
      </p>
      <button type="button" className="secondary-button photo-preview__crop" onClick={() => setCropping(true)}>
        Crop and rotate
      </button>
      {cropping ? (
        <PhotoCropper
          file={file}
          square={Boolean(logo)}
          onDone={(cropped) => {
            setCropped({ from: props.file, file: cropped });
            setCropping(false);
          }}
          onCancel={() => setCropping(false)}
        />
      ) : null}

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
