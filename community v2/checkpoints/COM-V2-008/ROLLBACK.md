# COM-V2-008 — Rollback instructions

## What this stage changed

**Nothing in the codebase.** COM-V2-008 is a QA/verification stage per its own scope ("不要在这个阶段再加入大型新功能") — it ran the full regression sweep and closed out every "not verified" item flagged across COM-V2-002 through COM-V2-007 (mobile viewport, BM language, System theme, Post-content XSS, combined filters). No bug was found that required a code fix, so no files were modified.

## How to roll back only this stage

Nothing to roll back — no files changed. If this stage's verification is ever considered invalid, simply re-run the checks described in `community v2/reports/REPORT_COM-V2-008.md`.

## Files this rollback must NOT touch

N/A — no rollback needed.
