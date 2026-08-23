# FACKTS Music authentication email setup

The application now sends signup and password-reset links through `/auth/callback`, so confirmed users return to a valid FACKTS Music route instead of a 404 page.

## Supabase URL configuration

In Supabase Dashboard, open **Authentication → URL Configuration**.

- Site URL: `https://music.facktsafrica.co.ke`
- Add redirect URL: `https://music.facktsafrica.co.ke/auth/callback`
- Add redirect URL: `http://localhost:3000/auth/callback`
- Keep `http://localhost:3000/set-password` only for local password-update testing.

## Resend SMTP

1. In Resend, verify `facktsafrica.co.ke` using the DNS records Resend provides.
2. Create a Resend API key restricted to sending mail.
3. In Supabase Dashboard, open **Project Settings → Authentication → SMTP Settings** and enable custom SMTP.
4. Use:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: the Resend API key
   - Sender name: `FACKTS Africa`
   - Sender email: `auth@facktsafrica.co.ke`
5. Send a signup and password-reset test to an address you control.

Never place the Resend API key in a `NEXT_PUBLIC_` environment variable or commit it to Git.

## Current MVP confirmation choice

To allow immediate sessions after signup, go to **Supabase → Authentication → Providers → Email** and turn **Confirm email** off. Email signup remains enabled. If confirmation is turned back on later, the callback route is already ready.
