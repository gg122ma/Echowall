# Test Plan

## Automated static checks

- `node --check` for every runtime JavaScript file (archived checkpoint
  fragments with `.js` suffixes are not executable files).
- Duplicate HTML ID scan.
- Missing local asset scan.
- CSS brace-balance check.
- HTTP 200 smoke check for `index.html` and `map.html`.
- `node scripts/validate-static.mjs` for duplicate IDs, local assets, and CSS
  structure.
- `node scripts/test-campus-ai.mjs` (minimum 30 cases; current suite: 73).
- `node scripts/test-ai-map-actions.mjs`.
- `node scripts/test-photo-pipeline.mjs`.
- `node scripts/test-auth-verification.mjs`.
- Every other `scripts/test-*.mjs` regression suite.
- `node scripts/build-pages.mjs` followed by
  `node scripts/validate-pages-artifact.mjs`.
- `node scripts/check-production-auth-settings.mjs`; record
  `PARTIAL / BLOCKED BY SUPABASE AUTO-CONFIRM` while it reports
  `mailer_autoconfirm: true`. This known external limitation does not stop the
  remaining release steps, but real mailbox ownership verification is not a
  pass.

## Manual feature checks

### Accounts

- Register with valid and invalid email.
- Reject short password and mismatched confirmation.
- Sign in, sign out and reload session.
- Confirm posting is blocked while signed out.
- Confirm an unverified Supabase user cannot publish a post or attach a photo.
- Confirm confirmation-required signup reports success awaiting email rather than failure.
- Confirm a verified, unexpired Supabase user can publish.
- Confirm authenticated user may choose anonymous or named posting.
- Follow a real confirmation link, sign in afterward, and verify the account
  summary changes to Verified email.

### Building flow

- Open building directory.
- Open at least three building profiles.
- Verify localized description and profile metadata.
- Verify popular notes are visible over the bird's-eye outline.
- Enter the dedicated building wall without batch or major selection.

### Notes

- Select every new shape.
- Choose multiple placement points.
- Reload and verify positions persist.
- Upload photo, test crop scale from 100% to 180%.
- Test `cover` and `contain`.
- Verify desktop layout and mobile list fallback.

### Language and translation

- Switch among English, Bahasa Melayu and Chinese.
- Reload and verify preference persists.
- Verify original/translated toggle.
- Verify clear error when translation endpoint is not configured.

### Theme

- Test light, dark and system mode.
- Reload and verify preference persists.
- Check building profile, wall, drawer, modal, auth and admin contrast.

### Integrations

- Photo feature disabled: photo upload fails closed.
- JPEG, PNG and WebP are re-encoded; unsupported/corrupt files fail clearly.
- Cloudinary unsigned upload: preset `EchoWall`, Cloudinary-forced overwrite
  false, validated secure URL/public ID/dimensions/bytes/format.
- Cloudinary upload failure creates no DB row; DB failure records orphan metadata without retrying the post.
- Verify Community, Building, and Map photo posts each persist exactly one post
  and one attached media record.
- BISHENG disabled: launcher explains pending configuration.
- BISHENG enabled: route and building context included.

### Campus assistant

- Run 30+ deterministic cases across English, Malay and Chinese.
- Verify known facts, aliases, conservative typos, follow-up context, false-premise correction and source conflicts.
- Verify location/navigation intent produces only validated existing Map actions.
- Verify information-only, ambiguous and unknown places never force Map navigation.
- Verify provider timeout/malformed output and prompt injection remain human-safe.

### Map action and return state

- AI location answer -> Open Map -> focused canonical place.
- From the focused Map place, open details/wall and use Back; the prior state is
  sensible and the pending AI action is not replayed.
- Verify manual Map entry, Community -> Map, and Building -> Map are unchanged.
- Verify an expired or malformed pending action is ignored once without a
  console error.
