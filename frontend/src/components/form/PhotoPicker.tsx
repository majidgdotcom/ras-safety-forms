import React, { useEffect, useMemo, useRef } from 'react';

import { PHOTO_RULES } from '@ras/shared';

import { validatePhoto } from '@/utils/image';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  onReject: (messages: string[]) => void;
  error?: string;
  disabled?: boolean;
}

/** Take or choose photos, preview them, remove them. Validates type and size on the spot. */
export const PhotoPicker: React.FC<Props> = ({ files, onChange, onReject, error, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs for previews; revoke them when files change to avoid memory leaks.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const handlePick = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      const problem = validatePhoto(file);
      if (problem) problems.push(problem);
      else accepted.push(file);
    }
    const room = PHOTO_RULES.maxPerSubmission - files.length;
    if (accepted.length > room) {
      problems.push(`You can attach up to ${PHOTO_RULES.maxPerSubmission} photos`);
    }
    onReject(problems);
    onChange([...files, ...accepted.slice(0, Math.max(room, 0))]);
    if (inputRef.current) inputRef.current.value = ''; // allow picking the same file again
  };

  const remove = (index: number) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className={error ? 'has-error' : undefined}>
      <label className="photo-drop" aria-disabled={disabled}>
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_RULES.allowedTypes.join(',')}
          multiple
          disabled={disabled || files.length >= PHOTO_RULES.maxPerSubmission}
          onChange={(e) => handlePick(e.target.files)}
        />
        <strong>📷 Take or choose photos</strong>
        <span className="hint small muted">
          Site conditions, PPE, hazards · JPG/PNG/WEBP · max 10 MB each · {files.length}/
          {PHOTO_RULES.maxPerSubmission}
        </span>
      </label>

      {files.length > 0 && (
        <div className="thumbs">
          {files.map((file, i) => (
            <div className="thumb" key={`${file.name}-${i}`}>
              <img src={previews[i]} alt={`Photo ${i + 1} preview`} />
              {!disabled && (
                <button
                  type="button"
                  className="thumb__remove"
                  onClick={() => remove(i)}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
};
