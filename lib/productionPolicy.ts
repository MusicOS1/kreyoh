export const PRODUCTION_FILE_LIMIT = 20 * 1024 ** 3;
export const MULTIPART_THRESHOLD = 100 * 1024 ** 2;
export const PRODUCTION_PART_SIZE = 16 * 1024 ** 2;
export const PRODUCTION_KINDS = ['demo','rough_mix','mix','master','stems','reference','document','visual'] as const;
export const PRODUCTION_FILE_ROLES = ['Super Admin','Admin','Project Lead','A&R','Artist','Producer','Engineer','Contributor','Songwriter','Videographer','Visual Creative'];
export function productionFileError(name: string, type: string, size: number, kind: string): string | null {
  if (!Number.isSafeInteger(size) || size <= 0) return 'Choose a non-empty production file.';
  if (size > PRODUCTION_FILE_LIMIT) return 'This file exceeds the 20 GiB transfer limit. Split the package into smaller files.';
  if (!(PRODUCTION_KINDS as readonly string[]).includes(kind)) return 'Choose a production file type.';
  if (kind === 'document') return /\.(pdf|txt|md|docx)$/i.test(name) ? null : 'Supporting documents must be PDF, TXT, Markdown or DOCX.';
  if (kind === 'visual') return /\.(png|jpe?g|webp|mp4|mov)$/i.test(name) ? null : 'Visual deliverables must be PNG, JPEG, WebP, MP4 or MOV.';
  if (kind === 'stems') return /\.(zip|wav|mp3|flac|aiff?|m4a|ogg)$/i.test(name) ? null : 'Choose an audio stem or ZIP stem package.';
  return /^audio\//.test(type) && /\.(wav|mp3|flac|aiff?|m4a|ogg|aac|opus)$/i.test(name) ? null : 'Choose supported audio (WAV, MP3, FLAC, AIFF, M4A, OGG, AAC or Opus).';
}
export function partCount(size: number) { return Math.ceil(size / PRODUCTION_PART_SIZE); }
