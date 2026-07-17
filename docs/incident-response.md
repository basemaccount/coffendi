# Coffendi incident response

## Priorities

1. Protect people and customer data.
2. Stop unsafe new transactions.
3. Preserve authenticated payment and submission records.
4. Establish the exact affected window.
5. Communicate factual status without speculation.
6. Restore through a tested path.
7. Record corrective actions.

## Payment incident

- Set `COMMERCE_INVENTORY_READY=false` or another appropriate commerce gate.
- Do not delete Stripe webhook configuration for orders already in progress.
- Check Stripe service and webhook delivery status.
- Compare Stripe sessions with private order records.
- Identify payments that succeeded without operational notification.
- Assign every affected order an owner.
- Contact customers only through the approved support workflow.
- Re-enable checkout only after a test-mode or controlled verification.

## Submission incident

- Check `/api/health` for storage status.
- Check Vercel function errors and Blob availability.
- Keep forms closed only if persistence cannot be trusted.
- Use the approved support email as the temporary contact route if it is staffed and published.
- Reconcile requests received during the affected window.
- Never make private Blob records public as a workaround.

## Suspected data exposure

- Restrict access and rotate affected credentials.
- Preserve logs and evidence; do not copy personal records into tickets.
- Identify data categories, record count, markets, and affected processors.
- Notify the privacy and legal owners immediately.
- Follow the approved jurisdiction-specific assessment and notification process.
- Record the decision owner, timeline, and remediation.

## Incorrect price, shipping, or stock

- Disable commerce using a readiness gate.
- Record the first and last affected order.
- Do not silently alter an accepted order.
- Apply the approved terms and consumer-protection process.
- Correct Stripe, public catalog, shipping, and availability sources together.
- Re-test one affected path before reopening.

## Notification provider failure

- Confirm records continue to persist privately.
- Start the manual Blob review schedule in the operations runbook.
- Assign a temporary order and lead monitor.
- Repair the provider without placing buyer messages in logs.
- Send only references and safe routing summaries through the webhook.
- Reconcile the full affected window before ending the fallback.

## Incident record

- Incident ID:
- Start time and timezone:
- Detection source:
- Incident owner:
- Affected services:
- Affected transaction or submission window:
- Customer impact:
- Data impact:
- Commerce disabled at:
- Root cause:
- Recovery verified by:
- Merchant communication owner:
- Corrective actions and due dates:
- Closure approval:

