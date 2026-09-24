#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTAINER = process.env.ECHOWALL_ADMIN_TEST_CONTAINER || 'echowall-admin-phase1a-test-20260924';
const EXPECTED_IMAGE = 'public.ecr.aws/supabase/postgres:17.6.1.166';
const TEST_DATABASE_PASSWORD = 'echowall_local_test_only';
const PRIMARY = '7beb9f0e-76c5-4c6a-b6b4-06e708bf3644';
const SECONDARY = '6a6d8ff7-7322-4643-84ef-aee2b5f6534e';
const ORDINARY = '11111111-1111-4111-8111-111111111111';
const DISABLED = '22222222-2222-4222-8222-222222222222';

let passed = 0;
function pass(label) { passed += 1; console.log(`PASS - ${label}`); }
function fail(label, detail = '') { throw new Error(`${label}${detail ? `: ${detail}` : ''}`); }
function check(label, condition, detail = '') { if (condition) pass(label); else fail(label, detail); }

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function psql(sql) {
  return docker(['exec', '-e', `PGPASSWORD=${TEST_DATABASE_PASSWORD}`, CONTAINER, 'psql', '-X', '-h', '127.0.0.1', '-U', 'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql]);
}

function psqlFile(containerPath) {
  return docker(['exec', '-e', `PGPASSWORD=${TEST_DATABASE_PASSWORD}`, CONTAINER, 'psql', '-X', '-h', '127.0.0.1', '-U', 'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', containerPath]);
}

function asRole(role, userId, sql) {
  const claim = userId ? `select set_config('request.jwt.claim.sub', '${userId}', true);` : `select set_config('request.jwt.claim.sub', '', true);`;
  return psql(`begin; set local role ${role}; ${claim} ${sql}; rollback;`);
}

function asRoleCommit(role, userId, sql) {
  const claim = userId ? `select set_config('request.jwt.claim.sub', '${userId}', true);` : `select set_config('request.jwt.claim.sub', '', true);`;
  return psql(`begin; set local role ${role}; ${claim} ${sql}; commit;`);
}

function expectDenied(label, role, userId, sql) {
  try {
    asRole(role, userId, sql);
    fail(label, 'call unexpectedly succeeded');
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    check(label, /permission denied|Cloud Admin .*permission|required|Authentication required/i.test(output), output.trim());
  }
}

function expectFailure(label, role, userId, sql, pattern) {
  try {
    asRole(role, userId, sql);
    fail(label, 'call unexpectedly succeeded');
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    check(label, pattern.test(output), output.trim());
  }
}

function jsonQuery(role, userId, sql) {
  const output = asRole(role, userId, `select row_to_json(result) from (${sql}) as result`);
  return JSON.parse(output.split(/\r?\n/).filter(line => line.startsWith('{')).at(-1));
}

function main() {
  const image = docker(['inspect', '-f', '{{.Config.Image}}', CONTAINER]);
  check('isolated container uses the production Postgres image version', image === EXPECTED_IMAGE, image);

  docker(['exec', CONTAINER, 'mkdir', '-p', '/tmp/echowall-admin-test']);
  docker(['cp', path.join(ROOT, 'supabase', 'tests', 'production_cloud_admin_fixture.sql'), `${CONTAINER}:/tmp/echowall-admin-test/fixture.sql`]);
  docker(['cp', path.join(ROOT, 'supabase', 'migrations', '20260923162032_production_cloud_admin_phase1a_read_only.sql'), `${CONTAINER}:/tmp/echowall-admin-test/read.sql`]);
  docker(['cp', path.join(ROOT, 'supabase', 'migrations', '20260923165320_production_cloud_admin_content_management.sql'), `${CONTAINER}:/tmp/echowall-admin-test/manage.sql`]);
  docker(['cp', path.join(ROOT, 'supabase', 'migrations', '20260923234640_cloud_admin_map_building_delete.sql'), `${CONTAINER}:/tmp/echowall-admin-test/expand.sql`]);

  psql(`drop schema if exists api cascade; drop schema if exists app cascade; drop schema if exists private cascade; delete from auth.users where id in ('${PRIMARY}','${SECONDARY}','${ORDINARY}','${DISABLED}')`);
  psqlFile('/tmp/echowall-admin-test/fixture.sql');
  psqlFile('/tmp/echowall-admin-test/read.sql');
  psqlFile('/tmp/echowall-admin-test/manage.sql');
  psqlFile('/tmp/echowall-admin-test/expand.sql');
  pass('all three Cloud Admin migration files execute successfully');

  const grants = psql(`select user_id::text || ':' || role::text || ':' || assigned_by::text || ':' || (disabled_at is null)::text from app.user_roles where role='admin' order by user_id`);
  check('primary admin role uses the verified primary Auth UUID as bootstrap assigned_by', grants.includes(`${PRIMARY}:admin:${PRIMARY}:true`));
  check('secondary admin role is assigned by the verified primary administrator', grants.includes(`${SECONDARY}:admin:${PRIMARY}:true`));
  check('disabled admin fixture remains disabled', grants.includes(`${DISABLED}:admin:${PRIMARY}:false`));
  check('bootstrap role grants are auditable', Number(psql(`select count(*) from app.audit_events where event_type in ('admin_role_bootstrap','admin_role_grant')`)) === 2);
  check('migration audit rows do not impersonate an interactive administrator', Number(psql(`select count(*) from app.audit_events where event_type in ('admin_role_bootstrap','admin_role_grant') and actor_user_id is null and metadata->>'event_executor' = 'owner-approved production migration'`)) === 2);

  expectDenied('anon cannot execute Cloud Admin read RPCs', 'anon', null, 'select * from api.admin_get_context()');
  expectDenied('ordinary active user cannot read Cloud Admin data', 'authenticated', ORDINARY, 'select * from api.admin_get_dashboard_stats()');
  expectDenied('disabled administrator cannot read Cloud Admin data', 'authenticated', DISABLED, 'select * from api.admin_get_dashboard_stats()');
  expectDenied('ordinary active user cannot execute moderation writes', 'authenticated', ORDINARY, `select * from api.admin_moderate_community_content('post','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','approve',null)`);
  expectDenied('disabled administrator cannot execute moderation writes', 'authenticated', DISABLED, `select * from api.admin_moderate_community_content('post','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','approve',null)`);
  expectDenied('authenticated users have no direct app.posts access', 'authenticated', PRIMARY, 'select count(*) from app.posts');
  check('browser roles have no direct DELETE privilege on canonical content tables', psql(`select (not has_table_privilege('authenticated','app.posts','DELETE') and not has_table_privilege('authenticated','app.comments','DELETE') and not has_table_privilege('anon','app.posts','DELETE'))::text`) === 'true');
  check('new SECURITY DEFINER RPCs use an empty search_path', Number(psql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('admin_get_managed_content_stats','admin_list_managed_content','admin_moderate_managed_content','admin_get_delete_impact','admin_permanently_delete_content') and p.prosecdef and p.proconfig @> array['search_path=""']::text[]`)) === 5);
  check('new RPCs are not executable by anon (including inherited Public grants)', Number(psql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('admin_get_managed_content_stats','admin_list_managed_content','admin_moderate_managed_content','admin_get_delete_impact','admin_permanently_delete_content') and has_function_privilege('anon',p.oid,'execute')`)) === 0);

  const primaryContext = jsonQuery('authenticated', PRIMARY, 'select * from api.admin_get_context()');
  check('primary administrator receives server admin context', primaryContext.user_id === PRIMARY && primaryContext.roles.includes('admin'));
  const secondaryContext = jsonQuery('authenticated', SECONDARY, 'select * from api.admin_get_context()');
  check('secondary administrator receives server admin context', secondaryContext.user_id === SECONDARY && secondaryContext.roles.includes('admin'));

  const stats = jsonQuery('authenticated', PRIMARY, 'select * from api.admin_get_dashboard_stats()');
  check('Dashboard counts only three Community posts', Number(stats.posts_total) === 3, JSON.stringify(stats));
  check('Dashboard excludes Building/Map posts', Number(stats.posts_published) === 1 && Number(stats.posts_pending) === 1 && Number(stats.posts_flagged) === 1, JSON.stringify(stats));
  check('Dashboard counts only Community comments', Number(stats.comments_total) === 2 && Number(stats.comments_published) === 1 && Number(stats.comments_flagged) === 1, JSON.stringify(stats));
  check('pending/flagged queue excludes Building/Map content', Number(stats.queue_total) === 3, JSON.stringify(stats));

  const contentScope = jsonQuery('authenticated', PRIMARY, `select count(*)::int as rows, bool_and(scope_type <> 'building') as community_only, max(total_count)::int as total from api.admin_list_community_content('all', false, null, 100, 0)`);
  check('content list returns all five Community post/comment records only', contentScope.rows === 5 && contentScope.total === 5 && contentScope.community_only === true, JSON.stringify(contentScope));
  const page = jsonQuery('authenticated', PRIMARY, `select count(*)::int as rows, min(total_count)::int as total from api.admin_list_community_content('all', false, null, 2, 2)`);
  check('content list applies server pagination', page.rows === 2 && page.total === 5, JSON.stringify(page));
  const filtered = jsonQuery('authenticated', PRIMARY, `select count(*)::int as rows, bool_and(moderation_status = 'flagged') as status_ok from api.admin_list_community_content('all', false, 'flagged', 100, 0)`);
  check('content list filters moderation status on the server', filtered.rows === 2 && filtered.status_ok === true, JSON.stringify(filtered));

  asRoleCommit('authenticated', PRIMARY, `select * from api.admin_moderate_community_content('post','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','approve',null)`);
  asRoleCommit('authenticated', SECONDARY, `select * from api.admin_moderate_community_content('comment','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','hide','Owner requested hide')`);
  asRoleCommit('authenticated', SECONDARY, `select * from api.admin_moderate_community_content('comment','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','restore',null)`);
  asRoleCommit('authenticated', PRIMARY, `select * from api.admin_moderate_community_content('post','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','reject','Confirmed policy violation')`);
  const statuses = psql(`select id::text || ':' || moderation_status::text from app.posts where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3') union all select id::text || ':' || moderation_status::text from app.comments where id='cccccccc-cccc-4ccc-8ccc-ccccccccccc1' order by 1`);
  check('Approve writes published status to Supabase', statuses.includes('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2:published'));
  check('Reject writes rejected status to Supabase', statuses.includes('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3:rejected'));
  check('Hide followed by Restore writes final published comment status', statuses.includes('cccccccc-cccc-4ccc-8ccc-ccccccccccc1:published'));
  const moderationAudit = JSON.parse(psql(`select row_to_json(result) from (select count(*)::int as rows, count(distinct target_id)::int as targets, bool_and(actor_user_id in ('${PRIMARY}'::uuid,'${SECONDARY}'::uuid)) as actors_ok from app.audit_events where event_type like 'admin_content_%') as result`));
  check('each committed moderation action has an atomic audit record', moderationAudit.rows === 4 && moderationAudit.targets === 3 && moderationAudit.actors_ok === true, JSON.stringify(moderationAudit));

  expectFailure('admin cannot moderate Building/Map content through Community RPC', 'authenticated', PRIMARY, `select * from api.admin_moderate_community_content('post','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','reject','Must remain out of scope')`, /Community content was not found/i);
  check('rejected Building/Map moderation attempt does not change content', psql(`select moderation_status::text from app.posts where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'`) === 'flagged');

  const managedStats = jsonQuery('authenticated', PRIMARY, 'select * from api.admin_get_managed_content_stats()');
  check('expanded Dashboard keeps Community and Building post totals separate', Number(managedStats.community_posts_total) === 3 && Number(managedStats.building_posts_total) === 2, JSON.stringify(managedStats));
  check('expanded Dashboard keeps Community and Building comment totals separate', Number(managedStats.community_comments_total) === 2 && Number(managedStats.building_comments_total) === 1, JSON.stringify(managedStats));
  check('Map Direct is an anchored Building subset and is not double-counted', Number(managedStats.map_direct_posts_total) === 1 && Number(managedStats.posts_total) === 5, JSON.stringify(managedStats));
  check('expanded Dashboard reports separate moderation queues', Number(managedStats.community_queue_total) === 1 && Number(managedStats.building_queue_total) === 2 && Number(managedStats.queue_total) === 3, JSON.stringify(managedStats));

  const buildingList = jsonQuery('authenticated', PRIMARY, `select count(*)::int as rows, max(total_count)::int as total, count(*) filter (where is_map_anchored)::int as anchored, bool_and(scope_group='building' and scope_type='building') as building_only from api.admin_list_managed_content('building','all',false,null,100,0)`);
  check('Building/Map list returns posts and comments without Community rows', buildingList.rows === 3 && buildingList.total === 3 && buildingList.building_only === true, JSON.stringify(buildingList));
  check('Building/Map list identifies anchored Map content', buildingList.anchored === 1, JSON.stringify(buildingList));
  const buildingPage = jsonQuery('authenticated', PRIMARY, `select count(*)::int as rows, min(total_count)::int as total from api.admin_list_managed_content('building','all',false,null,2,1)`);
  check('Building/Map list applies server pagination', buildingPage.rows === 2 && buildingPage.total === 3, JSON.stringify(buildingPage));
  const buildingFiltered = jsonQuery('authenticated', PRIMARY, `select count(*)::int as rows, bool_and(moderation_status='flagged') as status_ok from api.admin_list_managed_content('building','all',false,'flagged',100,0)`);
  check('Building/Map list applies server status filtering', buildingFiltered.rows === 1 && buildingFiltered.status_ok === true, JSON.stringify(buildingFiltered));

  asRoleCommit('authenticated', PRIMARY, `select * from api.admin_moderate_managed_content('building','post','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','approve',null)`);
  asRoleCommit('authenticated', SECONDARY, `select * from api.admin_moderate_managed_content('building','post','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','hide','Temporary exhibition review')`);
  asRoleCommit('authenticated', SECONDARY, `select * from api.admin_moderate_managed_content('building','post','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','restore',null)`);
  check('Building/Map Approve, Hide, and Restore write through the server RPC', psql(`select moderation_status::text from app.posts where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'`) === 'published');

  psql(`
    insert into app.posts (id,owner_user_id,post_type,scope_type,college_id,jurusan_id,building_id,content,category,display_author_mode,moderation_status) values
      ('33333333-3333-4333-8333-333333333331','${ORDINARY}','discussion','all_km',null,null,null,'Delete Community post with dependencies','academic','anonymous','published'),
      ('44444444-4444-4444-8444-444444444431','${ORDINARY}','discussion','building',1,null,'B_TEST','Delete anchored Building post with dependencies','campus_life','anonymous','published'),
      ('55555555-5555-4555-8555-555555555531','${ORDINARY}','discussion','building',1,null,'B_TEST','Photo Building post must fail closed','campus_life','anonymous','pending'),
      ('66666666-6666-4666-8666-666666666631','${ORDINARY}','discussion','jurusan',1,1,null,'Keep parent Community post','academic','anonymous','published');
    insert into app.comments (id,post_id,owner_user_id,parent_comment_id,content,display_author_mode,moderation_status) values
      ('33333333-3333-4333-8333-333333333341','33333333-3333-4333-8333-333333333331','${ORDINARY}',null,'Community root dependency','anonymous','published'),
      ('33333333-3333-4333-8333-333333333342','33333333-3333-4333-8333-333333333331','${ORDINARY}','33333333-3333-4333-8333-333333333341','Community reply dependency','anonymous','published'),
      ('44444444-4444-4444-8444-444444444441','44444444-4444-4444-8444-444444444431','${ORDINARY}',null,'Building root dependency','anonymous','published'),
      ('44444444-4444-4444-8444-444444444442','44444444-4444-4444-8444-444444444431','${ORDINARY}','44444444-4444-4444-8444-444444444441','Building reply dependency','anonymous','published'),
      ('66666666-6666-4666-8666-666666666641','66666666-6666-4666-8666-666666666631','${ORDINARY}',null,'Delete only this comment subtree','anonymous','published'),
      ('66666666-6666-4666-8666-666666666642','66666666-6666-4666-8666-666666666631','${ORDINARY}','66666666-6666-4666-8666-666666666641','Nested reply removed with parent comment','anonymous','published');
    insert into app.post_votes (post_id,user_id,value) values
      ('33333333-3333-4333-8333-333333333331','${ORDINARY}',1),
      ('44444444-4444-4444-8444-444444444431','${ORDINARY}',-1);
    insert into app.post_map_anchors (post_id,building_id,college_id,lat,lng)
      values ('44444444-4444-4444-8444-444444444431','B_TEST',1,6.2,100.2);
    insert into app.media_assets (id,owner_user_id,post_id,external_public_id,secure_url,status)
      values ('55555555-5555-4555-8555-555555555551','${ORDINARY}','55555555-5555-4555-8555-555555555531','echowall/test-photo','https://res.cloudinary.com/das8chiyz/image/upload/test-photo.jpg','attached');
  `);

  asRoleCommit('authenticated', PRIMARY, `select * from api.admin_moderate_managed_content('building','post','55555555-5555-4555-8555-555555555531','reject','Confirmed photo policy issue')`);
  check('Building/Map Reject writes through the server RPC', psql(`select moderation_status::text from app.posts where id='55555555-5555-4555-8555-555555555531'`) === 'rejected');

  const postImpact = jsonQuery('authenticated', PRIMARY, `select * from api.admin_get_delete_impact('building','post','44444444-4444-4444-8444-444444444431')`);
  check('delete confirmation impact reports comments, reply, vote, and Map anchor', Number(postImpact.comments_deleted) === 2 && Number(postImpact.replies_deleted) === 1 && Number(postImpact.votes_deleted) === 1 && Number(postImpact.map_anchors_deleted) === 1 && postImpact.delete_blocked === false, JSON.stringify(postImpact));
  const photoImpact = jsonQuery('authenticated', PRIMARY, `select * from api.admin_get_delete_impact('building','post','55555555-5555-4555-8555-555555555531')`);
  check('photo-post impact fails closed when Cloudinary deletion is unavailable', Number(photoImpact.media_records) === 1 && photoImpact.delete_blocked === true && /Cloudinary/i.test(photoImpact.block_reason), JSON.stringify(photoImpact));

  expectDenied('anon cannot execute permanent delete RPC', 'anon', null, `select * from api.admin_permanently_delete_content('community','post','33333333-3333-4333-8333-333333333331','Unauthorized deletion')`);
  expectDenied('ordinary user cannot execute permanent delete RPC', 'authenticated', ORDINARY, `select * from api.admin_permanently_delete_content('community','post','33333333-3333-4333-8333-333333333331','Unauthorized deletion')`);
  expectDenied('disabled administrator cannot execute permanent delete RPC', 'authenticated', DISABLED, `select * from api.admin_permanently_delete_content('community','post','33333333-3333-4333-8333-333333333331','Unauthorized deletion')`);
  expectFailure('scope guard prevents Community endpoint semantics from deleting Building content', 'authenticated', PRIMARY, `select * from api.admin_permanently_delete_content('community','post','44444444-4444-4444-8444-444444444431','Wrong scope must fail')`, /requested scope/i);
  expectFailure('short deletion reason rolls the whole operation back', 'authenticated', PRIMARY, `select * from api.admin_permanently_delete_content('community','post','33333333-3333-4333-8333-333333333331','no')`, /at least 5 characters/i);
  check('failed deletion leaves target and dependencies intact', Number(psql(`select count(*) from app.posts where id='33333333-3333-4333-8333-333333333331'`)) === 1 && Number(psql(`select count(*) from app.comments where post_id='33333333-3333-4333-8333-333333333331'`)) === 2);
  expectFailure('photo-post permanent delete is blocked transactionally', 'authenticated', PRIMARY, `select * from api.admin_permanently_delete_content('building','post','55555555-5555-4555-8555-555555555531','Remove photo post permanently')`, /Cloudinary media cannot be removed transactionally/i);
  check('blocked photo deletion preserves both post and media metadata', Number(psql(`select count(*) from app.posts where id='55555555-5555-4555-8555-555555555531'`)) === 1 && Number(psql(`select count(*) from app.media_assets where post_id='55555555-5555-4555-8555-555555555531' and status='attached'`)) === 1);

  asRoleCommit('authenticated', PRIMARY, `select * from api.admin_permanently_delete_content('community','post','33333333-3333-4333-8333-333333333331','Confirmed Community removal')`);
  check('Community post deletion removes the canonical post', Number(psql(`select count(*) from app.posts where id='33333333-3333-4333-8333-333333333331'`)) === 0);
  check('Community post deletion cascades comments, replies, and votes', Number(psql(`select count(*) from app.comments where post_id='33333333-3333-4333-8333-333333333331'`)) === 0 && Number(psql(`select count(*) from app.post_votes where post_id='33333333-3333-4333-8333-333333333331'`)) === 0);

  asRoleCommit('authenticated', SECONDARY, `select * from api.admin_permanently_delete_content('building','post','44444444-4444-4444-8444-444444444431','Confirmed Building removal')`);
  check('Building/Map post deletion removes post, comments, votes, and anchor', Number(psql(`select count(*) from app.posts where id='44444444-4444-4444-8444-444444444431'`)) === 0 && Number(psql(`select count(*) from app.comments where post_id='44444444-4444-4444-8444-444444444431'`)) === 0 && Number(psql(`select count(*) from app.post_votes where post_id='44444444-4444-4444-8444-444444444431'`)) === 0 && Number(psql(`select count(*) from app.post_map_anchors where post_id='44444444-4444-4444-8444-444444444431'`)) === 0);

  asRoleCommit('authenticated', PRIMARY, `select * from api.admin_permanently_delete_content('community','comment','66666666-6666-4666-8666-666666666641','Remove comment thread')`);
  check('comment deletion removes the selected comment and its reply only', Number(psql(`select count(*) from app.comments where id in ('66666666-6666-4666-8666-666666666641','66666666-6666-4666-8666-666666666642')`)) === 0 && Number(psql(`select count(*) from app.posts where id='66666666-6666-4666-8666-666666666631'`)) === 1);

  const deleteAudit = JSON.parse(psql(`select row_to_json(result) from (select count(*)::int as rows, count(distinct actor_user_id)::int as actors, bool_and((metadata->>'reason') is not null) as reasons_ok, sum((metadata->>'comments_deleted')::int)::int as dependent_comments from app.audit_events where event_type='admin_content_permanently_deleted') as result`));
  check('successful permanent deletes retain server audit records with actors, reasons, and dependency counts', deleteAudit.rows === 3 && deleteAudit.actors === 2 && deleteAudit.reasons_ok === true && deleteAudit.dependent_comments === 5, JSON.stringify(deleteAudit));
  check('failed delete attempts never create success audit records', Number(psql(`select count(*) from app.audit_events where event_type='admin_content_permanently_deleted' and target_id='55555555-5555-4555-8555-555555555531'`)) === 0);
  check('static Building registry data is not a deletable content target', Number(psql(`select count(*) from app.building_scope_keys where building_id='B_TEST'`)) === 1);
  check('successful public deletions emit cache invalidation signals', Number(psql(`select count(*) from app.realtime_events where post_id in ('33333333-3333-4333-8333-333333333331','44444444-4444-4444-8444-444444444431','66666666-6666-4666-8666-666666666631')`)) >= 3);

  const refreshedStats = jsonQuery('authenticated', PRIMARY, 'select * from api.admin_get_managed_content_stats()');
  check('Dashboard statistics refresh from surviving database rows after delete', Number(refreshedStats.posts_total) === 7 && Number(refreshedStats.comments_total) === 3, JSON.stringify(refreshedStats));

  console.log(`Cloud Admin isolated SQL verification: ${passed}/${passed} checks passed.`);
}

try {
  main();
} catch (error) {
  console.error(`FAIL - ${error.message}`);
  process.exitCode = 1;
}
