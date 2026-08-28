# Test Plan

## Automated static checks

- `node --check` for every JavaScript file.
- Duplicate HTML ID scan.
- Missing local asset scan.
- CSS brace-balance check.
- HTTP 200 smoke check for `index.html` and `map.html`.

## Manual feature checks

### Accounts

- Register with valid and invalid email.
- Reject short password and mismatched confirmation.
- Sign in, sign out and reload session.
- Confirm posting is blocked while signed out.
- Confirm authenticated user may choose anonymous or named posting.

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

- Cloudinary disabled: image remains local fallback.
- Cloudinary enabled: secure URL and public ID stored.
- BISHENG disabled: launcher explains pending configuration.
- BISHENG enabled: route and building context included.
