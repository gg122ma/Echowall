Verbatim pre-edit snippets for `services/study-resource-service.js`, captured
from this session's own Edit tool calls before this stage's changes were
applied (the file was edited before this checkpoint directory was created,
so — matching the pattern used in earlier checkpoints like
`HOMEPAGE-POLISH-001` — this documents the exact hunks instead of a full
stale file copy).

## 1. After `getResourcesForSubject()` — before (nothing inserted here yet)

```js
  function getResourcesForSubject(subjectCode, { includeUnreviewed = false } = {}) {
    const pool = includeUnreviewed ? getManifest() : getPublishableResources();
    return pool.filter(resource => resource.subjectCode === subjectCode);
  }

  function getResourceCountForSubject(subjectCode) {
    return getResourcesForSubject(subjectCode).length;
  }
```

(This stage inserted `getResourcesForSubjectInContext()`, `getResourceCategory()`,
`RESOURCE_CATEGORY_ORDER`, `YEAR_GROUPED_CATEGORIES`, and `isYearGroupedCategory()`
between these two functions.)

## 2. After `getResourceGroup()` — before (nothing inserted here yet)

```js
  function getResourceGroup(resourceGroupId) {
    if (!resourceGroupId) return [];
    return getManifest().filter(resource => resource.resourceGroupId === resourceGroupId);
  }

  function searchResources(query, { includeUnreviewed = false } = {}) {
```

(This stage inserted `isResourcePublishable()` between these two functions.)

## 3. Export freeze block — before

```js
  window.StudyResourceService = Object.freeze({
    getJurusanList,
    getJurusanById,
    getSubjects,
    getSubjectsByJurusan,
    getSubjectsByJurusanAndSemester,
    getSubjectByCode,
    getPublishableResources,
    getResourcesForSubject,
    getResourceCountForSubject,
    getResourceCountForJurusan,
    getResourceCountForJurusanSemester,
    getResourceTypesForSubject,
    getTotalPublishableResourceCount,
    getManualReviewQueue,
    getResourceById,
    getRelatedResource,
    getResourceGroup,
    searchResources,
  });
```

(This stage added `getResourcesForSubjectInContext`, `getResourceCategory`,
`isYearGroupedCategory`, `RESOURCE_CATEGORY_ORDER`, and `isResourcePublishable`
to this object.)

Nothing else in the file (all pre-existing functions/exports) was changed —
every hunk above is a pure addition.
