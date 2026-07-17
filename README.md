# Coffendi instant coffee storefront

A responsive React and Vite storefront focused on three soluble-coffee formats:
spray dried, agglomerated, and freeze dried. It includes retail product journeys,
a persistent cart, a server-side Stripe Checkout boundary, bulk inquiry capture,
process education, and an evidence-led sustainability page.

## Run locally

```bash
npm install
npm run optimize:images
npm run dev
```

The Vite development server does not execute Vercel API functions. Use the linked
Vercel environment when testing inquiry persistence or hosted checkout:

```bash
npm run dev:full
```

## Production build

```bash
npm run build:sitemap
npm run build
npm run preview -- --port 4173
```

`optimize:images` converts the editable sources in `assets/instant/` into the
delivery-ready WebP files in `public/images/`. The generated storefront imagery
is original and unbranded.

## Commerce configuration

Copy `.env.example` to `.env.local` for local Vercel development. Retail prices
are optional Vite build settings expressed in minor currency units:

```text
VITE_STORE_CURRENCY=USD
VITE_PUBLIC_STORE_URL=https://your-store.example
VITE_PRICE_SPRAY_DRIED_CENTS=1299
VITE_PRICE_AGGLOMERATED_CENTS=1499
VITE_PRICE_FREEZE_DRIED_CENTS=1799
```

Hosted payments require server-side Stripe settings:

```text
PUBLIC_STORE_URL=https://your-store.example
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SPRAY_DRIED=price_...
STRIPE_PRICE_AGGLOMERATED=price_...
STRIPE_PRICE_FREEZE_DRIED=price_...
STRIPE_ALLOWED_COUNTRIES=US,GB,DE
STRIPE_SHIPPING_MODE=rates
STRIPE_SHIPPING_RATE_IDS=shr_standard,shr_express
STRIPE_AUTOMATIC_TAX=false
STRIPE_ALLOW_PROMOTION_CODES=false
STRIPE_COLLECT_PHONE=true
STRIPE_CREATE_CUSTOMER=true
STRIPE_REQUIRE_TERMS=true
COMMERCE_LEGAL_READY=false
```

The checkout endpoint accepts only the three configured product IDs and never
accepts price amounts from the browser. It requires explicit shipping countries
and a deliberate shipping model:

- Set `STRIPE_SHIPPING_MODE=rates` and provide one or more Stripe Shipping Rate
  IDs in `STRIPE_SHIPPING_RATE_IDS`.
- Set `STRIPE_SHIPPING_MODE=included` only when shipping is intentionally built
  into the configured product prices.

There is no default shipping mode, so an omitted rate cannot silently become free
shipping. Promotion codes, phone collection, persistent Stripe customer creation,
terms consent and automatic tax are also explicit settings. When
`STRIPE_REQUIRE_TERMS=true`, configure the terms-of-service URL in the Stripe
Dashboard so hosted Checkout can display the required consent.

Checkout uses Stripe's hosted page, so payment-card data is not handled by this
app. It also requires a signed Stripe webhook at `/api/stripe-webhook` and private
Blob storage before accepting payment. Verified `checkout.session.completed` and
asynchronous-payment events are saved idempotently by Checkout Session ID for the
merchant's fulfillment workflow. If any configuration is incomplete, checkout
remains unavailable and points buyers to the commercial inquiry path.

Register `https://your-store.example/api/stripe-webhook` in Stripe for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

The success page verifies the Checkout Session server-side before clearing the
cart. A redirect to the success URL is not treated as proof of payment.

`COMMERCE_LEGAL_READY` is a deliberate final gate. Leave it `false` while the
pre-launch privacy, terms, and shipping/returns frameworks are being replaced with
merchant-approved policies. Set it to `true` only after the merchant has confirmed
prices, currency, pack sizes, inventory, shipping regions and rates, tax setup,
refund/return policy, terms, privacy language, support details, and every
certification or sustainability claim. These policy frameworks are implementation
checklists, not legal advice.

## Bulk inquiries

`/bulk` collects format, volume, packaging, destination, company and product
requirements. It requires explicit privacy consent in both the browser and API,
then submits through the existing hardened `/api/inquiries` endpoint and private
Vercel Blob storage. Missing commercial data remains inquiry-led.

## Verification

With the production preview running at `http://127.0.0.1:4173`:

```bash
npm run test:checkout
npm run test:security
npm run test:a11y
npm run test:performance
npm run test:visual
```

Additional retained checks:

```bash
npm run test:sourcing
npm run test:api
```

`test:api` requires the linked private Vercel environment and writes persistent
test submissions. The accessibility test is automated WCAG A/AA coverage, not a
substitute for keyboard and screen-reader review or a legal compliance audit.

## Legacy source material

The former green-coffee and Makendi modules remain in `src/` for reference, but
they are no longer imported by the storefront. Their generated public catalog and
legacy photography were removed from the deployment payload. Running
`npm run import:makendi` can regenerate the Makendi catalog assets when the source
delivery is available.
