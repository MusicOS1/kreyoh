import { updateFanLibrary } from '../../../fan/actions';
import { uuidPattern } from '../../../../lib/community';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
      (origin && origin !== new URL(request.url).origin))
    return Response.json({ ok: false, error: 'Invalid request origin.' }, { status: 403, headers });
  let input;
  try { input = await request.json(); } catch {
    return Response.json({ ok: false, error: 'Invalid follow request.' }, { status: 400, headers });
  }
  if (!input || typeof input.artistId !== 'string' || !uuidPattern.test(input.artistId) || typeof input.following !== 'boolean')
    return Response.json({ ok: false, error: 'Invalid follow request.' }, { status: 400, headers });
  const result = await updateFanLibrary('following', input.artistId, input.following);
  return Response.json(result, { status: result.ok ? 200 : 400, headers });
}
