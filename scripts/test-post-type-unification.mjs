import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storage = new Map();
const localStorage = {
  getItem:key => storage.has(key) ? storage.get(key) : null,
  setItem:(key,value) => storage.set(key,String(value)),
  removeItem:key => storage.delete(key),
};
const building = { id:'B_TEST', wallKey:'building:B_TEST', name:'Test Building' };
const sandbox = {
  console,
  URL,
  Date,
  Math,
  Promise,
  setTimeout,
  clearTimeout,
  localStorage,
  CustomEvent:class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  fetch:async () => { throw new Error('offline fixture'); },
};
sandbox.window = sandbox;
sandbox.dispatchEvent = () => {};
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.getCampusBuilding = id => id === building.id ? building : null;
sandbox.CommunityService = {
  isValidCommunityKey:value => value === 'global:all',
  getCommunityKey:() => 'global:all',
  parseCommunityKey:value => value === 'global:all' ? { scope:'global' } : null,
};
vm.createContext(sandbox);

const run = relative => vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), sandbox, { filename:relative });
run('app-data.js');

assert.deepEqual(Array.from(sandbox.EchoPostTypeContract.values), ['discussion','question']);
assert.equal(sandbox.EchoPostTypeContract.defaultValue, 'discussion');
assert.equal(sandbox.EchoPostTypeContract.normalize('question'), 'question');
assert.equal(sandbox.EchoPostTypeContract.normalize('discussion'), 'discussion');
assert.equal(sandbox.EchoPostTypeContract.normalize('QUESTION'), 'discussion');
assert.equal(sandbox.EchoPostTypeContract.normalize(undefined), 'discussion');

run('app-wall.js');
const composerInputs = ['discussion','question'].map(value => ({ value, checked:false, focus() { this.focused = true; } }));
const composerChoices = composerInputs.map(input => ({
  dataset:{}, listeners:[],
  querySelector:selector => selector === 'input[name="post-type"]' ? input : null,
  addEventListener:(type,listener) => { if (type === 'click') composerChoices.find(choice => choice.querySelector('input[name="post-type"]') === input).listeners.push(listener); },
}));
const composerGroup = {
  hidden:true, dataset:{},
  querySelectorAll:selector => selector === '.identity-choice' ? composerChoices : [],
};
const composerForm = {
  querySelectorAll:selector => selector === 'input[name="post-type"]' ? composerInputs : [],
  querySelector:selector => {
    if (selector === '#post-type-group') return composerGroup;
    if (selector === 'input[name="post-type"]:checked') return composerInputs.find(input => input.checked) || null;
    return null;
  },
};
assert.equal(sandbox.initializeComposerPostType(composerForm), 'discussion');
assert.equal(composerGroup.hidden, false);
assert.equal(sandbox.getComposerPostType(composerForm), 'discussion');
composerChoices[1].listeners[0]({ preventDefault() {} });
assert.equal(sandbox.getComposerPostType(composerForm), 'question', 'Map/full-navigation composer selects Question');
composerChoices[0].listeners[0]({ preventDefault() {} });
assert.equal(sandbox.getComposerPostType(composerForm), 'discussion', 'composer switches back to Discussion');
sandbox.initializeComposerPostType(composerForm);
assert.equal(composerChoices[0].listeners.length, 1, 're-entry does not bind a second post-type handler');

localStorage.setItem('echo-wall-notes', JSON.stringify([
  { id:1, contextType:'community', communityKey:'global:all', postType:'question', content:'Community question' },
  { id:2, contextType:'community', communityKey:'global:all', postType:'discussion', content:'Community discussion' },
  { id:3, contextType:'community', communityKey:'global:all', postType:'invalid', content:'Invalid community type' },
  { id:4, contextType:'building', placeId:'B_TEST', wallKey:'building:B_TEST', category:'academic', shape:'rounded', content:'Legacy building' },
  { id:5, contextType:'building', placeId:'B_TEST', wallKey:'building:B_TEST', category:'academic', shape:'rounded', postType:'question', questionStatus:'solved', content:'Building question' },
]));

const loadedBuildings = sandbox.EchoNoteStore.listBuildingNotes();
assert.equal(loadedBuildings.find(note => note.id === 4).postType, 'discussion', 'legacy Building fallback');
assert.equal(loadedBuildings.find(note => note.id === 5).postType, 'question', 'Building Question retained');
assert.equal(loadedBuildings.find(note => note.id === 5).questionStatus, 'solved');

const commonInput = {
  placeId:'B_TEST', wallKey:'building:B_TEST', content:'Created note', category:'academic', shape:'rounded',
  isAnonymous:false, authorNickname:'QA', authorUserId:'qa-user',
};
const buildingDiscussion = sandbox.EchoNoteStore.createPlaceNote({ ...commonInput, postType:'discussion' });
const buildingQuestion = sandbox.EchoNoteStore.createPlaceNote({ ...commonInput, content:'Created question', postType:'question' });
assert.equal(buildingDiscussion.postType, 'discussion');
assert.equal(buildingQuestion.postType, 'question');
assert.equal(buildingQuestion.questionStatus, 'open');

run('services/map-note-service.js');
const mapQuestion = await sandbox.MapNoteService.create({
  ...commonInput,
  content:'Map question with Academic Advice',
  postType:'question',
  category:'academic',
  color:'#FBCFE8',
  imageDataUrl:'data:image/png;base64,AA==',
  imageName:'qa.png',
  lat:6.425,
  lng:100.419,
});
assert.equal(mapQuestion.postType, 'question');
assert.equal(mapQuestion.category, 'academic', 'Map postType and Category coexist independently');
assert.equal(mapQuestion.color, '#FBCFE8', 'Map Color remains independently persisted');
assert.equal(mapQuestion.imageDataUrl, 'data:image/png;base64,AA==', 'Map Photo remains persisted');

const mapDiscussion = await sandbox.MapNoteService.create({
  ...commonInput,
  content:'Map discussion',
  postType:'discussion',
  category:'campus_life',
  lat:6.426,
  lng:100.420,
});
assert.equal(mapDiscussion.postType, 'discussion');

const persisted = JSON.parse(localStorage.getItem('echo-wall-notes'));
assert.equal(persisted.find(note => note.id === mapQuestion.id).postType, 'question', 'Map persistence');
assert.equal(persisted.find(note => note.id === buildingQuestion.id).postType, 'question', 'Building persistence');
assert.equal(persisted.find(note => note.id === 3).postType, 'discussion', 'invalid Community value follows canonical fallback');

const wallSource = fs.readFileSync(path.join(root, 'app-wall.js'), 'utf8');
const mapOverlaySource = fs.readFileSync(path.join(root, 'features/map-note-overlay.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routerSource = fs.readFileSync(path.join(root, 'app-router.js'), 'utf8');
const echoMapSource = fs.readFileSync(path.join(root, 'echomap.js'), 'utf8');
assert.match(wallSource, /getQuestionBadgeHTML\(note\)/, 'all wall cards render canonical badge hook');
assert.match(wallSource, /initializeComposerPostType\(form\)/, 'all entry paths initialize the same Building composer');
assert.match(wallSource, /setComposerPostType\(form, input\.value/, 'Discussion and Question use one explicit switch path');
assert.match(wallSource, /const postType = getComposerPostType\(currentForm\)/, 'all wall submissions read the same composer state');
assert.match(indexSource, /value="discussion" checked[\s\S]*value="question"/, 'Community canonical default and enum');
assert.match(mapOverlaySource, /addChoices\('postTypes','postType'[\s\S]*'discussion'/, 'Map form exposes post type beside note content');
assert.match(mapOverlaySource, /postType:window\.EchoPostTypeContract\.normalize/, 'Map writes canonical postType');
assert.match(mapOverlaySource, /category:form\.elements\.category/, 'Map Category remains independently persisted');
assert.match(mapOverlaySource, /shape:form\.elements\.shape/, 'Map Shape remains persisted');
assert.match(mapOverlaySource, /color:form\.elements\.color/, 'Map Color remains user-selectable and persisted');
assert.match(mapOverlaySource, /imageDataUrl:state\.pendingImageDataUrl/, 'Map Photo remains persisted');
assert.match(routerSource, /function navigateToBuildingWall[\s\S]*location\.assign\(`index\.html\$\{wallHash\}`\)/, 'Map and Community resolve the canonical Building Wall route');
assert.match(echoMapSource, /saveMapReturnSnapshot\(building\.id\);[\s\S]*navigateToBuildingWall\(building\.id\);/, 'Map snapshot remains saved before entering Building Wall');
assert.match(wallSource, /function leaveBuildingWall[\s\S]*history\.back\(\)/, 'Building Wall Back preserves browser history return to Map');

for (const locale of ['en','ms','zh']) {
  const source = fs.readFileSync(path.join(root, 'i18n/locales', locale + '.js'), 'utf8');
  assert.match(source, /"form\.postType"/);
  assert.match(source, /"form\.postTypeDiscussion"/);
  assert.match(source, /"form\.postTypeQuestion"/);
}

console.log('Post type unification: PASS (Community, Building, Map, legacy, persistence, invalid fallback, i18n).');
