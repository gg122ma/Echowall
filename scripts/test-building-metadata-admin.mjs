import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => fs.readFileSync(root + file, 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
let count = 0;
async function test(name, fn) { await fn(); count++; console.log(`PASS ${name}`); }
function fixture() {
  const calls = [];
  const setup = { row: null, error: null, session: { access_token: 'mock', user: { id: 'mock-user' } }, saved: null };
  const client = {
    auth: { getSession: async () => ({ data: { session: setup.session } }) },
    from(table) { calls.push({ table }); return { select(columns) { calls.push({ columns }); return { eq(key, id) { calls.push({ key, id }); return { maybeSingle: async () => ({ data: setup.row, error: setup.error }) }; } }; } }; },
    async rpc(name, args) { calls.push({ name, args }); if (setup.wait) await setup.wait; return { data: setup.saved || [{ ...argsToRow(args), updated_at: '2026-09-07T01:00:00.123456+00:00' }], error: setup.error }; },
  };
  const context = vm.createContext({ console, window: { CommunitySupabaseClient: { getClient: async () => client, getActivationState: () => ({ mode: 'supabase-staging' }) } } });
  for (const file of ['data/campus-buildings.js', 'services/building-metadata-provider.js', 'services/building-metadata-admin.js']) vm.runInContext(read(file), context);
  const api = context.window.BuildingMetadataAdmin;
  return { setup, calls, context, api, editor: api.createEditor() };
}
function argsToRow(args) { return Object.fromEntries(Object.entries(args).filter(([k]) => k !== 'p_expected_updated_at').map(([k,v]) => [k.slice(2), v])); }
const row = () => ({ building_id: 'B_PUSTAKA', description: { en: 'Backend only' }, purpose: null, special_notes: null, localized_alias: null, hours: null, updated_at: '2026-09-05T12:00:00.123456+00:00' });
await test('raw override row loading and precise sanitized columns', async () => {
  const f = fixture(); f.setup.row = { ...row(), updated_by: 'private', college_id: 1 }; await f.editor.load('B_PUSTAKA');
  assert.deepEqual(plain(f.editor.state.raw), row()); assert.equal(f.calls[1].columns, 'building_id,description,purpose,special_notes,localized_alias,hours,updated_at');
});
await test('missing row is loaded successfully, not a read error', async () => { const f=fixture(); assert.equal(await f.editor.load('B_PUSTAKA'), true); assert.equal(f.editor.state.raw, null); });
await test('first create sends null expected timestamp and all five fields', async () => {
  const f=fixture(); await f.editor.load('B_PUSTAKA'); f.editor.state.draft.description={en:'New'}; await f.editor.save();
  const args=f.calls.find(c=>c.name).args; assert.equal(args.p_expected_updated_at,null); assert.equal(Object.keys(args).length,7); assert.equal(args.p_purpose,null);
});
await test('existing timestamp round-trip retains microseconds', async () => { const f=fixture(); f.setup.row=row(); await f.editor.load('B_PUSTAKA'); await f.editor.save(); assert.equal(f.calls.find(c=>c.name).args.p_expected_updated_at,row().updated_at); });
await test('full-row serialization retains all unedited raw overrides', () => { const f=fixture(); const draft={description:{en:'a'},purpose:{ms:'b'},special_notes:{zh:'c'},localized_alias:{en:'d'},hours:{mode:'24h'}}; const args=f.api.serialize('B_PUSTAKA',draft,row()); assert.deepEqual(plain(argsToRow(args)),{building_id:'B_PUSTAKA',...draft}); });
await test('null means fallback, never copies static text or hours', async () => { const f=fixture(); await f.editor.load('B_PUSTAKA'); const args=f.api.serialize('B_PUSTAKA',f.editor.state.draft,null); for(const field of ['description','purpose','special_notes','localized_alias','hours']) assert.equal(args['p_'+field],null); assert.ok(f.context.window.getCampusBuilding('B_PUSTAKA').description.en); });
for(const field of ['description','purpose','special_notes','localized_alias']) {
  await test(`${field} whole localized object, absent keys and empty strings round-trip`, () => { const f=fixture(); const draft=f.api.draftFromRow(null); draft[field]={ms:'',zh:'文字'}; assert.deepEqual(plain(f.api.serialize('B_PUSTAKA',draft,null)['p_'+field]),draft[field]); });
  await test(`${field} rejects excess length and unsupported language`, () => { const f=fixture(); const draft=f.api.draftFromRow(null); draft[field]={en:'x'.repeat(f.api.limits[field]+1)}; assert.throws(()=>f.api.serialize('B_PUSTAKA',draft,null),{code:'22023'}); draft[field]={fr:'no'}; assert.throws(()=>f.api.serialize('B_PUSTAKA',draft,null),{code:'22023'}); });
}
for(const mode of ['24h','unavailable']) await test(`hours ${mode} and optional residentsOnly`, () => { const f=fixture(); const d=f.api.draftFromRow(null); d.hours={mode,residentsOnly:false,open_now:true,is_open:true}; assert.deepEqual(plain(f.api.serialize('B_PUSTAKA',d,null).p_hours),{mode,residentsOnly:false}); });
await test('weekly seven days, closed day, residentsOnly and no derived fields', () => { const f=fixture(); const d=f.api.draftFromRow(null); d.hours={mode:'weekly',residentsOnly:true,days:Object.fromEntries(Array.from({length:7},(_,i)=>[i,i===6?{closed:true}:{open:'08:00',close:'17:00'}]))}; assert.deepEqual(plain(f.api.serialize('B_PUSTAKA',d,null).p_hours),d.hours); });
await test('weekly invalid time, overnight and missing day rejected', () => { const f=fixture(); for(const days of [{},Object.fromEntries(Array.from({length:7},(_,i)=>[i,{open:'22:00',close:'08:00'}])),Object.fromEntries(Array.from({length:7},(_,i)=>[i,{open:'8:00',close:'17:00'}]))]) { const d=f.api.draftFromRow(null); d.hours={mode:'weekly',days}; assert.throws(()=>f.api.serialize('B_PUSTAKA',d,null),{code:'22023'}); } });
for(const code of ['40001','42501','22023','23503']) await test(`${code} deliberate handling preserves draft and raw state`,async()=>{const f=fixture();f.setup.row=row();await f.editor.load('B_PUSTAKA');f.editor.state.draft.description={en:'Unsaved'};f.setup.error={code,message:'sensitive internals'};assert.equal(await f.editor.save(),false);assert.equal(f.editor.state.draft.description.en,'Unsaved');assert.equal(f.editor.state.raw.updated_at,row().updated_at);assert.equal(f.editor.state.message,f.api.errorMessage({code}));assert.equal(f.editor.state.conflict,code==='40001');});
await test('conflict blocks retries; explicit reload preserves draft for comparison',async()=>{const f=fixture();await f.editor.load('B_PUSTAKA');f.editor.state.draft.description={en:'Unsaved'};f.setup.error={code:'40001'};await f.editor.save();await f.editor.save();assert.equal(f.calls.filter(c=>c.name).length,1);f.setup.error=null;f.setup.row=row();await f.editor.load('B_PUSTAKA',true);assert.equal(f.editor.state.previousDraft.description.en,'Unsaved');assert.equal(f.editor.state.draft.description.en,'Backend only');assert.equal(f.editor.state.conflict,false);});
await test('unauthenticated save blocked even after authenticated load',async()=>{const f=fixture();await f.editor.load('B_PUSTAKA');f.setup.session=null;assert.equal(await f.editor.save(),false);assert.equal(f.calls.filter(c=>c.name).length,0);assert.equal(f.editor.state.message,f.api.errorMessage({code:'AUTH_REQUIRED'}));});
await test('anonymous Supabase user cannot edit',async()=>{const f=fixture();f.setup.session.user.is_anonymous=true;assert.equal(await f.editor.load('B_PUSTAKA'),false);assert.equal(f.calls.length,0);});
await test('successful returned row replaces raw state and refreshes effective provider',async()=>{const f=fixture();await f.editor.load('B_PUSTAKA');f.setup.saved=[{...row(),updated_by:'never expose'}];await f.editor.save();assert.deepEqual(plain(f.editor.state.raw),row());assert.equal(f.context.window.BuildingMetadataProvider.getEffectiveBuilding('B_PUSTAKA').description.en,'Backend only');assert.equal(JSON.stringify(f.editor.state).includes('updated_by'),false);});
await test('failed read is not interpreted as missing row and does not clear edits',async()=>{const f=fixture();await f.editor.load('B_PUSTAKA');f.editor.state.draft.description={en:'Keep'};f.setup.error={message:'offline'};await f.editor.load('B_MASJID');assert.equal(f.editor.state.buildingId,'B_PUSTAKA');assert.equal(f.editor.state.draft.description.en,'Keep');const g=fixture();g.setup.error={message:'offline'};await g.editor.load('B_PUSTAKA');assert.equal(g.editor.state.loaded,false);await g.editor.save();assert.equal(g.calls.filter(c=>c.name).length,0);});
await test('double save and building load while saving are blocked, no early success',async()=>{const f=fixture();await f.editor.load('B_PUSTAKA');let resolve;f.setup.wait=new Promise(r=>resolve=r);const pending=f.editor.save();assert.equal(f.editor.state.message,'Saving…');assert.equal(await f.editor.save(),false);assert.equal(await f.editor.load('B_MASJID'),false);resolve();await pending;assert.equal(f.calls.filter(c=>c.name).length,1);});
await test('canonical Building registry supplies selector without duplication',()=>{const f=fixture();const buildings=f.api.listBuildings();assert.equal(buildings.length,32);assert.deepEqual(plain(buildings),plain(f.context.window.CAMPUS_BUILDINGS.map(({id,name})=>({id,name}))));});
await test('Admin entry uses dedicated existing route without changing prototype permissions',()=>{assert.ok(read('app-admin.js').includes('"#/admin/buildings"'));assert.ok(read('services/auth-ui.js').includes('href="#/admin/buildings"'));assert.ok(!read('services/building-metadata-admin.js').includes('AdminPermissionService'));});
await test('runtime build and page include both new modules',()=>{for(const file of ['services/building-metadata-admin.js','app-admin-buildings.js']){assert.ok(read('index.html').includes(file));assert.ok(read('scripts/build-pages.mjs').includes(file));}});
await test('a pending public preload cannot overwrite the successful saved row', async () => {
  const f=fixture(); let finish, started;
  const ready=new Promise(resolve=>{started=resolve;});
  f.context.window.CommunitySupabaseClient.getClient=async()=>({from:()=>({select:()=>new Promise(resolve=>{finish=resolve;started();})})});
  const provider=f.context.window.BuildingMetadataProvider;
  const pending=provider.preload(); await ready;
  provider.acceptSavedRow(row()); finish({data:[{...row(),description:{en:'Old'}}],error:null}); await pending;
  assert.equal(provider.getEffectiveBuilding('B_PUSTAKA').description.en,'Backend only');
});
function rendererFixture() {
  const f=fixture(); const listeners={}; const elements={};
  const element=selector=>elements[selector] ||= {value:'',focus(){},addEventListener(name,fn){this[name]=fn;}};
  const form={querySelector:element};
  const container={innerHTML:'',querySelector:selector=>selector==='[data-building-form]'?form:element(selector)};
  Object.assign(f.context,{BuildingMetadataAdmin:f.api,escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')});
  Object.assign(f.context.window,{location:{hash:'#/admin/buildings'},SupabaseAuthProvider:{getCurrentUser:()=>({id:'mock-user'})},addEventListener:(name,fn)=>{listeners[name]=fn;}});
  vm.runInContext(read('app-admin-buildings.js'),f.context);
  f.context.window.renderAdminBuildings(container);
  const change=(dataset,value,checked=false)=>form.onchange({target:{dataset,value,checked,hasAttribute:name=>Object.hasOwn(dataset,name.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase())),getAttribute:name=>dataset[name.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]}});
  return {...f,container,form,element,change,listeners};
}
await test('renderer loads raw state, renders escaped text and sends full form edits',async()=>{
  const f=rendererFixture();f.setup.row=row();f.setup.row.description={en:'</textarea><script>bad()</script>'};
  f.element('[data-building-select]').value='B_PUSTAKA';await f.element('[data-load]').onclick();
  assert.ok(f.container.innerHTML.includes('&lt;/textarea&gt;'));assert.ok(!f.container.innerHTML.includes('<script>bad'));
  f.change({source:'purpose'},'override');f.change({language:'purpose:ms'},'',true);
  f.form.oninput({target:{dataset:{text:'purpose:ms'},value:'Tujuan'}});
  await f.form.onsubmit({preventDefault(){}});
  const args=f.calls.find(c=>c.name).args;assert.deepEqual(plain(args.p_purpose),{ms:'Tujuan'});assert.equal(args.p_special_notes,null);
});
await test('renderer weekly controls serialize structured hours and fallback',async()=>{
  const f=rendererFixture();f.element('[data-building-select]').value='B_PUSTAKA';await f.element('[data-load]').onclick();
  f.change({source:'hours'},'override');f.change({hoursMode:''},'weekly');f.change({closed:'0'},'',false);
  for(const [key,value] of [['open','08:00'],['close','16:30']]) f.form.oninput({target:{dataset:{time:`0:${key}`},value}});
  await f.form.onsubmit({preventDefault(){}});
  const args=f.calls.find(c=>c.name).args;assert.equal(Object.keys(args.p_hours.days).length,7);assert.equal(args.p_hours.days[0].open,'08:00');assert.equal(args.p_hours.days[6].closed,true);
  f.change({source:'hours'},'static');await f.form.onsubmit({preventDefault(){}});assert.equal(f.calls.filter(c=>c.name).at(-1).args.p_hours,null);
});
await test('renderer conflict disables Save and provides reload with escaped preserved draft',async()=>{
  const f=rendererFixture();f.element('[data-building-select]').value='B_PUSTAKA';await f.element('[data-load]').onclick();f.change({source:'description'},'override');f.change({language:'description:en'},'',true);f.form.oninput({target:{dataset:{text:'description:en'},value:'<draft>'}});
  f.setup.error={code:'40001'};await f.form.onsubmit({preventDefault(){}});assert.match(f.container.innerHTML,/type="submit"[^>]*disabled/);assert.ok(f.container.innerHTML.includes('data-reload'));
  f.setup.error=null;await f.element('[data-reload]').click();assert.ok(f.container.innerHTML.includes('&lt;draft&gt;'));
});
await test('same-account token refresh preserves renderer draft; account switch clears it',async()=>{
  const f=rendererFixture();f.element('[data-building-select]').value='B_PUSTAKA';await f.element('[data-load]').onclick();
  f.listeners['echo:communityauthchange']({detail:{user:{id:'mock-user'}}});f.context.window.renderAdminBuildings(f.container);assert.ok(f.container.innerHTML.includes('Save all fields'));
  f.listeners['echo:communityauthchange']({detail:{user:null}});f.context.window.renderAdminBuildings(f.container);assert.ok(!f.container.innerHTML.includes('Save all fields'));
});
await test('existing Supabase auth provider restores, signs in and signs out using shared client',async()=>{
  const f=fixture();let authCallback;const events=[];
  const auth={getSession:async()=>({data:{session:{user:{id:'a',email:'a@test'}}}}),onAuthStateChange:fn=>{authCallback=fn;},signInWithPassword:async()=>({data:{session:{user:{id:'b',email:'b@test'}}}}),signOut:async()=>({error:null})};
  f.context.window.CommunitySupabaseClient.getClient=async()=>({auth});f.context.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options.detail;}};f.context.window.dispatchEvent=event=>events.push(event);
  vm.runInContext(read('services/supabase-auth-provider.js'),f.context);const provider=f.context.window.SupabaseAuthProvider;
  await provider.ready();assert.equal(provider.getCurrentUser().id,'a');await provider.signInWithPassword({email:'b@test',password:'mock'});assert.equal(provider.getCurrentUser().id,'b');await provider.signOut();assert.equal(provider.isAuthenticated(),false);authCallback('SIGNED_OUT',null);assert.equal(events.at(-1).detail.user,null);
});
console.log(`${count}/${count} tests passed. Deterministic mocks only; no network.`);
