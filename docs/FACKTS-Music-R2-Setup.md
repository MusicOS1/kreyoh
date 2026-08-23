# FACKTS Music Cloudflare R2 beat storage

Direct producer uploads use short-lived server-signed R2 URLs. R2 credentials remain server-only.

## Required server variables

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- Optional: `R2_PUBLIC_BASE_URL` for a custom/private streaming domain. Without it, playback uses a short-lived signed URL.

Add the variables to local `.env.local` and to Vercel Production. Never prefix credentials with `NEXT_PUBLIC_`.

## Bucket CORS policy

In the R2 bucket settings, allow these origins:

- `https://music.facktsafrica.co.ke`
- `http://localhost:3000`

Allow methods `GET`, `HEAD`, and `PUT`; allow header `Content-Type`; expose `ETag`; set a reasonable max age such as `3600`.

The database retains provider-neutral fields (`storage_provider`, `storage_key`, `playback_url`) so Google Drive, legacy Supabase files, external links, and a future real NextBeat API can coexist without rebuilding the Beat Library.
