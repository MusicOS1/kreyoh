export function directUpload(url: string, file: File, type: string, progress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', type);
    request.timeout = 60 * 60 * 1000;
    request.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Storage transfer failed (HTTP ${request.status}). Retry the file; if it persists, report this status.`));
    request.onerror = () => reject(new Error('Storage could not be reached. Check your connection; if it persists, the storage CORS configuration needs checking.'));
    request.ontimeout = () => reject(new Error('The transfer timed out. Retry on a stable connection or split a large ZIP.'));
    request.onabort = () => reject(new Error('Upload cancelled.'));
    request.send(file);
  });
}
