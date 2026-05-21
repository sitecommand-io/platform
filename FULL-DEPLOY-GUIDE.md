# SiteCommand — Complete Deployment Guide
# Every step you need to go live and start making money

==============================================================
## WHAT YOU ARE DEPLOYING
==============================================================

1. SiteCommand website (index.html) — your sales page
2. Checkout (checkout.html) — signup form
3. Platform (platform.html) — contractor dashboard
4. Email AI (email-ai.html) — Gmail/Outlook assistant  
5. Lead Finder (lead-finder.html) — Zillow/Facebook scanner
6. Social Media (social-media.html) — post scheduler
7. Cloudflare Worker (worker.js) — serves all contractor websites
8. Mac Server (server.py) — AI phone assistant backend

==============================================================
## STEP 1 — BUY YOUR DOMAIN (10 minutes)
==============================================================

1. Go to namecheap.com
2. Search: sitecommand.io
3. Buy it (~$35/year for .io)
4. If taken, try: sitecommand.co or sitecommand.app

==============================================================
## STEP 2 — SET UP CLOUDFLARE (free, 15 minutes)
==============================================================

1. Go to cloudflare.com → Sign up free
2. Click "Add a Site" → enter sitecommand.io
3. Choose FREE plan
4. Cloudflare gives you 2 nameservers like:
   - ada.ns.cloudflare.com
   - bob.ns.cloudflare.com
5. Go to Namecheap → your domain → Nameservers
6. Change to "Custom DNS" → paste Cloudflare nameservers
7. Wait 5-30 minutes for DNS to update

IN CLOUDFLARE DNS TAB — Add these records:
   Type: A    Name: @      Value: 76.76.21.21    (GitHub Pages)
   Type: CNAME Name: www   Value: sitecommand-io.github.io
   Type: CNAME Name: *     Value: sitecommand.workers.dev  (PROXIED)

The * (wildcard) makes smithroofing.sitecommand.io work for every contractor.

==============================================================
## STEP 3 — CREATE FIREBASE PROJECT (free, 10 minutes)
==============================================================

1. Go to console.firebase.google.com
2. Click "Add project" → Name: sitecommand-saas
3. Enable Google Analytics: yes → Continue → Create

Enable Firestore:
4. Left sidebar → Build → Firestore Database
5. Create database → Start in production mode
6. Location: us-east1 → Done

Enable Authentication:
7. Left sidebar → Build → Authentication → Get started
8. Sign-in method → Email/Password → Enable → Save

Get your config:
9. Project settings (gear icon) → Your apps → Add app → Web (</>)
10. App nickname: SiteCommand Platform → Register app
11. Copy the firebaseConfig object — you need all these values:
    - apiKey
    - authDomain
    - projectId
    - storageBucket
    - messagingSenderId
    - appId

==============================================================
## STEP 4 — UPDATE FILES WITH YOUR FIREBASE CONFIG
==============================================================

In platform.html — find this line and replace:
  const FB_CONFIG = {
    apiKey: "SITECOMMAND_FIREBASE_API_KEY",
    ...
  }

Replace all placeholder values with your real Firebase config.

In worker.js — find and replace:
  const FIREBASE_PROJECT = 'sitecommand-saas';   ← keep this
  const FIREBASE_API_KEY = 'SITECOMMAND_FIREBASE_API_KEY';  ← replace

==============================================================
## STEP 5 — CREATE GITHUB REPOS (free, 10 minutes)
==============================================================

Go to github.com — create these 2 repos:

REPO 1: sitecommand-platform (PUBLIC)
Upload these files:
  - index.html
  - checkout.html  
  - platform.html
  - setup-progress.html
  - email-ai.html
  - lead-finder.html
  - social-media.html
  - admin.html
  - terms.html
  - privacy.html

Enable GitHub Pages:
  Settings → Pages → Source: main branch → Save
  Your platform lives at: sitecommand-io.github.io/sitecommand-platform

REPO 2: sitecommand-worker (PRIVATE)
Upload these files:
  - worker.js
  - wrangler.toml

==============================================================
## STEP 6 — DEPLOY CLOUDFLARE WORKER (free, 10 minutes)
==============================================================

This makes all contractor websites work automatically.

On your Mac, open Terminal:

1. Install Node.js if not installed:
   brew install node

2. Install Wrangler:
   npm install -g wrangler

3. Login to Cloudflare:
   wrangler login
   (opens browser — sign in to Cloudflare)

4. Go to your worker folder:
   cd ~/Documents/sitecommand-worker

5. Deploy:
   wrangler deploy

6. In wrangler.toml — update with your real zone ID:
   - Go to Cloudflare dashboard → sitecommand.io
   - Right sidebar → Zone ID → copy it
   - Paste in wrangler.toml

==============================================================
## STEP 7 — TEST EVERYTHING
==============================================================

Test 1 — Main website:
  Visit: sitecommand.io
  Should show: your sales landing page

Test 2 — Contractor website:
  Visit: test.sitecommand.io
  Should show: "Site Not Found" page (correct — no contractor named "test")

Test 3 — Sign up:
  Visit: sitecommand.io/checkout.html
  Create a test account
  Check Firebase console → contractors collection

Test 4 — Platform:
  Visit: platform.html
  Login with test account
  Dashboard should show with your company slug in subdomain display

Test 5 — Contractor website after signup:
  Visit: yourslug.sitecommand.io
  Should show your full 8-page website

==============================================================
## STEP 8 — SET UP YOUR MAC SERVER (already done!)
==============================================================

Your Mac server at ~/Documents/ASC-Server/ handles:
- AI phone calls for ALL contractors (each gets their own number)
- SMS notifications
- New signup processing

Add to your .env file:
SITECOMMAND_GITHUB_TOKEN=your_github_token
SITECOMMAND_GITHUB_ORG=sitecommand-io

Get GitHub token:
1. github.com → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token → Name: SiteCommand
4. Check: repo (full control)
5. Generate → copy token → paste in .env

==============================================================
## STEP 9 — ADD STRIPE FOR PAYMENTS (30 minutes)
==============================================================

1. Go to stripe.com → sign up
2. Dashboard → Products → Add product
3. Create 3 products:
   - Starter: $97/month recurring
   - Professional: $197/month recurring  
   - Elite: $297/month recurring
4. Get payment links for each plan
5. Update checkout.html with your Stripe payment links

For full Stripe integration (webhooks, automatic billing):
   This requires server-side code — I can build this next.

==============================================================
## STEP 10 — GO LIVE CHECKLIST
==============================================================

Before launching:
[ ] sitecommand.io domain purchased
[ ] Cloudflare set up with wildcard DNS
[ ] Firebase project created and configured
[ ] GitHub repos created with files uploaded
[ ] GitHub Pages enabled (platform live)
[ ] Cloudflare Worker deployed
[ ] Test signup worked
[ ] Test contractor website shows at yourslug.sitecommand.io
[ ] Stripe payment links added to checkout
[ ] Mac server running with ngrok
[ ] Test phone call to AI assistant

==============================================================
## COST SUMMARY (monthly)
==============================================================

sitecommand.io domain:    $3/month (~$35/year)
Cloudflare:               FREE
Firebase:                 FREE (Spark plan)
GitHub:                   FREE
Twilio (per contractor):  ~$1.15/month per number + usage
Mac server:               FREE (your Mac)
ngrok:                    FREE (URL changes on restart) or $8/mo permanent

TOTAL: ~$3-5/month to run the entire platform

Revenue at 10 clients on Professional: $1,970/month
Revenue at 25 clients on Professional: $4,925/month
Revenue at 50 clients on Professional: $9,850/month

==============================================================
## SUPPORT CONTACTS
==============================================================

Cloudflare support: cloudflare.com/support
Firebase support:   firebase.google.com/support
Twilio support:     twilio.com/help
GitHub support:     support.github.com
