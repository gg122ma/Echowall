Verbatim pre-edit snippets for every hunk this stage changed in `app-router.js`,
captured from this session's own Edit tool calls (not reconstructed from memory).
Four separate hunks were touched; nothing else in the file was modified.

## 1. `getRoute()` — before (no Study routes existed)

```js
  if (parts[0] === "admin") return { page: "admin" };
  if (parts[0] === "places") return { page: "places" };
```

(Study routes were inserted directly after this, before the Community V2 block.)

## 2. `setRouteDocumentState()` titles — before

```js
    "community-college-general": "College General — Echo Wall",
  };
```

(Study titles were inserted directly before the closing `};`.)

## 3. `render()` dispatch — before

```js
  else if (route.page === "org-building") renderOrgBuildingDetail(app, route.orgId, route.buildingId);
  else if (route.page === "wall") {
```

(Study dispatch branches were inserted between these two lines.)

## 4. `renderHome()` — before (no Study Notes section between Community CTA and Building Stories)

```js
      </section>

      <section class="container section-block building-home-section">
```

(The Study Notes `.study-notes-promo` section was inserted between these two lines —
this is exactly the insertion point named in the request: "Community → Study Notes
→ Building Stories".)
