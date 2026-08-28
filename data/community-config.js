/**
 * Community V2 registry seed (COM-V2-001).
 * Generates CommunityDescriptor entries for the three Community V2 scopes —
 * global / college / jurusan — by reusing the existing `organizations` and
 * `majors` arrays from app-data.js. Does not duplicate college/major data.
 *
 * Must load after app-data.js (needs `organizations`/`majors`) and before
 * services/community-service.js.
 */
function buildCommunityDescriptors() {
  const descriptors = [];

  descriptors.push(Object.freeze({
    key: "global:all",
    scope: "global",
    orgId: null,
    majorId: null,
    name: "All KM Students",
    icon: "🌐",
    status: "coming_soon",
    moderationScope: "global",
  }));

  organizations.forEach(org => {
    descriptors.push(Object.freeze({
      key: `college:${org.id}`,
      scope: "college",
      orgId: org.id,
      majorId: null,
      name: `${org.name} General`,
      icon: org.emoji || "🏫",
      status: "coming_soon",
      moderationScope: "college",
    }));

    majors.filter(major => major.orgId === org.id).forEach(major => {
      descriptors.push(Object.freeze({
        key: `jurusan:${org.id}:${major.id}`,
        scope: "jurusan",
        orgId: org.id,
        majorId: major.id,
        name: major.name,
        icon: org.emoji || "🎓",
        status: "active",
        moderationScope: "college",
      }));
    });
  });

  return Object.freeze(descriptors);
}

window.COMMUNITY_DESCRIPTORS = buildCommunityDescriptors();
