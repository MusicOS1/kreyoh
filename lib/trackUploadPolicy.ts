export const TRACK_AUDIO_LIMIT = 250 * 1024 * 1024;
export const TRACK_ZIP_LIMIT = 4 * 1024 * 1024 * 1024;
export function trackUploadError(name: string, type: string, size: number): string | null {
  const zip = /\.zip$/i.test(name);
  if (!name || !Number.isSafeInteger(size) || size <= 0) return 'Choose a non-empty audio file or stems ZIP.';
  if (!zip && !type.startsWith('audio/')) return 'Upload an audio file, or a ZIP archive for stems.';
  if (size > (zip ? TRACK_ZIP_LIMIT : TRACK_AUDIO_LIMIT)) return zip
    ? 'This ZIP exceeds 4 GB per file. Split it into smaller archives.'
    : 'This audio exceeds 250 MB per file. Use a smaller audio file.';
  return null;
}
