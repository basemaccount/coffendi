# Security policy

## Reporting a vulnerability

Do not open a public issue containing vulnerability details, customer information, payment information, tokens, environment values, or private submission records.

Until the merchant publishes an approved security contact, use GitHub's private vulnerability-reporting interface when it is available for this repository. If that interface is not available, contact the repository owner privately through GitHub and disclose only enough information to establish a secure reporting channel.

Include:

- A concise description of the issue.
- Affected route, function, or commit.
- Reproduction steps using non-customer test data.
- Expected impact.
- Any safe mitigation already identified.

Do not test against real customer records, attempt a live payment, degrade production availability, or exfiltrate data.

## Supported version

The latest deployment from the `main` branch is the supported version. Older commits and Preview deployments are not supported once a newer Production deployment has succeeded.

## Secrets

Stripe keys, webhook secrets, Vercel Blob tokens, salts, notification tokens, and other protected values belong only in the authorized environment provider. They must not be committed, pasted into issues, or included in screenshots.

