import React, { useEffect, useState } from 'react';

import { PhotoDto } from '@ras/shared';

/** Thumbnails; tap one to see it full screen. */
export const PhotoGallery: React.FC<{ photos: PhotoDto[] }> = ({ photos }) => {
  const [open, setOpen] = useState<PhotoDto | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (photos.length === 0) return <p className="muted">No photos attached.</p>;

  return (
    <>
      <div className="thumbs">
        {photos.map((p, i) => (
          <button
            key={p.photoId}
            type="button"
            className="thumb"
            onClick={() => setOpen(p)}
            aria-label={`Open photo ${i + 1}`}
          >
            <img src={p.url} alt={`Site photo ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" className="btn btn--ghost-light lightbox__close" onClick={() => setOpen(null)}>
            Close ✕
          </button>
          <img src={open.url} alt="Site photo, full size" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};
