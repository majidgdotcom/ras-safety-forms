import { PHOTO_RULES } from '@ras/shared';

/** Returns an error message, or null if the file is OK to upload. */
export function validatePhoto(file: File): string | null {
  if (!(PHOTO_RULES.allowedTypes as readonly string[]).includes(file.type)) {
    return `"${file.name}" is not a JPG, PNG or WEBP image`;
  }
  if (file.size > PHOTO_RULES.maxSizeBytes) {
    return `"${file.name}" is larger than ${PHOTO_RULES.maxSizeBytes / 1024 / 1024} MB`;
  }
  return null;
}

const MAX_DIMENSION = 1920;

/**
 * Phone photos are often 4-8 MB. Shrinking them to max 1920px JPEG makes uploads
 * on a weak job-site signal much faster. If anything fails we just use the original.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
