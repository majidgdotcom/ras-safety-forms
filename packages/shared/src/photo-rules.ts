/** Photo upload rules - enforced in the browser AND in the API / S3 upload policy. */
export const PHOTO_RULES = {
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB per photo
  minPerSubmission: 1,
  maxPerSubmission: 6,
};

export type AllowedPhotoType = (typeof PHOTO_RULES.allowedTypes)[number];

export function extensionFor(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}
