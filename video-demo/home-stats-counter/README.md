# EchoWall Home Stats Recording Demo

This isolated page is a video-recording copy of the four Homepage statistics cards. It uses fixed display values and does not load or change any EchoWall application data, services, routes, or LocalStorage.

## Open the recording page

Start a static server from the EchoWall project root on port `8000`, then open:

`http://127.0.0.1:8000/video-demo/home-stats-counter/`

For example, if the `serve` package is available:

```powershell
npx serve . --listen 8000
```

Refresh the page to replay the five-second animation once. The counters stop at `1017`, `12`, `53`, and `Aug 25, 2026`; they do not loop. With `prefers-reduced-motion: reduce`, the final values appear immediately.
