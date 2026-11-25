'use client';

/**
 * Crop and rotate a photo before posting (owner standing rule 25/11/26).
 * Uses react-easy-crop 6 (MIT, React 19 ready): pinch / drag to frame, a
 * rotate button, and the card shapes we show (4:3, 1:1; logos square).
 * Light and colour come from the one-tap looks in PhotoPreview, so this
 * stays a simple framing tool. No text, drawing or blur: a photo must show
 * the product as it is.
 */
import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

async function cropToFile(sourceUrl: string, area: Area, rotation: number, name: string): Promise<File> {
  const image = new Image();
  image.src = sourceUrl;
  await image.decode();
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  // Draw the whole photo rotated, then cut the chosen area out of it.
  const bw = image.naturalWidth * cos + image.naturalHeight * sin;
  const bh = image.naturalWidth * sin + image.naturalHeight * cos;
  const rotated = document.createElement('canvas');
  rotated.width = Math.round(bw);
  rotated.height = Math.round(bh);
  const rctx = rotated.getContext('2d');
  if (!rctx) throw new Error('This browser cannot edit photos.');
  rctx.translate(bw / 2, bh / 2);
  rctx.rotate(rad);
  rctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(area.width));
  out.height = Math.max(1, Math.round(area.height));
  const octx = out.getContext('2d');
  if (!octx) throw new Error('This browser cannot edit photos.');
  octx.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('This photo could not be cropped.');
  const base = name.replace(/\.[^.]*$/, '') || 'photo';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

export function PhotoCropper(props: { file: File; square?: boolean; onDone: (file: File) => void; onCancel: () => void }) {
  // A data URL needs no revoking, so React's double-run of effects in
  // development can't pull the picture away mid-edit.
  const [loaded, setLoaded] = useState<{ from: File; url: string } | null>(null);
  const url = loaded && loaded.from === props.file ? loaded.url : '';
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(props.square ? 1 : 4 / 3);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const reader = new FileReader();
    reader.onload = () => {
      if (alive && typeof reader.result === 'string') setLoaded({ from: props.file, url: reader.result });
    };
    reader.readAsDataURL(props.file);
    return () => {
      alive = false;
      reader.abort();
    };
  }, [props.file]);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  async function done() {
    if (!area || !url) return;
    setBusy(true);
    setError(null);
    try {
      props.onDone(await cropToFile(url, area, rotation, props.file.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This photo could not be cropped.');
      setBusy(false);
    }
  }

  return (
    <div className="photo-cropper" role="dialog" aria-modal="true" aria-label="Crop and rotate photo">
      <div className="photo-cropper__stage">
        {url ? (
          <Cropper
            image={url}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onComplete}
          />
        ) : null}
      </div>
      <div className="photo-cropper__bar">
        {!props.square ? (
          <div className="photo-cropper__shapes" role="radiogroup" aria-label="Shape">
            {[
              { label: 'Card 4:3', value: 4 / 3 },
              { label: 'Square', value: 1 },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={aspect === s.value}
                className={aspect === s.value ? 'chip is-active' : 'chip'}
                onClick={() => setAspect(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}
        <label className="photo-cropper__zoom">
          <span>Zoom</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <div className="biz-actions">
          <button type="button" className="secondary-button" onClick={() => setRotation((r) => (r + 90) % 360)}>
            Rotate
          </button>
          <button type="button" className="secondary-button" disabled={busy} onClick={props.onCancel}>
            Cancel
          </button>
          <button type="button" className="primary-button" disabled={busy || !area} onClick={() => void done()}>
            {busy ? 'Saving…' : 'Use this photo'}
          </button>
        </div>
        {error ? <p className="biz-note error">{error}</p> : null}
      </div>
    </div>
  );
}
