# SiteCommand safe rebuild — initial audit (2026-11-19)

## Non-negotiable safeguards
- Do not delete, reset, migrate, or overwrite production Firestore customer records.
- Do not change production DNS, Cloudflare routes, Firebase rules, authentication, or Stripe settings without explicit owner approval.
- Do not deploy from this audit branch.
- Use test accounts and an isolated test environment for any writes; never use real customer records for destructive tests.
- Verify an independent, restorable backup before any production migration or deployment.
- Do not expose credentials, API tokens, or private customer data in GitHub commits or test logs.

## Inspected
- platform: root directory, deployment guide, checkout.html, signup.html, platform.html, client-portal.html
- worker: root directory, wrangler.toml, worker.js
- Both repositories have separate audit/safe-rebuild-2026-11-19 branches.

## Preliminary findings (not yet runtime-tested)
1. Cloudflare wrangler.toml routes sitecommand.net, but worker.js routes sitecommand.io; confirm actual production domain and routing before changes.
2. worker.js includes FIREBASE_API_KEY placeholder; verify deployment secrets/configuration before assuming Firebase reads work.
3. Worker Firestore helper lists contractors and loops through returned documents. Investigate pagination, access control, error handling, and tenant isolation.
4. Client portal includes deleteDoc; review authorization and confirmation behavior before enabling any tests.
5. Checkout/signup/platform/client-portal include Firebase integrations; tests must cover registration, sign-in, per-customer access, and persistence.
6. Deployment guide describes components and infrastructure that may not match deployed reality; verify against live configuration.

## Required verification before release
- [ ] Confirm actual production domains and Firebase project
- [ ] Confirm backup strategy and test restoration
- [ ] Review Firestore security rules and tenant isolation
- [ ] Review worker routing and secrets handling
- [ ] Run static HTML/JS checks
- [ ] Test authentication and role boundaries in isolated environment
- [ ] Test checkout using payment sandbox
- [ ] Test customer portal with synthetic records
- [ ] Test worker against staging domain
- [ ] Test desktop/mobile browser flows and accessibility
- [ ] Document pass/fail results and unresolved limitations
- [ ] Obtain explicit approval before merging/deploying

Status: initial code inspection only. No functional tests or production changes performed.
