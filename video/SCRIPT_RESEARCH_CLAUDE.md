# EchoWall — Website Segment Script Research (Claude / Sonnet, High Reasoning)

Date: 2026-08-24
Scope: research + script design only. No website code was changed. No video was produced.

First principle applied throughout: **the real, currently-running website overrides every old
document.** Every claim about "this feature exists / works / looks like X" below was verified
either by reading the live source in this repository or by actually running `index.html` /
`map.html` in Chrome and clicking through the flow — not by trusting the old scripts or a
requirements doc. Where the old scripts turned out to still be accurate, this doc says so
explicitly instead of silently re-deriving the same conclusion.

---

## 1. Competition Analysis

Source: `video/SYARAT PERTANDINGAN MINI InnoSTEM 2026 UPDATED 19 jun 2026 (5).pdf`.

- **Full project video: 3–5 minutes**, must contain (per §6.2, referencing the poster content
  definitions in §5.4): a 1-second title card from the official template, **Idea**, **Practical
  dan Kebolehgunaan** (Practical & Usability), **Impak dan Sumbangan** (Impact & Contribution).
  Uploaded to YouTube, unlisted.
- **Scoring**: Product 85% (Abstract 5, Documentation 15, Idea 20, Practical & Usability 20,
  Impact & Contribution 25) + **Video 15%**. The video itself is a minority of the score, but it's
  the only artifact that has to *prove* the other three sections aren't just claims.
- **Practical & Usability definition (§5.4)**: "Mudah dilaksanakan serta praktikal digunakan,
  keberkesanan kos, berpotensi untuk dikomersialkan. (Sertakan bukti sokongan)" — i.e. easy to
  implement, cost-effective, commercialisable, **with supporting evidence**. For a working
  software prototype, "supporting evidence" is a screen recording of the feature actually
  producing a result, not a mockup or a described feature.
- The **website segment's job inside the full 3–5 min video is narrowly Practical & Usability** —
  it must not re-argue Idea (already covered by the earlier segment) or re-explain Impact (covered
  by the later segment). Every shot in this segment should answer one question: *does this
  actually work when a real student uses it?*

This confirms the existing project decision (already reflected in both prior draft scripts): the
website segment's only real job is **result-proof of working features**, in a continuous journey,
not a feature tour.

---

## 2. Original Video Style Analysis

Source: `video/8月1日(1).mp4`, probed with `ffprobe`/`ffmpeg` (duration 291.25s / 4:51, 1920×1080,
30fps — within the 3–5 min rule) and analyzed via extracted frame contact sheets (not "watched" in
the human sense, but sampled densely enough — 2–8s intervals through the transition zones — to
read on-screen text, UI state, and shot boundaries accurately).

### Structure of the original 4:51 cut

| Time | Content |
|---|---|
| 0:00–0:40 | **Live-action Idea**: a student walks across campus (multiple exterior/corridor shots, some deliberately motion-blurred), intercut with a phone screen showing a messy WhatsApp-style chat full of PDFs and schedule screenshots — visual shorthand for "information scattered across chats and files, hard to find." No website yet. |
| 0:40–0:56 | Student keeps walking through a corridor (locker hallway), unbroken continuation of the same live-action beat. |
| 0:56–0:72 | **Brand transition**: hard cut to a white background, 3D "Echowall" logotype reveal, then a 3D device-mockup animation (phone tilts in, then a laptop) — a `Remotion`/`iMockup`-style bridge, not a match cut on shared visual content. The laptop screen shows the real homepage hero ("Echoes of Experience, Pinned to the Wall"), the shot pushes in on the "Open KMK Echo Map" button, and cuts straight into a full-screen real screen recording. |
| 0:72–2:10ish | **Website screen recording**: Echo Map → a "Library is HERE" map post → Leave a Note with photo on the building wall → Communities grid (KMK/KMKK/KMPP/KMPK/...) → a multi-color Community sticky wall (including Chinese-language content) → homepage revisit → **Ask Echo** (a noticeably long segment: a recommended question answers instantly, then more recommended questions, including "What is HEP") → homepage stats block ("658 / 12 / 37") + Communities cards again → **Building Stories** grid → **Masjid** building detail with a photo carousel → **Pustaka (Perpustakaan)** building card + its sticky wall → a Register/Complete-Profile flow (password field, "Complete your profile" form). |
| ~3:12–4:40 | **Live-action again**: real students talking to camera / presenting to each other (an in-person testimonial or judging-style scene, not screen recording), intercut with over-the-shoulder laptop/phone shots of the same site (Echo Map on a phone, a stats overlay reading "888 VISIBLE NOTES · 33 COMMUNITIES · 88 PHOTO NOTES · LATEST MEMORY"). |
| 4:40–4:51 | Closing outdoor campus shot. |

### What's genuinely reusable

- **The device-mockup logo bridge (0:56–0:72) is a clean, low-risk way to enter the website from
  live action.** It doesn't require the Idea segment's last frame to visually match the website's
  first frame pixel-for-pixel — it just needs the *laptop screen inside the mockup* to match the
  real first frame, which is a much easier bar to hit. Per the task's own constraint ("Idea 已经不能
  更改... 前一段已固定的 Idea 直接从地图接入"), the Idea segment is already locked and is said to
  connect straight into the map — so this project has apparently already decided to skip the
  logo/mockup bridge in the *next* cut and go straight from Idea's last frame into Echo Map. That's
  a valid, more modern choice (harder to execute cleanly, but a real match cut is stronger than a
  device mockup) — this doc does not re-open that decision, only records that the original video
  did it differently.
- **Every feature segment in the original ends on a real, visible result** (a marker appears on
  the map, a note appears on the wall with its photo, an Ask Echo answer renders) before cutting
  away — never just a click. This is the single most important pattern to carry forward, and it's
  already the explicit design principle in both prior draft scripts.
- **Ask Echo getting real screen time with more than one question** in the original suggests the
  team already knew it demos well (fast, stable, visually clean chat bubbles) — confirmed still
  true today (see §3).
- **Cuts between website scenes are hard cuts on stable UI states**, not fades — there is no
  black-screen padding between Map → Note composer → Wall → Communities → Ask Echo. This matches
  the "no fade transitions" principle in both draft scripts.

### What reads as dated or worth dropping in a new cut

- The website portion of the original runs roughly **150 seconds** — three times the 2:15 budget
  this task is targeting. A new cut cannot be "the same tour, just faster"; it has to cut most
  scenes outright, not shorten all of them proportionally.
- **Register/Complete Profile** gets real screen time in the original. For a 2:15 budget this is
  exactly the kind of scene both prior draft scripts already correctly flagged as low value —
  it proves account creation works, which is not really what "Practical & Usability" is asking to
  see, and it risks turning 10–15 seconds of a 130-second budget into a form-filling tutorial.
- **Masjid's photo carousel** is beautiful but is a single-building detail page, not a
  cross-feature proof point — lower priority than showing Community interaction or real academic
  content (Echo Library did not exist yet when this video was made — see §4).
- The **live-action "students presenting/testimonial" section (≈3:12–4:40)** is clearly a
  different segment of the full video (Impact, or a separate judged-presentation cutaway), not
  part of the website walkthrough — it should not be treated as part of "the website segment's
  style" at all.

---

## 3. Current Website Audit (real code + real running site)

Verified by reading the live source (`app-router.js`, `app-wall.js`, `app-data.js`, `app-place.js`,
`app-community.js`, `app-study.js`, `echomap.js`, `services/*.js`) and by actually running
`python -m http.server` + Chrome against `index.html` / `map.html` and clicking through each flow
below in this session. This audit intentionally goes feature-by-feature per the task's checklist.

| Feature | Status | Evidence |
|---|---|---|
| Homepage hero ("Echoes of Experience, Pinned to the Wall") | **WORKING** | Live-screenshotted; visually identical to the original video's hero — the brand identity survived the rewrite. |
| Echo Map (KMK) | **WORKING** | `map.html`, real Leaflet map, 14 focus buildings, search-by-name sidebar. |
| Echo Map → "Post directly" | **WORKING** | Clicked through live: activates a placement mode ("Choose a point inside a highlighted focus building"), click inside a focus-building outline shows "Selected building: Pustaka (Perpustakaan)" + coordinates + **Post here**. This is scoped to the 14 focus buildings, not an arbitrary lat/lng click — accurate framing for the voice-over is "post directly to a place on the map," not "post anywhere." |
| Map post composer | **WORKING, richer than either old script assumed** | One modal does Message + **Post Type (Discussion/Question)** + Photo + Color + **Category** (Academic Advice / Co-curricular Activity / Campus Life / Emotional Support) + **Shape** (10 options: Rounded, Square, Rectangle, Circle, Envelope, Torn paper, Speech bubble, Polaroid, Ticket, Hexagon) + Publish as (Show my name / Post anonymously) — all in one step, before "Publish note." |
| Map → new marker appears | **WORKING** | Live-tested: published a real note near Pustaka; a new pin rendered on the map immediately at the clicked point. |
| Map → Building Wall entry | **WORKING, but is a real page navigation** | "Enter this building wall" navigates `map.html` → `index.html#/place/:id/wall` — a different HTML document, not a client-side route change within the same page. Any transition design across this boundary must treat it as a real page load (a hard cut or a very short loading-hidden cut), not a same-DOM UI animation. |
| Building Wall (Pustaka) | **WORKING** | The just-published note appeared as the **second card**, in the exact Category/Shape/Anonymous chosen (Campus Life / Speech bubble / Anonymous), with a real speech-bubble-tailed detail modal. |
| Building Wall vote (Agree/Disagree) | **WORKING, real count change** | Clicked Agree on the just-published note: `Agree (0)` → `Agree (1)` live, confirmed by zoomed screenshot. |
| Building Wall comments | **DO NOT SHOW — not a bug, a real product boundary** | Building notes have never had comments, by design (`services/comment-service.js`'s own doc comment: "Comments are Community-post-only; Building notes never have comments"), for both seed and real posts. Do not write a script beat implying Building notes can be commented on. |
| Building display counts ("43 notes" etc.) | **WORKING but intentionally static** | These are a deliberately fixed demo-display number (this session's own earlier `DISPLAY-COUNT-CONSISTENCY` work), not a live count of real notes — it will **not** visibly increment after posting a new note on camera. Script/voice-over must not claim "watch the number go up." |
| Community Hub → College cards (KMK/KMKK/KMPP/...) | **WORKING** | Still exists, visually close to the original video's "Communities" grid. |
| All KM Students (global cross-college wall) | **WORKING, and substantially upgraded since the original video** | This is Community V2 (did not exist in the original video). Confirmed in this session's own prior work: 67 real seeded posts, Discussion/Question contract, full comment threads, Mark Solved for Question posts, all with stable ids and real persistence — not placeholder content. |
| Question → Comment → Mark Solved | **WORKING, fully verified this session** | A Question post can receive a real comment (persists across reload, bound to the same post id) and be marked Solved by an owner/moderator — exactly the "Practical & Usability" proof the rules ask for (a real workflow completing, not a static screen). |
| Echo Library (renamed from "Study Notes") | **WORKING, NEW since the original video** | Confirmed live: document title, eyebrow and H1 all read "Echo Library"; route is still `#/study` internally (display-name-only rename, verified in this session's own prior work). Programme → Semester → Subject → Resource Detail hierarchy is real, backed by a real manifest (SM015 alone has 141 real resources: Pre/Pra PSPM, PSPM, Answer Scheme). |
| Echo Library search / filter | **WORKING** | Search box, Year/Subtype/Source filters, category tabs — all functional against real data (verified extensively in this session's prior work on this exact codebase). |
| Echo Library → real PDF | **WORKING** | Resource Detail resolves to a real file under `assets/study-files/*.pdf`; opening it is a real file, not a placeholder link. |
| Ask Echo | **WORKING, fast and stable — good news for recording** | Not a slow external LLM round-trip: recommended-question answers (e.g. "Where is the library?") render **instantly** from a local structured knowledge base (`CAMPUS_BUILDINGS`/`kmk-knowledge-base.js`, per `CLAUDE.md`'s own architecture note), with zero visible loading state in this session's live test. Recommended chips still match the original video almost exactly: "Where is the library?", "Show sports facilities", "Where is the cafeteria?". |
| Languages (EN / BM / 中文) | **WORKING** | Confirmed present via the language switcher and this session's own extensive i18n work (renamed Echo Library across all three, verified no leftover old labels). |
| Light / Dark / Auto theme | **WORKING** | Present (`theme-service.js`); this session separately re-verified Dark Mode readability on multiple pages this week. |
| Register / Create Account / Complete Profile | **WORKING but low value for 2:15** | Exists (`services/auth-service.js`, `services/auth-ui.js`), same as the original video's Scene 7. Kept out of the new cut for the same reason both prior draft scripts already gave: costs 10–15s of a 130s budget to prove something (account creation) that isn't the core "Practical & Usability" claim, and every other scene in this script already runs as a signed-in user without needing to show *how* that sign-in happened. |
| Admin / Moderation Dashboard | **DO NOT SHOW — explicit instruction, also genuinely incomplete** | Per this session's own direct instruction and prior work in this codebase (Admin V2 was still being actively built in recent sessions). Zero seconds, zero mention, in every version of this script. |

**No DEMO ONLY / NOT READY features were selected for the final script.** Every beat in §6/§7
below maps to a row marked WORKING above.

---

## 4. Old vs Current

| Old Scene (either draft doc) | Current Website Reality | Keep? | Modify? | Delete? | Reason |
|---|---|---|---|---|---|
| Original manual's "KMK → Major Community" as the *only* community structure | Community V2: Global (All KM Students) + College + Jurusan, with Discussion/Question + Comment + Solved | Keep the *concept* | **Modify** | — | Both prior draft scripts already made this exact correction; this audit confirms it's still correct and now goes further — Comment/Solved is real, not just College/Major browsing. |
| Original manual's Register/Profile Scene 7 | Still exists, still works | — | — | **Delete** | Confirmed low-value for a 2:15 cut; already correctly excluded by the newer draft script. Real login state can be shown passively (already logged in) without a Scene for it. |
| Original manual's Masjid photo-carousel Scene 6 | Building detail pages with photo carousels still exist for several buildings | — | — | **Delete from the primary path** | Doesn't add a new *type* of proof beyond what the Building Wall scene already shows (a place has real content); Echo Library and Community V2 are higher-value, more distinctive uses of the same ~15s. |
| Newer draft script's full 7-scene structure (Map→Wall→AllKM→StudyNotes→AskEcho→Languages→Impact) | Every one of these 7 beats independently verified WORKING this session | **Keep entire structure** | Rename "Study Notes" → "Echo Library" everywhere; tighten a few timings now that exact click-paths are confirmed | — | This is the single biggest finding of this audit: the newer draft script's scene selection was already correct against the real product. Nothing in it needed to be replaced, only relabeled and re-timed with now-verified exact numbers. |
| Newer draft script's assumption that Map "Post Directly" and Building Wall "Leave a Note" are two different, simpler composers | Both are the SAME richness of composer (Message + Type + Photo + Category + Shape + Color + Anonymous) | — | **Modify** | — | To avoid recording two visually near-identical forms back to back, this script deliberately splits which fields get emphasised on-camera per scene (Map = quick text + category + shape; Wall = the photo upload specifically) rather than showing the full form twice. |
| "SM015" match-cut concept (Community Question → Echo Library search) | SM015 is real, with 141 real resources (Pre/Pra PSPM, PSPM, Answer Scheme) | **Keep** | — | — | Directly verified in this session's prior extensive work on this exact subject code — this is not a guess, it's a real, camera-safe subject code with real PDFs behind every category. |
| Old manual's "library" as the guaranteed-safe Search keyword | Not verified this session (Echo Library's search behavior over the word "library" specifically wasn't re-tested) | — | **Modify** | — | Since SM015 is already the chosen match-cut keyword and is independently verified to have results, the script standardizes on **"SM015"** as the one search term used on camera instead of introducing a second, unverified term. |
| Old manual's Ask Echo custom question "What should students know before visiting the library?" | Not re-tested this session (only the recommended chip "Where is the library?" was tested) | — | **Modify** | — | The script now defaults to the **recommended chip**, which is directly verified instant and stable, and treats a typed custom question as optional/secondary rather than load-bearing. |

---

## 5. Feature Selection (why these 5 beats, not a longer list)

Answering the task's own framing question — "if there are only 2:10 seconds, which shots most
prove EchoWall is a real, usable product?" — against the audit above:

1. **Echo Map + Post Directly → Building Wall** (fixed starting point; also the strongest "a place
   in the real world connects to a real digital record" proof — directly answers Practical &
   Usability's "mudah dilaksanakan" bar).
2. **Building Wall interaction (photo + vote)** — proves persistence and multi-user interaction
   (Agree count actually changes), the two things a static screenshot can never prove.
3. **All KM Students: Question → Comment → Solved** — the single best proof that EchoWall is a
   *system*, not a wall of static text: a real workflow (ask → answer → resolve) completes on
   camera. This is also the newest, most-differentiating feature versus the original video (which
   had no Comment/Solved at all).
4. **Echo Library: search → filter → real PDF** — the other major feature added since the original
   video, and the one most directly tied to "usable by every matriculation student" (not just
   social sharing — real academic content, real past-year papers). Skipping this would mean the
   new cut demos *less* of the current product than the old video demoed of the old product.
5. **Ask Echo** — fast, stable, camera-safe, and closes the loop on "if a student can't find
   something, there's still a guided answer," which nicely bridges into the Impact section's likely
   framing (a supported, practical everyday tool).

Register/Profile, Building photo carousels beyond one quick beat, and Admin are the three biggest
cuts versus the original 4:51 video and the older recording manual — all three are justified above,
not silently dropped.

---

## 6. Transition Strategy

Every website-internal boundary below is designed as a **continuity device** (shared object, shared
color/shape, shared text, or camera motion), never a fade-to-black. The map→wall boundary is the one
genuine exception, because it is a real cross-document page navigation (see §3) — it gets a fast
hard cut timed to the new page's stable first frame, not a match cut.

| Boundary | Device | Why it works on THIS real UI |
|---|---|---|
| Map → Building Wall | Hard cut on result, not fade | Cross-document navigation confirmed live; disguise the reload by cutting exactly on the moment "Enter this building wall" is clicked, holding on the just-placed marker for ~0.5s first so the map result reads before the cut. |
| Building Wall Sticky → All KM Students Sticky | **Match cut on Category + Shape + Color** | Both walls render notes through the exact same `SHAPES`/`CATEGORY_COLORS` system (verified in code and live). Recording the Building Wall note as **Campus Life (orange family) / Speech bubble**, then finding or posting an All KM Students note in the same category+shape, gives a real, non-faked color/shape match — not an after-effects trick. |
| All KM Students Question ("...SM015...") → Echo Library Search | **Text match cut on "SM015"** | SM015 is a real subject code with real resources; write the Question's body to literally contain "SM015" (e.g. "Anyone free to revise SM015 together before the next quiz?"), push in on the word, cut to the Echo Library search box already showing "SM015" typed. |
| Echo Library PDF → Ask Echo | **Push-in disguise cut** | Push in on one short word/line inside the open PDF until it fills frame (hides the real cut), then the same word appears typed into the Ask Echo input, OR — since Ask Echo's recommended-chip flow is faster and more reliable on camera — cut on the push-in to the Ask Echo panel already open with the recommended chip visible; use the word only as a visual anchor, not as the literal typed query (avoids relying on an unverified custom-question round-trip). |
| Ask Echo → Languages | Panel/content slides one direction, language panes enter from the other side | Same device both prior scripts already specified; still valid, no code dependency. |
| Website segment → Impact | Visual elements (map pin, sticky note, Solved check, PDF page, Ask Echo bubble) shrink and converge toward the EchoWall mark, handing off into whatever the fixed Impact segment opens on | Kept from the newer draft script verbatim — this boundary is defined by the *next* segment, which this task was told not to touch. |

---

## 7. Recording Requirements (carried forward from the manual, corrected where reality differs)

- **Default state**: English + Light Mode, 1920×1080, browser at 100% zoom, signed in as a normal
  test account (not the "QA Admin" account used for verification in this session — that account
  has moderator powers, e.g. it can see a "Mark Solved" button on posts it doesn't own; recording
  should use an account that only has the ownership-based Mark Solved path, or accept that a
  moderator account will show the button too, which is not wrong, just worth being aware of when
  writing the shot's exact button list).
- **Core place**: Pustaka (Perpustakaan) — matches both prior scripts' choice, independently
  reconfirmed as the correct one this session (fastest to reach from Fit Campus, real content
  already on its wall, its own display count is already fixed at 43 so it reads as an established,
  active place rather than an empty demo).
- **Core subject code**: SM015 (Science, Semester 1, Mathematics) — real, verified, 141 resources.
- Every click: 0.3–0.5s pause before, 0.8–1.0s pause after. No double-clicks, no hunting for
  buttons on camera (rehearse the click path first).
- Every scene must end on a **result**, not a click: a real marker, a real note with its chosen
  photo/category/shape, a real vote-count change, a real comment + Solved badge, a real filtered
  result list + open PDF, a real Ask Echo answer.
- Long text fields: type the first 3–5 characters on camera, paste the rest; edit out the paste
  seam in post.
- Do not record a state that doesn't exist on this real site: no "0 results" empty states, no
  Coming Soon placeholders, no Admin screens, no loading spinners longer than a beat.
- Do not present the building/college display counts (43, 203, etc.) as if they are live counters
  that just changed because of an action taken on camera — they are static by design (see §3).

---

## 8. Assets Needed

- One 4:3-ish test photo for the Building Wall "Leave a Note" upload (a plausible Pustaka-adjacent
  campus photo — a real device photo works; avoid anything with a visible face/private info).
- A signed-in, moderator-free test account for the primary recording pass (see Recording
  Requirements above).
- A pre-written, pre-verified Question body containing the literal text "SM015" for the All KM
  Students beat (write it once, verify it posts and displays correctly, then never retype it live).
- Confirmation, immediately before recording, that SM015 → PSPM → a specific PDF still opens (data
  can change over time; the exact resource used on camera should be spot-checked same-day).

## 9. Risks

- **Cross-document navigation (map.html → index.html) is a real page load.** If recorded naively
  it will show a visible white flash/reload. Plan the cut precisely on that boundary rather than
  trying to hide a real network/DOM teardown with a same-page animation trick.
- **The "QA Admin" test account has moderator powers** that a normal student account does not
  (e.g. Mark Solved on any Question, not just their own). Recording with it is fine for a feature
  demo, but the voice-over should describe Mark Solved as something *the asker or a moderator* can
  do, not imply every student can resolve every question.
- **Building display counts do not increment live.** Any shot design that implies "watch the
  number go up after I post" will be factually wrong on this real site and should be avoided.
- **Ask Echo's custom free-text question path was not independently re-verified this session** —
  only the recommended chip was tested live and confirmed instant/stable. The final script
  therefore leans on the recommended chip as the primary, safe beat.
- **SM015's exact resource list can change** if the underlying study data is ever regenerated —
  spot-check the exact PDF used on camera on the actual recording day, not from this document
  alone.
