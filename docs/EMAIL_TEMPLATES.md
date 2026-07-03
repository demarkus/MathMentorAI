# Email templates — Math Mentor AI

Branded HTML for the Supabase auth emails. The templates live in
`supabase/templates/` so they're version-controlled; they are **installed in the
Supabase dashboard** (this hosted project has no `supabase/config.toml`, so the
CLI does not push email templates).

| File | Dashboard template | Used by the app today? |
|------|--------------------|------------------------|
| `supabase/templates/confirm-signup.html` | **Confirm signup** | ✅ Yes — sign-up requires email confirmation (`/auth/callback` exchanges the code). |
| `supabase/templates/reset-password.html` | **Reset password** | ⚠️ Not yet — the app has no "forgot password" trigger, so this email is only sent once a password-reset flow is added/enabled. Included so the branding is ready. |

Other Supabase email types (Invite user, Magic Link, Change email address,
Reauthentication) are **not used** by the current flows and are intentionally
not provided — add them the same way if those flows are introduced.

## Install (Supabase dashboard)

1. Open your project → **Authentication → Emails** (Email Templates).
2. Select **Confirm signup**, switch the editor to HTML/source, and paste the
   contents of `supabase/templates/confirm-signup.html`. Save.
3. Repeat for **Reset password** with `supabase/templates/reset-password.html`.
4. Optionally set a branded **Sender name** (e.g. "Math Mentor AI") under Auth →
   Emails settings. Configuring a custom SMTP sender domain is recommended for
   deliverability but is out of scope here.

## Template variables

These use Supabase's Go-template syntax and are substituted by Supabase at send
time — leave them exactly as written:

- `{{ .ConfirmationURL }}` — the action link (confirm signup / reset password).
  It is built from your **Site URL** + the auth redirect, so those must be set
  correctly (see below). Both templates use this for the button and the
  copy-paste fallback link.

Other variables Supabase exposes if you need them: `{{ .Token }}`,
`{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`.

## Prerequisites (already covered in DEPLOYMENT.md)

- **Site URL** and the `<origin>/auth/callback` **redirect URL** must be set for
  each environment (Auth → URL Configuration). `{{ .ConfirmationURL }}` and the
  post-confirmation landing both depend on these being correct.
- Email/password provider must be enabled (Auth → Providers → Email).

## Design notes

- Table-based layout with **inline styles only** (email clients don't support
  `<style>`/CSS variables reliably) and a ~600px max width.
- Brand colours are inlined as hex to match the app tokens in
  `src/app/globals.css`: brand `#2f6b4f`, brand-dark `#204936`, accent `#f2b84b`.
- Each email has a bulletproof button **and** a plain-text fallback link.

## Testing

After installing, trigger a real send: sign up a throwaway account and confirm
the **Confirm signup** email renders correctly and its link lands on
`/auth/callback` → `/dashboard`. (There is no in-repo automated test for email
rendering; this is a manual check — see `docs/BETA_SMOKE_TEST.md`.)
