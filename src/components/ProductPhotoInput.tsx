import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { prepareProductPhoto, productPhotoAccept } from '../services/productPhoto';

export default function ProductPhotoInput({
  value,
  disabled,
  onChange,
  onBusyChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (photo: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(
    () => () => {
      request.current++;
      busyCallback.current(false);
    },
    [],
  );

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const selected = ++request.current;
    setError('');
    setBusy(true);
    onBusyChange(true);
    try {
      const photo = await prepareProductPhoto(file);
      if (selected === request.current) onChange(photo);
    } catch (caught) {
      if (selected !== request.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : 'This photo could not be prepared. Choose another photo.',
      );
      if (input.current) input.current.value = '';
    } finally {
      if (selected === request.current) {
        setBusy(false);
        busyCallback.current(false);
      }
    }
  }

  return (
    <div className="product-photo-picker">
      <div className="product-photo-controls">
        <label htmlFor={id}>Product photo</label>
        <input
          ref={input}
          id={id}
          type="file"
          accept={productPhotoAccept}
          disabled={disabled}
          aria-describedby={`${id}-help`}
          onChange={selectPhoto}
        />
        <small id={`${id}-help`}>
          Choose a JPG, PNG or WebP photo from your device (up to 10 MB). Photos are resized
          automatically.
        </small>
        {busy && <span role="status">Preparing photo…</span>}
        {error && (
          <p className="message-banner error" role="alert">
            {error}
          </p>
        )}
        {(value || busy) && (
          <button
            className="text-button danger-text"
            type="button"
            disabled={disabled}
            onClick={() => {
              request.current++;
              setBusy(false);
              busyCallback.current(false);
              setError('');
              if (input.current) input.current.value = '';
              onChange('');
            }}
          >
            Remove photo
          </button>
        )}
      </div>
      {value && <img className="product-photo-preview" src={value} alt="Product photo preview" />}
    </div>
  );
}
