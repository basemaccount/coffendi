# Coffendi merchant handoff

This document is the source checklist for facts that must come from the merchant. Do not infer, estimate, or publish an entry that has not been approved by its owner.

## Ownership

Record a name and approval date for each owner:

- Business owner:
- Retail catalog owner:
- Legal reviewer:
- Shipping and returns owner:
- Tax adviser:
- Stripe administrator:
- Fulfillment owner:
- Bulk-sales owner:
- Privacy owner:
- Technical launch owner:

## Selling entity

- Legal business name:
- Trading name:
- Registered address:
- Registration number:
- VAT or tax number:
- Governing country and jurisdiction:
- Customer-support email:
- Customer-support phone:
- Returns address:
- Privacy contact:
- Support hours and timezone:
- Retail response target:
- Bulk response target:

## Retail markets

- Selling currency:
- Countries served:
- Countries excluded:
- Prices include tax: yes / no
- Stripe Automatic Tax: on / off
- Promotion codes: on / off
- Phone collection: on / off
- Customer accounts in Stripe: always / if required

## Product record — complete once per format

- Product format:
- Display name:
- SKU:
- Stripe Product ID:
- Stripe Price ID:
- Net quantity and pack size:
- Retail price in minor currency units:
- Tax code or tax class:
- Availability: available / preorder / unavailable
- Inventory owner and system:
- Maximum order quantity:
- Ingredients or composition:
- Allergen statement:
- Preparation instructions:
- Storage instructions:
- Shelf life:
- Country of manufacture or required origin statement:
- Final front-pack image:
- Final back-pack image:
- Barcode, if used:
- Verified certifications:
- Evidence URL or document owner for each certification:
- Approved sustainability claims and evidence:

## Shipping

- Dispatch location:
- Standard carrier and service:
- Express carrier and service:
- Stripe Shipping Rate IDs:
- Shipping included in price: yes / no
- Dispatch target:
- Delivery estimates by market:
- Remote-area limitations:
- PO box limitations:
- Customs responsibility:
- Duty responsibility:
- Address-change cutoff:
- Cancellation cutoff:
- Lost-order process:
- Damaged-order process:

## Returns and refunds

- Return window:
- Opened-food exception:
- Required product condition:
- Return shipping responsibility:
- Returns authorization process:
- Refund review target:
- Refund settlement wording:
- Wrong-item process:
- Missing-item process:
- Support escalation owner:

## Bulk commercial facts

- Sales owner:
- Sales email:
- Minimum order quantity by format:
- Available industrial pack sizes:
- Available retail or private-label pack sizes:
- Sample policy:
- Sample cost and shipping terms:
- Standard lead-time range:
- Monthly capacity that may be published:
- Incoterms offered:
- Destinations supported:
- Payment terms:
- Technical datasheets:
- Quality documents:
- Certifications:
- Pallet and container details:
- Commercial response target:

## Legal approval

- Privacy notice approved by:
- Privacy effective date:
- Terms approved by:
- Terms effective date:
- Shipping and returns approved by:
- Shipping and returns effective date:
- Stripe terms URL configured: yes / no
- Cookie and analytics decision:
- Required consumer-protection review completed:
- `COMMERCE_LEGAL_READY=true` authorized by:

## Protected settings

Enter secrets directly in Vercel. Never place them in this file, source control, an issue, or a screenshot.

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `RATE_LIMIT_SALT`
- `SUBMISSION_NOTIFICATION_BEARER_TOKEN`

## Final acceptance

- Merchant facts reviewed in production:
- Prices match Stripe:
- Shipping matches Stripe:
- Policies match actual operations:
- Inventory workflow rehearsed:
- Order notification received:
- Bulk notification received:
- Contact notification received:
- Test payment and refund completed:
- Controlled live order completed:
- Launch authorization name and timestamp:

