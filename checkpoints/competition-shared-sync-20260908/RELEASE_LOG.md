# EchoWall shared-sync release checkpoint

- Phase: implementation and all local pre-production gates complete; final review pending
- Branch: `competition-shared-sync-20260908`
- HEAD / production main / origin main: `ab838a7782c1b98fe64bcc01b03e0cb89dc9788e`
- Production Pages commit: `ab838a7782c1b98fe64bcc01b03e0cb89dc9788e` (successful workflow run `33518622432`)
- Rollback reference: `innostem-2026-pre-shared-sync-20260908-073516-sgt` (pushed)
- Supabase project: `iavndheqyzphcppfisil` (`EchoWall`, ACTIVE_HEALTHY)
- Migration ledger head: `20260903092150_20260903010000_building_comments_and_replies`
- Migration decision: **NO new migration**. Production already has building-scoped posts, atomic `api.create_map_post`, public post/anchor/comment views, authenticated post/comment/reply/vote/question RPCs, scope validation, and cleanup-safe foreign keys.
- Realtime publication: only `app.realtime_events`; unchanged.
- Baseline database counts: seed posts 567; non-seed posts 1; comments 0; votes 0; map anchors 0; auth users 1; profiles 1; active role rows 1; realtime events 1; audit events 0.
- Preservation guard: the existing non-seed `jurusan:14:40` Community post and its user/profile/role are legitimate production data and must not be cleaned up.
- Community visibility diagnosis: the row is present through the anonymous production REST API; canonical route/key, provider predicates, row adapter, and default filters agree on `jurusan:14:40`. Public reads now use a session-free anonymous client until valid auth is published, and wall-scope filters reset deterministically.
- Implementation: canonical Community, Map user posts/anchors, and Building Wall posts/interactions route through the shared Supabase repositories. Static data remains local. No Realtime subscription was added.
- Files changed: `app-data.js`, `app-wall.js`, `features/map-note-overlay.js`, `map.html`, `services/auth-ui.js`, `services/community-data-provider.js`, `services/community-row-adapter.js`, `services/community-service.js`, `services/community-supabase-client.js`, `services/community-supabase-repositories.js`, `scripts/test-shared-sync-production-routing.mjs`, plus release documentation/checkpoint files.
- Local gates: 78 JavaScript syntax checks; all 15 test scripts; focused shared-sync 27/27; Pages build 465 files; artifact validator PASS; production URL lock PASS.
- Deployment: not started.
- Production E2E: not started.
- QA cleanup: not started.
