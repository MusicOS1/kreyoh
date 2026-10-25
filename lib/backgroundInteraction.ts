// Background mutations must not enter Next's page-navigation/action queue.
export async function backgroundInteraction<T = any>(action: string, payload: unknown = {}): Promise<T> {
  const multipart = payload instanceof FormData;
  const response = await fetch(`/api/interactions/${action}`, {
    method: 'POST',
    ...(multipart ? {} : { headers: { 'Content-Type': 'application/json' } }),
    body: multipart ? payload : JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('Could not save. Check your connection and retry.'); }
  if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save. Please try again.');
  return result.value as T;
}
export function backgroundFormAction<T extends object>(action: string, fallback: T) {
  return async (_previous: T, form: FormData): Promise<T> => {
    try { return await backgroundInteraction<T>(action, form); }
    catch { return { ...fallback, error: 'Could not save. Reconnect and try again.', message: 'Could not save. Reconnect and try again.', ok: false }; }
  };
}
