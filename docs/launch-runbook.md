# Coffendi launch runbook

## Hard launch gates

Checkout becomes ready only when every server-side check passes:

- Stripe secret configured.
- Stripe webhook secret configured.
- Private order storage configured.
- All three Stripe Price IDs configured.
- Public catalog explicitly approved.
- Allowed countries valid.
- Shipping mode valid.
- Legal policies approved.
- Inventory process approved and at least one product available.
- Fulfillment process approved.
- Support process approved.

The required control variables are:

```text
COMMERCE_LEGAL_READY=true
COMMERCE_PUBLIC_CATALOG_READY=true
COMMERCE_INVENTORY_READY=true
COMMERCE_FULFILLMENT_READY=true
COMMERCE_SUPPORT_READY=true
COMMERCE_AVAILABLE_PRODUCTS=spray-dried,agglomerated,freeze-dried
```

Do not enable a control merely to make the status endpoint green. The named business owner for that control must have approved the underlying process.

## Domain and DNS

1. Add the final domain to Vercel.
2. Apply the Vercel DNS records at the authoritative DNS provider.
3. Wait for certificate issuance.
4. Set `VITE_PUBLIC_STORE_URL`, `PUBLIC_STORE_URL`, and `ALLOWED_ORIGIN` to the canonical HTTPS origin.
5. Rebuild the sitemap using the final `PUBLIC_STORE_URL`.
6. Update the Stripe webhook endpoint.
7. Update Stripe policy and terms URLs.
8. Verify canonical tags, Open Graph URLs, sitemap URLs, and redirects.
9. Keep the `vercel.app` deployment available only as the platform fallback; promote one canonical public domain.

## Stripe Dashboard

1. Complete merchant identity, payout, tax, and public-business settings.
2. Create one live Stripe Product for each confirmed retail product.
3. Create immutable live Prices using the approved currency and tax behavior.
4. Copy Price IDs into Vercel server variables.
5. Copy the same approved amounts into Vite public price variables in minor currency units.
6. Create approved Shipping Rates if shipping mode is `rates`.
7. Configure allowed payment methods.
8. Configure automatic tax according to the merchant decision.
9. Configure receipts and customer emails.
10. Configure the terms URL before requiring hosted terms consent.
11. Review fraud, dispute, refund, and statement-descriptor settings.
12. Register the signed webhook for the required Checkout events.

## Test-mode rehearsal

1. Deploy a protected Preview environment with test-mode Stripe credentials.
2. Confirm the public catalog and Stripe Price amounts match.
3. Place one order for each product.
4. Place one mixed-product order.
5. Test quantities at the allowed boundary.
6. Test each shipping country and rate.
7. Test an excluded country.
8. Test successful card payment.
9. Test a declined card.
10. Test an asynchronous payment if enabled.
11. Confirm terms consent and address collection.
12. Confirm success-page server verification.
13. Confirm the private order record.
14. Confirm the operations notification contains only the safe summary.
15. Re-send a webhook and confirm idempotent order storage.
16. Issue a full test refund.
17. Rehearse a cancellation before dispatch.

## Controlled live order

1. Obtain written launch authorization from legal, shipping, inventory, support, and fulfillment owners.
2. Add live secrets directly to protected Vercel Production settings.
3. deploy with commerce gates still false.
4. Verify public product facts, prices, policies, support, and shipping language.
5. Enable the approved gates.
6. Deploy once more if a public Vite variable changed.
7. Place one low-risk live order using a real supported address.
8. Verify Stripe payment, webhook, private record, notification, stock allocation, dispatch workflow, receipt, and success page.
9. Refund the controlled order if it is not intended for fulfillment.
10. Record the launch timestamp and operators.

## Emergency commerce disable

The fastest safe stop is to set one of these Production variables to `false` and redeploy server configuration:

```text
COMMERCE_INVENTORY_READY=false
COMMERCE_FULFILLMENT_READY=false
COMMERCE_SUPPORT_READY=false
```

This preserves the storefront, cart selection, bulk brief, and contact route while the server rejects new payment sessions. Do not remove order storage or webhook secrets during an incident involving already-created orders; incoming payment events still need verification and recording.

## Launch-day monitoring

- Check `/api/health` and `/api/commerce-status` before opening sales.
- Watch Vercel function errors without logging personal data.
- Watch Stripe webhook delivery and payment failures.
- Confirm every new order and lead has an owner.
- Confirm availability after each stock-changing order.
- Confirm support channels are staffed.
- Keep the technical and merchant rollback owners reachable.

## Seven-day review

- Checkout attempts, sessions, payments, and failures.
- Shipping-rate selection and address exceptions.
- Webhook delivery and duplicate events.
- Order notification delivery.
- Fulfillment and tracking time.
- Refund, damage, and cancellation reasons.
- Bulk and contact response time.
- Browser errors, Core Web Vitals, and accessibility feedback.
- Inventory mismatch or oversell risk.
- Required copy, policy, or workflow corrections.

