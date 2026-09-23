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

  psql(`drop schema if exists api cascade; drop schema if exists app cascade; drop schema if exists private cascade; delete from auth.users where id in ('${PRIMARY}','${SECONDARY}','${ORDINARY}','${DISABLED}')`);
  psqlFile('/tmp/echowall-admin-test/fixture.sql');
  psqlFile('/tmp/echowall-admin-test/read.sql');
  psqlFile('/tmp/echowall-admin-test/manage.sql');
  pass('both production migration files execute successfully');

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

  console.log(`Cloud Admin isolated SQL verification: ${passed}/${passed} checks passed.`);
}

try {
  main();
} catch (error) {
  console.error(`FAIL - ${error.message}`);
  process.exitCode = 1;
}
