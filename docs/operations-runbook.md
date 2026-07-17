# Coffendi commerce operations runbook

## Operating principle

Payment is not fulfillment. A successful Stripe event creates an authenticated order record with the status `payment-confirmed-awaiting-operations`. A named operator must still accept, pick, pack, dispatch, communicate tracking, and close the order.

## Order record lifecycle

Use these operational states consistently in the system chosen by the merchant:

1. `payment-confirmed-awaiting-operations`
2. `accepted-for-fulfillment`
3. `stock-allocated`
4. `packing`
5. `dispatched`
6. `delivered`
7. `closed`

Exception states:

- `payment-failed`
- `manual-review`
- `address-hold`
- `stock-hold`
- `cancel-requested`
- `cancelled`
- `refund-pending`
- `refunded`
- `damage-claim`
- `carrier-investigation`
- `disputed`

The application currently stores the authenticated Stripe event record. State changes after that point belong in the selected fulfillment system, CRM, or documented manual ledger.

## New paid order

1. Confirm that the notification reference matches a private order record.
2. Verify `paymentStatus` is paid or no-payment-required.
3. Verify the Stripe session in the Stripe Dashboard.
4. Confirm line items, quantity, delivery address, shipping service, and customer contact.
5. Check inventory before accepting fulfillment.
6. Allocate stock and record the operator and timestamp.
7. Flag address, fraud, tax, or stock exceptions before packing.
8. Pack against the approved SKU and net quantity.
9. Generate tracking using the approved carrier.
10. Send the dispatch communication through the approved channel.
11. Record carrier, tracking, dispatch time, and operator.
12. Close only after the delivery or exception workflow completes.

## Manual Blob fallback

If the notification provider is unavailable, accepted records remain in private Vercel Blob storage.

- Retail orders: `orders/stripe/{checkout-session-id}.json`
- Bulk and other submissions: `submissions/{type}/{year}/{month}/{day}/...json`

The fallback owner must review private storage at the beginning and end of every operating day. Do not make a Blob container public to simplify access. Do not send raw records through unapproved personal email or messaging accounts.

## Inventory controls

Before setting `COMMERCE_INVENTORY_READY=true`:

- Name the inventory owner.
- Choose manual, Stripe-assisted, ERP, warehouse, or made-to-order control.
- Define the source of truth.
- Define the safety-stock threshold.
- Define when `COMMERCE_AVAILABLE_PRODUCTS` is changed.
- Define how quickly an unavailable item is removed from checkout.
- Rehearse a final-unit concurrency scenario.
- Define who can pause commerce.

The server rejects product IDs not listed in `COMMERCE_AVAILABLE_PRODUCTS`. This is a launch control, not a stock-reservation engine.

## Cancellation and refund

1. Authenticate the requester using the order reference and the order email.
2. Check whether the cancellation cutoff has passed.
3. Stop fulfillment before issuing a refund where possible.
4. Record the reason and operator.
5. Issue the refund in Stripe using the approved refund amount.
6. Retain the Stripe refund reference.
7. Send the approved confirmation wording.
8. Return allocated inventory only when operationally valid.

Never promise the time a bank takes to settle a refund unless the approved policy provides supportable wording.

## Damaged, missing, or incorrect order

1. Record the order reference and contact channel.
2. Ask only for the evidence required by the approved policy.
3. Protect any customer images or personal data as support records.
4. Determine replacement, partial refund, full refund, or carrier investigation.
5. Record the decision owner and deadline.
6. Notify the customer using approved wording.
7. Capture the incident category for packaging and carrier review.

## Bulk lead

1. Locate the private `CFI-` reference.
2. Assign the lead owner.
3. Confirm format, application, volume, annual volume, destination, target pack, timeline, sample need, Incoterm, and certification need.
4. Identify missing technical or commercial facts.
5. Respond within the approved target without promising unsupported price, capacity, certification, or lead time.
6. Record qualification state: new, qualifying, sample, quotation, negotiation, won, lost, dormant.
7. Record the next action, owner, and due date.

## Contact request

Route `CFC-` references by topic:

- `retail`: product and availability support.
- `order`: payment or fulfillment support.
- `returns`: approved returns and damage workflow.
- `bulk`: commercial team and detailed bulk brief.
- `general`: support owner triage.

Do not request raw card data. Stripe handles card information on its hosted checkout.

## Daily checks

- Production health endpoint reports storage configured.
- Commerce readiness state matches the intended launch state.
- New paid orders have owners.
- New bulk and contact requests have owners.
- Notification failures are reviewed.
- Stripe disputes, failed payments, and refund queues are checked.
- Availability matches the inventory source of truth.

## Weekly review

- Payment conversion and failures.
- Fulfillment time.
- Support response time.
- Damaged and missing order rate.
- Refund and cancellation reasons.
- Bulk lead response and qualification.
- Inventory mismatches.
- Notification delivery.
- Privacy or security incidents.

