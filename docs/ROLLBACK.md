# Rollback

## Full rollback

Restore the previous baseline versions of the root HTML, CSS and JavaScript files, then remove:

```text
app-place.js
config/
data/
i18n/
services/
docs/
ROADMAP.md
CONTRIBUTING.md
CHANGELOG.md
HANDOFF.md
```

## LocalStorage rollback

Before schema version 2 is first saved, the build creates:

```text
echo-wall-notes-backup:v1
```

To restore the old note array in the browser console:

```js
const backup = localStorage.getItem("echo-wall-notes-backup:v1");
if (backup) {
  localStorage.setItem("echo-wall-notes", backup);
  localStorage.removeItem("echo-wall-schema-version");
  location.reload();
}
```

Remove prototype account data separately only when intended:

```js
localStorage.removeItem("echo-wall-users:v1");
localStorage.removeItem("echo-wall-user-session:v1");
```
