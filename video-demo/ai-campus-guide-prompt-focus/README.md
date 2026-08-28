# AI Campus Guide Quick-Prompt Focus

Standalone video-recording page. Production AI Campus Guide is unchanged.

## Run

From the EchoWall project root:

```powershell
npx serve . --listen 8000
```

Open:

```text
http://127.0.0.1:8000/video-demo/ai-campus-guide-prompt-focus/
```

Refresh the page to replay the deterministic ~3-second sequence once.

## Recording sequence

- `0.00–0.15s`: complete normal Echo Wall homepage with the Ask Echo panel open.
- `0.15–0.77s`: `Where is the library?` lifts, turns brown with white text, then returns.
- `0.85–1.47s`: `Show sports facilities` lifts, turns brown with white text, then returns.
- `1.55–2.17s`: `Where is the cafeteria?` lifts, turns brown with white text, then returns.
- `2.17–3.00s`: the full page remains restored at normal brightness and completely still.

The focused prompt is rendered above a full-viewport dim/desaturation overlay. The scene contains no AI service, request code, chat-history mutation, storage, click automation, or looping animation.

`prefers-reduced-motion: reduce` opens directly on the normal static final page and skips the sequence.

## Isolation

The demo is a frozen visual copy for recording. It does not import or modify production AI logic, CSS, data, navigation, or UI files.

Production Files Modified: None
