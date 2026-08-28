# COM-V2-008 — Pre-checkpoint state

## Baseline: all of COM-V2-001 through COM-V2-007 PASSED

This is the completion gate for Community V2 — no new features per the task's own scope ("不要在这个阶段再加入大型新功能"). Goal: legacy migration verification, bug fixing if found, full regression sweep, and closing out items every prior stage explicitly deferred:

- BM language never independently screenshotted since COM-V2-001 (real translations exist for every key, never visually re-confirmed as a full pass).
- Real mobile viewport (390px) never independently re-verified for Community V2's own new UI (Hub, College Landing, Global/College General/Jurusan walls, Compose Post Type selector, Comments section) — only spot-checked in COM-V2-002/003.
- System theme never explicitly tested (only Light/Dark toggled directly).
- Post (note) content XSS never explicitly tested this run (Comment content XSS was tested in COM-V2-005) — should confirm the same escaping holds for note content too, even though it's pre-existing/unchanged code.
- Very-long-content and combined-filter interactions not explicitly stress-tested.
- Canonical E2E flows A–G (Global Discussion, Global Question+Solve, College General, Legacy Jurusan, Anonymous, Photo, Translation) not run as one compiled checklist — pieces were verified individually across stages 002–007, not confirmed together as named flows.

## Files this stage is expected to touch

Likely none, or only targeted bug fixes if the regression sweep finds a real issue. This is a QA/verification stage, not a feature stage.
