# SiteCommand customer-release checklist (not yet certified)

## Required admin deployment
1. In Firebase console for `sitecommand-saas`, inspect **existing** Firestore and Storage rules. Merge the scoped rules from `security/*.example` without replacing existing customer, photo, or billing rules.
2. Deploy rules using an authorized Firebase admin session. GitHub merges alone do **not** deploy Firebase rules.
3. Validate cross-tenant isolation with two distinct test accounts. Account B must be unable to list, read, write, or delete Account A's documents. Confirm support users can see tickets only if a trusted backend assigns `supportAdmin` custom claims. Support does **not** receive document access.
4. Test Website Editor photo upload, slideshow upload, logo upload and Firestore save. If an upload fails, record the displayed Firebase error code. The editor now keeps its preview visible when reporting an error.
5. Test PDF/DOCX upload and authenticated open/delete; these formats are stored but are **not yet AI searchable**. TXT/MD lookup currently returns source excerpts, not generative AI answers.
6. Test that the Cloudflare Worker deployment reflects the GitHub homepage section ordering changes. No deployment was verified from this repository.
7. Test sign-in/sign-out and password recovery on desktop and mobile. Test failed network requests and retries.
8. Do not certify customer launch until real authenticated browser testing and Firebase rules verification succeed.

## Future Mac workers
Mac workers are deliberately **not** configured yet. Use a secured backend job queue, short-lived credentials, source attribution, rate limits and a real-estate data license before enabling property research.

## Security
Do not put AI provider keys in browser HTML. Existing Gemini browser-side fallback keys in other pages should be rotated and moved server-side. Use a server endpoint for generative chat, RAG and web search; the AI Workspace currently shows a clear unavailable state rather than fabricating responses.
