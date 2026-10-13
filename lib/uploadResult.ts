// Only explicitly safe application messages are returned to the browser.
export async function uploadResult<T>(operation: () => Promise<T>) {
  try { return { ok: true as const, value: await operation() }; }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    const safe = /^(Choose |Upload an |This ZIP |This audio |Project access required\.|Your project role |That track is not |Cloudflare R2 is not configured|The configured Cloudflare R2 bucket|Cloudflare rejected the R2 credentials|The audio transfer did not finish|The track file transfer is incomplete|The upload does not belong|The uploaded file |Enter the song |Confirm that |Use a JPG|Shorten the release |Submission service unavailable|This admin account reached|Public submissions are limited|Could not prepare your release|Draft not found|The uploaded audio is invalid|The cover upload is invalid|Could not submit your release)/.test(message);
    const reference = crypto.randomUUID().slice(0, 8);
    console.error('music-upload', { reference, error: cause });
    return { ok: false as const, error: safe ? message : `Upload could not be completed. Your selected file is kept. Retry, or report reference ${reference}.` };
  }
}
