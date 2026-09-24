#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = 'supabase/migrations/20260923162032_production_cloud_admin_phase1a_read_only.sql';
const migration = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8');
const MANAGEMENT_MIGRATION = 'supabase/migrations/20260923165320_production_cloud_admin_content_management.sql';
const managementMigration = fs.readFileSync(path.join(ROOT, MANAGEMENT_MIGRATION), 'utf8');
const EXPANSION_MIGRATION = 'supabase/migrations/20260923234640_cloud_admin_map_building_delete.sql';
const expansionMigration = fs.readFileSync(path.join(ROOT, EXPANSION_MIGRATION), 'utf8');
const serviceSource = fs.readFileSync(path.join(ROOT, 'services/cloud-admin-service.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(ROOT, 'app-admin.js'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(ROOT, 'app-admin-dashboard.js'), 'utf8');
const repositorySource = fs.readFileSync(path.join(ROOT, 'services/community-supabase-repositories.js'), 'utf8');
const providerSource = fs.readFileSync(path.join(ROOT, 'services/community-data-provider.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(label, condition) {
  if (condition) pass += 1;
  else { fail += 1; failures.push(label); console.error(`FAIL: ${label}`); }
}

function loadService(rpc) {
  const listeners = new Map();
  const invalidations = [];
  let identity = { id: '11111111-1111-4111-8111-111111111111', authIdentityVerified: true };
  const sandbox = {
    console,
    Promise,
    Error,
    Object,
    Array,
    Number,
    String,
    CommunityDataProvider: { isRemoteRequested: () => true, invalidateDeletedContent: result => invalidations.push(result) },
    SupabaseAuthProvider: {
      getCurrentUser: () => identity,
    },
    CommunitySupabaseClient: { getClient: async () => ({ rpc }) },
    addEventListener: (name, handler) => listeners.set(name, handler),
    dispatchEvent: () => {},
  };
  sandbox.window = sandbox;
  vm.runInContext(serviceSource, vm.createContext(sandbox), { filename: 'services/cloud-admin-service.js' });
  sandbox.__setIdentity = nextIdentity => { identity = nextIdentity; };
  sandbox.__dispatchAuthChange = () => listeners.get('echo:communityauthchange')?.();
  sandbox.__invalidations = invalidations;
  return sandbox;
}

async function run() {
  check('migration uses auth.uid()', /auth\.uid\(\)/.test(migration));
  check('migration reuses active-user verification', /private\.require_active_user\(\)/.test(migration));
  check('migration checks protected active roles', /private\.has_active_role/.test(migration) && /app\.app_role/.test(migration));
  check('migration creates protected context RPC', /function api\.admin_get_context\(\)/.test(migration));
  check('migration creates protected stats RPC', /function api\.admin_get_dashboard_stats\(\)/.test(migration));
  check('migration creates protected content RPC', /function api\.admin_list_community_content\(/.test(migration));
  check('all exposed RPCs are security definer', (migration.match(/security definer/g) || []).length === 4);
  check('all security-definer functions use empty search_path', (migration.match(/set search_path = ''/g) || []).length === 4);
  check('private guard is not executable by authenticated users', /revoke all on function private\.require_cloud_admin_reader\(\) from public, anon, authenticated/.test(migration));
  check('context RPC grants authenticated only', /grant execute on function api\.admin_get_context\(\) to authenticated/.test(migration));
  check('stats RPC grants authenticated only', /grant execute on function api\.admin_get_dashboard_stats\(\) to authenticated/.test(migration));
  check('content RPC grants authenticated only', /grant execute on function api\.admin_list_community_content\(text, boolean, text, integer, integer\) to authenticated/.test(migration));
  check('anonymous/Public execute revoked', (migration.match(/revoke all on function api\./g) || []).length === 3 && (migration.match(/from public, anon/g) || []).length === 4);
  check('Community scope excludes building/Map data', /'all_km'::app\.scope_type[\s\S]*'college'::app\.scope_type[\s\S]*'jurusan'::app\.scope_type/.test(migration) && !/'building'::app\.scope_type/.test(migration));
  check('queue is pending/flagged only', /r\.moderation_status in \('pending', 'flagged'\)/.test(migration));
  check('migration contains no role assignment DML', !/^\s*(insert|update|delete)\s/mi.test(migration));
  check('migration contains no direct core-table grants', !/grant\s+(select|insert|update|delete|all)\s+on\s+(table\s+)?app\./i.test(migration));
  check('management migration verifies both immutable Auth UUID and email pairs', /7beb9f0e-76c5-4c6a-b6b4-06e708bf3644/.test(managementMigration) && /greencucumbertube@gmail\.com/.test(managementMigration) && /6a6d8ff7-7322-4643-84ef-aee2b5f6534e/.test(managementMigration) && /mzteoh88@gmail\.com/.test(managementMigration));
  check('secondary admin is assigned by the verified primary administrator', /values \(v_secondary, 'admin'::app\.app_role, v_primary\)/.test(managementMigration));
  check('bootstrap and role grant append audit events', /admin_role_bootstrap/.test(managementMigration) && /admin_role_grant/.test(managementMigration));
  check('migration audit rows do not impersonate an interactive administrator', (managementMigration.match(/null,\s*\n\s*'admin_role_(?:bootstrap|grant)'/g) || []).length === 2 && /'event_executor', 'owner-approved production migration'/.test(managementMigration));
  check('management migration creates admin-only writer guard', /function private\.require_cloud_admin_writer\(\)/.test(managementMigration) && /array\['admin'::app\.app_role\]/.test(managementMigration));
  check('management migration creates atomic moderation RPC', /function api\.admin_moderate_community_content\(/.test(managementMigration) && /update app\.(posts|comments)/.test(managementMigration) && /insert into app\.audit_events/.test(managementMigration));
  check('management RPC excludes Building and Map content', /p\.scope_type in \([\s\S]*'all_km'::app\.scope_type[\s\S]*'jurusan'::app\.scope_type/.test(managementMigration) && !/'building'::app\.scope_type/.test(managementMigration));
  check('management RPC grants no direct app table access', !/grant\s+(select|insert|update|delete|all)\s+on\s+(table\s+)?app\./i.test(managementMigration));
  check('management RPC revokes anonymous and Public execution', /revoke all on function api\.admin_moderate_community_content\(text, uuid, text, text\) from public, anon/.test(managementMigration));
  check('expansion creates combined stats and paginated managed-content RPCs', /function api\.admin_get_managed_content_stats\(\)/.test(expansionMigration) && /function api\.admin_list_managed_content\(/.test(expansionMigration));
  check('expansion identifies Map Direct as an anchored Building subset', /is_map_anchored/.test(expansionMigration) && /app\.post_map_anchors/.test(expansionMigration));
  check('expansion creates server-authorized Building moderation', /function api\.admin_moderate_managed_content\(/.test(expansionMigration) && /private\.require_cloud_admin_writer\(\)/.test(expansionMigration));
  check('expansion creates impact preview and permanent delete RPCs', /function api\.admin_get_delete_impact\(/.test(expansionMigration) && /function api\.admin_permanently_delete_content\(/.test(expansionMigration));
  check('permanent delete returns the parent post identity for narrow cache invalidation', /returns table \([\s\S]*content_id uuid,\s*post_id uuid,[\s\S]*admin_content_permanently_deleted/.test(expansionMigration));
  check('permanent delete locks targets and dependencies', /for update/.test(expansionMigration) && /from app\.comments[\s\S]*for update/.test(expansionMigration));
  check('permanent delete appends a surviving atomic audit event', /admin_content_permanently_deleted/.test(expansionMigration) && /insert into app\.audit_events/.test(expansionMigration));
  check('active Cloudinary media blocks permanent delete', /status <> 'deleted'::app\.media_status/.test(expansionMigration) && /Cloudinary media cannot be removed transactionally/.test(expansionMigration));
  check('expansion grants no direct core-table access', !/grant\s+(select|insert|update|delete|all)\s+on\s+(table\s+)?app\./i.test(expansionMigration));
  check('expansion revokes Public, anon, and authenticated defaults before explicit grants', (expansionMigration.match(/revoke all on function api\./g) || []).length === 5 && (expansionMigration.match(/from public, anon, authenticated/g) || []).length === 5);
  check('every expansion RPC uses empty search_path', (expansionMigration.match(/set search_path = ''/g) || []).length === 5);
  check('frontend contains no service_role key', !/service_role/i.test(serviceSource));
  check('cloud service has no browser-storage fallback', !/\b(?:localStorage|sessionStorage|indexedDB)\s*[.[]/i.test(serviceSource));
  check('Cloud Admin script loads before Admin application', indexSource.indexOf('services/cloud-admin-service.js') > 0 && indexSource.indexOf('services/cloud-admin-service.js') < indexSource.indexOf('app-admin.js'));
  check('production Admin gates through CloudAdminService', /CloudAdminService\.load/.test(adminSource) && /renderAdminCloudLoadState/.test(adminSource));
  check('production cloud views avoid prototype renderers', /renderAdminCloudOverview/.test(adminSource) && /renderAdminCloudQueue/.test(adminSource) && /renderAdminCloudCommunity/.test(adminSource) && /renderAdminCloudMap/.test(adminSource));
  check('production cloud UI exposes server-backed moderation actions', /adminCloudModerate/.test(adminSource) && /Approve/.test(dashboardSource) && /Restore/.test(dashboardSource));
  check('production cloud UI exposes reasoned two-step permanent delete', /adminCloudRequestDelete/.test(adminSource) && /adminConfirmPermanentDelete/.test(adminSource) && /Restore cannot recover/.test(adminSource));
  check('production cloud UI exposes status filters and pagination', /All statuses/.test(dashboardSource) && /adminCloudContentPage/.test(dashboardSource));
  check('cloud UI has explicit loading state', /Loading Cloud Admin/.test(dashboardSource));
  check('cloud UI has explicit error state', /Cloud Admin unavailable/.test(dashboardSource));
  check('cloud UI has explicit empty states', /Queue is empty/.test(dashboardSource) && /No \$\{isBuilding/.test(dashboardSource));
  check('public providers expose narrow post/comment cache invalidation', /function invalidateDeletedContent/.test(repositorySource) && /invalidateDeletedContent: result => repository\(\)\.invalidateDeletedContent/.test(providerSource));

  const calls = [];
  const success = loadService(async (name, params) => {
    calls.push([name, params]);
    if (name === 'admin_get_context') return { data: [{ user_id: '11111111-1111-4111-8111-111111111111', roles: ['admin'] }], error: null };
    if (name === 'admin_get_managed_content_stats') return { data: [{ community_posts_total: 5, community_comments_total: 2, community_posts_published: 4, community_posts_pending: 1, community_queue_total: 1, building_posts_total: 2, building_comments_total: 0, building_posts_published: 1, building_posts_flagged: 1, building_queue_total: 1, map_direct_posts_total: 1, posts_total: 7, comments_total: 2, queue_total: 2 }], error: null };
    if (name === 'admin_moderate_managed_content') return { data: [{ content_type: params.p_content_type, content_id: params.p_content_id, scope_group: params.p_scope_group, previous_status: 'flagged', new_status: 'published', audit_event_id: 10 }], error: null };
    if (name === 'admin_get_delete_impact') return { data: [{ content_type: params.p_content_type, content_id: params.p_content_id, post_id: params.p_content_id, scope_group: params.p_scope_group, scope_type: params.p_scope_group === 'building' ? 'building' : 'all_km', building_id: params.p_scope_group === 'building' ? 'B_TEST' : null, content_excerpt: 'Delete preview', comments_deleted: 2, replies_deleted: 1, votes_deleted: 1, map_anchors_deleted: 0, media_records: 0, delete_blocked: false }], error: null };
    if (name === 'admin_permanently_delete_content') return { data: [{ content_type: params.p_content_type, content_id: params.p_content_id, post_id: params.p_content_id, scope_group: params.p_scope_group, comments_deleted: 2, replies_deleted: 1, audit_event_id: 11 }], error: null };
    const queue = params.p_queue_only === true;
    if (params.p_status === 'hidden') return { data: [{ content_type: 'comment', content_id: 'c1', post_id: 'p1', scope_group: params.p_scope_group, moderation_status: 'hidden', content: 'Hidden comment', total_count: 30 }], error: null };
    return { data: queue ? [{ content_type: 'post', content_id: 'p2', post_id: 'p2', scope_group: 'building', scope_type: 'building', building_id: 'B_TEST', is_map_anchored: true, moderation_status: 'flagged', content: 'Review me', total_count: 1 }] : [{ content_type: 'post', content_id: 'p1', post_id: 'p1', scope_group: params.p_scope_group, moderation_status: 'published', content: 'Cloud post', total_count: 9 }], error: null };
  });
  const loaded = await success.CloudAdminService.load();
  check('service loads authorized context first', calls[0][0] === 'admin_get_context');
  check('service invokes exactly four read-only RPC calls', calls.length === 4);
  check('service maps real cloud statistics', loaded.status === 'ready' && loaded.stats.postsTotal === 7 && loaded.stats.commentsTotal === 2 && loaded.stats.building.postsTotal === 2);
  check('service maps Community content', loaded.content.length === 1 && loaded.content[0].content === 'Cloud post');
  check('service maps pending/flagged queue separately', loaded.queue.length === 1 && loaded.queue[0].moderationStatus === 'flagged');
  check('service retains server role context', loaded.context.roles[0] === 'admin');
  check('initial content page is bounded to 25 records', calls.find(([name, params]) => name === 'admin_list_managed_content' && params.p_queue_only === false)?.[1].p_limit === 25);
  check('combined queue requests both Community and Building content', calls.find(([name, params]) => name === 'admin_list_managed_content' && params.p_queue_only === true)?.[1].p_scope_group === 'all');
  const callsAfterInitialLoad = calls.length;
  const refreshed = await success.CloudAdminService.load();
  check('same verified session reuses authoritative loaded state on refresh', refreshed.status === 'ready' && calls.length === callsAfterInitialLoad);

  const paged = await success.CloudAdminService.loadContent({ scopeGroup: 'building', contentType: 'comment', status: 'hidden', page: 1 });
  const pageCall = calls.findLast(([name, params]) => name === 'admin_list_managed_content' && params?.p_status === 'hidden');
  check('service requests filtered content from the server', pageCall?.[1].p_scope_group === 'building' && pageCall?.[1].p_content_type === 'comment' && pageCall?.[1].p_status === 'hidden');
  check('service sends correct pagination offset', pageCall?.[1].p_limit === 25 && pageCall?.[1].p_offset === 25);
  check('service retains filtered total count', paged.contentTotal === 30 && paged.contentQuery.page === 1);

  const mutation = await success.CloudAdminService.moderate({ scopeGroup: 'building', contentType: 'post', contentId: 'p2', action: 'approve' });
  check('service invokes the server moderation RPC', calls.some(([name, params]) => name === 'admin_moderate_managed_content' && params.p_scope_group === 'building' && params.p_action === 'approve'));
  check('successful moderation returns the committed server result', mutation.new_status === 'published' && mutation.audit_event_id === 10);
  check('successful moderation refreshes authoritative cloud state', success.CloudAdminService.getState().status === 'ready' && success.CloudAdminService.getState().contentQuery.page === 0);

  const impact = await success.CloudAdminService.loadDeleteImpact({ scopeGroup: 'building', contentType: 'post', contentId: 'p2' });
  check('service maps server deletion impact before confirmation', impact.scopeGroup === 'building' && impact.commentsDeleted === 2 && impact.deleteBlocked === false);
  const deleted = await success.CloudAdminService.permanentlyDelete({ scopeGroup: 'building', contentType: 'post', contentId: 'p2', reason: 'Confirmed removal' });
  check('service invokes permanent delete only through the protected RPC', calls.some(([name, params]) => name === 'admin_permanently_delete_content' && params.p_reason === 'Confirmed removal'));
  check('successful permanent delete returns server audit result and refreshes data', deleted.audit_event_id === 11 && success.CloudAdminService.getState().status === 'ready');
  check('successful permanent delete invalidates only the returned canonical content cache key', success.__invalidations.length === 1 && success.__invalidations[0].post_id === 'p2');

  success.__setIdentity({ id: '33333333-3333-4333-8333-333333333333', authIdentityVerified: true });
  success.__dispatchAuthChange();
  check('account switch immediately clears previous administrator state', success.CloudAdminService.getState().status === 'idle' && success.CloudAdminService.getState().identityId === '');

  const unverified = loadService(async () => ({ data: [], error: null }));
  unverified.__setIdentity({ id: '11111111-1111-4111-8111-111111111111', authIdentityVerified: false });
  await unverified.CloudAdminService.load().catch(() => {});
  check('unverified cached identity cannot open Cloud Admin', unverified.CloudAdminService.getState().error?.code === 'CLOUD_ADMIN_IDENTITY_UNVERIFIED');

  let fallbackTouched = false;
  const failed = loadService(async name => {
    if (name === 'admin_get_context') return { data: [{ user_id: '11111111-1111-4111-8111-111111111111', roles: ['admin'] }], error: null };
    if (name === 'admin_get_managed_content_stats') return { data: null, error: { code: '57014', message: 'timeout' } };
    if (name === 'admin_list_managed_content') return { data: [], error: null };
    fallbackTouched = true;
    return { data: null, error: { code: 'UNEXPECTED_PROVIDER' } };
  });
  await failed.CloudAdminService.load().catch(() => {});
  check('cloud query failure becomes explicit error state', failed.CloudAdminService.getState().status === 'error');
  check('cloud failure never invokes a local fallback', fallbackTouched === false);

  console.log(`Cloud Admin: ${pass}/${pass + fail} checks passed.`);
  if (failures.length) {
    console.error(failures.map(label => ` - ${label}`).join('\n'));
    process.exitCode = 1;
  }
}

await run();
