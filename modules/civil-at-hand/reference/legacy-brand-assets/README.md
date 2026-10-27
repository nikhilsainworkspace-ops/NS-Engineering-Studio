# Brand assets

The Civil At Hand logo supplied by the owner is included in several ready-to-use formats:

- `civil-at-hand-logo.png` — transparent full-size logo used by the dashboard and public intake forms by default.
- `civil-at-hand-icon.png` — square 512px app icon.
- `civil-at-hand-icon-192.png` — square 192px install icon.
- `favicon.ico` — browser favicon with 16px, 32px and 48px sizes.
- `apple-touch-icon.png` — 180px icon for mobile home-screen bookmarks.
- `civil-at-hand-logo-white.jpg` — white-background version for documents and places where transparency is unsupported.

`/manifest.webmanifest` is generated from `app/manifest.ts` for phone home-screen installation.

No environment-variable change is needed for these defaults. To use a different logo, place its public asset in this folder and set `NEXT_PUBLIC_BRAND_LOGO_URL=/your-logo.png`. To use a different favicon, set `NEXT_PUBLIC_FAVICON_URL=/your-favicon.ico` (or another browser-supported image URL). Redeploy after changing Vercel environment variables.

Files in `public/` are served publicly. Do not place passwords, database exports, private documents or contact data here.
