# Contributing to Coffendi

## Local setup

```bash
npm ci
npm run dev
```

Use `npm run dev:full` only when the linked Vercel environment is required. Do not run persistence tests against a private environment unless test writes are explicitly in scope.

## Working rules

- Preserve the three-product instant-coffee focus.
- Keep retail checkout and bulk inquiry as separate journeys.
- Do not invent prices, pack sizes, stock, delivery promises, certifications, sustainability results, or legal terms.
- Never accept a browser-supplied price.
- Never expose a secret in a `VITE_` variable.
- Keep desktop, 390 px mobile, and 320 px compact layouts usable.
- Preserve semantic landmarks, visible focus, reduced motion, and accessible names.
- Preserve unrelated working-tree changes.

## Verification

For every change:

```bash
npm run build
git diff --check
```

Then run the focused test for the changed boundary. UI and routing changes normally require a production preview plus security, accessibility, performance, and visual checks.

## Pull requests

State the outcome, launch impact, test evidence, and any required environment changes. Do not put customer data, private records, credentials, or legal drafts into a public pull request.

