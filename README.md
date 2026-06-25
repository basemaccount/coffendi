# Coffendi

Responsive green coffee sourcing website built with React and Vite.

## Run locally

```bash
npm install
npm run dev
```

Use the linked Vercel environment when testing the serverless submission APIs:

```bash
npm run dev:full
```

The development server is available at `http://localhost:4173` when started
with the verification port used in this workspace.

## Build

```bash
npm run import:makendi
npm run build:sitemap
npm run build
```

`import:makendi` reads the local Makendi delivery from
`MAKENDI_SOURCE_ROOT`, defaulting to
`/mnt/c/Users/progr/Downloads/MAKENDI_FINAL_V5_COMPLETE_EDITABLE`, generates
`src/makendiCatalog.js`, `src/makendiSummary.js`, and optimized web images in
`public/makendi`. The full catalog is lazy-loaded on `/atlas` so the main app
bundle stays below Vite's chunk warning threshold.

`build:sitemap` regenerates `public/sitemap.xml` from the live coffee lots and
all 117 Makendi atlas profile URLs.

## Deploy

The project is configured for Vercel in `vercel.json`. The catch-all rewrite
keeps React Router routes working when a visitor opens a deep link directly.

```bash
npx vercel --prod
```

## Browser verification

With the development server running on port `4173`:

```bash
node scripts/visual-check.mjs
```

The check covers desktop and mobile routes, screenshots, browser console
errors, horizontal overflow, the coffee comparison flow, the finder flow, and
the Makendi atlas search/detail/filter states.

With `.env.local` pulled from the linked Vercel project, validate the private
submission APIs and Blob persistence with:

```bash
npm run test:api
```

## Brand asset

`public/coffendi-logo.png` is generated from the supplied
`coffendi logo 1.pdf` using:

```bash
node scripts/render-logo.mjs
```
