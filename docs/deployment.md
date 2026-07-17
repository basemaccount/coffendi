# GitHub and Vercel delivery

## Source of truth

- Repository: `basemaccount/coffendi`
- Production branch: `main`
- Production site: `https://coffendi.vercel.app`
- Runtime: Node.js 24
- Frontend: Vite
- Functions: Vercel Node.js functions in `api/`

The Vercel Git integration deploys a successful push to `main`. A Production deployment is not considered handed off until the Git commit, GitHub `main`, Vercel deployment SHA, public health response, and smoke checks agree.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests targeting `main`.

It verifies:

1. The generated sitemap is committed.
2. The production build succeeds.
3. Checkout, readiness, notification, and sourcing boundaries pass.
4. The deployment CSP and security configuration pass.
5. WCAG 2.2 A/AA automation passes.
6. Performance budgets pass.
7. Desktop, 390 px mobile, and 320 px compact visual checks pass without overflow, broken images, or console errors.

The workflow has read-only repository permission and cancels stale runs for the same branch.

## Dependency automation

`.github/dependabot.yml` checks npm and GitHub Actions weekly. Minor and patch updates are grouped to reduce pull-request noise. Major updates remain separate so they receive deliberate compatibility review.

GitHub secret scanning and push protection must remain enabled. Dependabot security updates should remain enabled in repository settings.

## Production smoke monitoring

`.github/workflows/production-smoke.yml` runs daily and on manual dispatch. It performs read-only checks against the deployed site:

- Twelve public storefront routes.
- Application shell delivery.
- Commerce readiness response shape.
- Private-storage health.
- Security headers.
- Sitemap.
- Robots file.

It does not submit forms, create Stripe sessions, write records, or require secrets.

Run it locally with:

```bash
npm run test:production
```

Override the deployment only when intentionally testing another public environment:

```bash
COFFENDI_BASE_URL=https://example.vercel.app npm run test:production
```

If that environment intentionally publishes a different canonical origin, provide both values:

```bash
COFFENDI_BASE_URL=https://example.vercel.app \
COFFENDI_CANONICAL_URL=https://example.com \
npm run test:production
```

## Vercel configuration

`vercel.json` is the version-controlled source for framework detection, build output, SPA rewrites, security headers, immutable asset caching, and function duration.

Do not move protected values into `vercel.json`. Configure secrets in the Vercel project environment and scope them deliberately to Production, Preview, or Development.

## Release verification

After a push to `main`:

1. Confirm the GitHub commit exists on `origin/main`.
2. Confirm GitHub CI passes.
3. Confirm the Vercel Production deployment reports success for the same SHA.
4. Run `npm run test:production`.
5. Confirm `/api/commerce-status` matches the intended launch state.
6. Confirm `/api/health` reports private storage configured.
7. Confirm no payment gate was unintentionally opened.

## Rollback

Use Vercel's deployment rollback only when a known-good deployment is identified. Preserve Stripe webhook and private order storage while investigating commerce incidents. To stop new checkout creation without removing the storefront, disable an explicit commerce readiness gate and redeploy as described in `docs/launch-runbook.md`.
