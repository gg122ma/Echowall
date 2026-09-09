# Supabase Email Verification and Protected Publishing

## Application behavior

“Verified email” means Supabase has confirmed mailbox ownership. Client syntax
validation is only an early usability check and is never treated as proof.

`services/supabase-auth-provider.js` preserves the authoritative Supabase
`email_confirmed_at` value and session expiry in the application user model.
Registration correctly accepts Supabase's confirmation-required result where a
user is returned without an authenticated session, reports
`awaiting_verification`, and asks the user to check email instead of treating
the registration as failed.

`services/email-verification-service.js` provides the client-side state checks.
Verified, active Supabase sessions may publish posts or attach/upload photos;
unverified and expired sessions receive human-readable errors. Existing local
prototype users remain compatible on non-production/local routes. These browser
checks are UX only.

## Server boundary

Migration `supabase/migrations/20260909151613_ai_photo_verified_writes.sql`
adds `private.require_verified_active_user()`. It first uses the existing active
profile/role check and then reads `auth.users.email_confirmed_at` under a locked
security-definer boundary. It does not trust JWT user metadata and does not
grant browser roles access to `auth.users`.

The existing `api.create_post` and `api.create_map_post` RPCs use that helper.
The new authenticated-only `api.create_post_with_media` RPC creates the post and
its validated Cloudinary metadata atomically. Existing RLS is not disabled or
weakened; direct browser writes to `app` tables remain unavailable.

## Production configuration blocker

Read-only inspection on 2026-09-09 reported `mailer_autoconfirm: true` for the
production Supabase project. With auto-confirm enabled, new email users are
implicitly confirmed, so production cannot honestly demonstrate a mailbox
confirmation gate even though the application and database checks are ready.

Before verification is considered operational, the project owner must enable
Supabase Auth **Confirm Email**, configure production SMTP/redirect URLs, and
test one new unverified account followed by the confirmation-link flow. This
release does not silently change that sensitive Auth setting. Existing users
are not rewritten by the migration.

Never place a `service_role` key in browser code. The existing publishable key
is expected public configuration and remains constrained by RLS/RPC policy.
