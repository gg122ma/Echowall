# Pustaka Post Spotlight — Recording Scene

Standalone recording scene. Production Building Wall is unchanged.

## Run

From the EchoWall project root:

```powershell
npx serve . --listen 8000
```

Open:

```text
http://127.0.0.1:8000/video-demo/pustaka-post-spotlight/
```

Refresh the page to replay the complete animation from the normal Pustaka Building Wall state.

## Recording timeline

- `0.00–0.65s`: normal Pustaka Wall, with LA's newest post first.
- `0.65–1.00s`: full page dims and the post lifts to the foreground.
- `1.00–3.70s`: the warm-gold perimeter beam completes three finite laps around the rounded card.
- `3.70–4.25s`: one restrained finishing pulse while the focus settles.
- `4.25s onward`: stable editing frame; the post remains slightly lifted, the page stays lightly dimmed, and all motion has stopped.

`prefers-reduced-motion: reduce` skips all movement and opens directly on the final spotlight frame.

No LocalStorage, production service, database, or production post data is used or changed by this page.
