# Cloud Admin Map / Building + Permanent Delete Release

Status: pending production approval.

## Apply order

1. Confirm the two existing production Cloud Admin migrations and both current
   Admin role rows are unchanged.
2. Apply `20260923234640_cloud_admin_map_building_delete.sql`.
3. Verify ordinary/disabled users are denied and both Admins can read the new
   statistics and paginated content RPCs.
4. Deploy the matching frontend only after database verification succeeds.
5. Test permanent deletion only with owner-designated production test content.

The migration does not bootstrap roles, rewrite content, or delete rows.

## Media boundary

An active Cloudinary-backed media row blocks permanent deletion. Database and
external media deletion cannot be made atomic with the current trusted APIs, so
the release fails closed instead of orphaning a file or reporting false success.

## Rollback

Roll back the frontend first. After confirming no deployed client still calls
the new RPCs, a reviewed database rollback may drop only these functions:

- `api.admin_get_managed_content_stats()`
- `api.admin_list_managed_content(text, text, boolean, text, integer, integer)`
- `api.admin_moderate_managed_content(text, text, uuid, text, text)`
- `api.admin_get_delete_impact(text, text, uuid)`
- `api.admin_permanently_delete_content(text, text, uuid, text)`

Dropping the RPCs does not restore content already permanently deleted. Restore
such content only from a verified database backup and associated media source.
