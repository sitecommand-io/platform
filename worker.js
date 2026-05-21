/**
 * SiteCommand — Cloudflare Worker
 * Serves all contractor websites dynamically
 * 
 * Routes:
 *   smithroofing.sitecommand.io/* → contractor's website
 *   smithroofing.com/*            → same (custom domain)
 *   sitecommand.io/*              → main platform
 * 
 * Deploy: wrangler deploy
 * Free tier: 100,000 requests/day
 */

// ── FIREBASE CONFIG ─────────────────────────────────────────────
const FIREBASE_PROJECT = 'sitecommand-saas';
const FIREBASE_API_KEY = 'SITECOMMAND_FIREBASE_API_KEY';

// ── MAIN HANDLER ────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url      = new URL(request.url);
    const hostname = url.hostname; // e.g. smithroofing.sitecommand.io
    const path     = url.pathname; // e.g. /services.html

    // ── 1. Main platform domain → serve platform files
    if (hostname === 'sitecommand.io' || hostname === 'www.sitecommand.io') {
      return fetch('https://sitecommand-io.github.io/platform' + (path === '/' ? '/index.html' : path));
    }

    // ── 2. Subdomain of sitecommand.io → find contractor by slug
    let contractorSlug = null;
    if (hostname.endsWith('.sitecommand.io')) {
      contractorSlug = hostname.replace('.sitecommand.io', '');
    }

    // ── 3. Custom domain → look up contractor by custom domain
    let contractor = null;
    if (contractorSlug) {
      contractor = await getContractorBySlug(contractorSlug, env);
    } else {
      contractor = await getContractorByDomain(hostname, env);
    }

    if (!contractor) {
      return new Response(notFoundPage(hostname), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // ── 4. Route to correct page
    const page = getPageName(path);
    const html = renderPage(page, contractor);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'X-Powered-By': 'SiteCommand',
      },
    });
  },
};

// ── FIREBASE HELPERS ──────────────────────────────────────────────
async function getContractorBySlug(slug, env) {
  const key = env?.CONTRACTOR_CACHE ? await env.CONTRACTOR_CACHE.get('slug:' + slug) : null;
  if (key) return JSON.parse(key);
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/contractors?key=${FIREBASE_API_KEY}`
    );
    const data = await res.json();
    if (!data.documents) return null;
    for (const doc of data.documents) {
      const d = firestoreToObj(doc.fields);
      if (d.slug === slug) return d;
    }
  } catch(e) { console.error('Firebase error:', e); }
  return null;
}

async function getContractorByDomain(domain, env) {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/contractors?key=${FIREBASE_API_KEY}`
    );
    const data = await res.json();
    if (!data.documents) return null;
    for (const doc of data.documents) {
      const d = firestoreToObj(doc.fields);
      if (d.customDomain === domain || d.customDomain === 'www.' + domain) return d;
    }
  } catch(e) { console.error('Firebase domain lookup:', e); }
  return null;
}

function firestoreToObj(fields) {
  if (!fields) return {};
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue  !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue);
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.arrayValue)  obj[k] = (v.arrayValue.values||[]).map(i => i.stringValue || '');
  }
  return obj;
}

function getPageName(path) {
  const p = path.replace(/\/$/, '') || '/';
  if (p === '/' || p === '/index.html') return 'home';
  if (p.includes('services'))  return 'services';
  if (p.includes('projects'))  return 'projects';
  if (p.includes('team'))      return 'team';
  if (p.includes('process'))   return 'process';
  if (p.includes('contact'))   return 'contact';
  if (p.includes('portal'))    return 'portal';
  if (p.includes('crew'))      return 'crew';
  return 'home';
}

// ── PAGE RENDERER ─────────────────────────────────────────────────
function renderPage(page, c) {
  const accent  = c.color || '#c8a96e';
  const name    = c.companyName || 'Your Company';
  const phone   = c.bizPhone   || c.aiPhone || '';
  const email   = c.email      || '';
  const loc     = c.location   || c.city + ', ' + c.state || '';
  const tagline = c.tagline    || 'Professional Construction Services';
  const svcs    = c.services   || ['General Contracting', 'Remodeling', 'Roofing'];
  const slug    = c.slug       || '';

  const shared = sharedStyles(accent, name, phone, slug);

  switch(page) {
    case 'home':     return homePage(shared, c, accent, name, phone, email, loc, tagline, svcs, slug);
    case 'services': return servicesPage(shared, c, accent, name, phone, svcs, loc);
    case 'projects': return projectsPage(shared, c, accent, name, phone, loc);
    case 'team':     return teamPage(shared, c, accent, name, phone, loc);
    case 'process':  return processPage(shared, c, accent, name, phone, loc);
    case 'contact':  return contactPage(shared, c, accent, name, phone, email, loc);
    case 'portal':   return portalRedirect(c, accent, name, slug);
    case 'crew':     return crewRedirect(c, accent, name, slug);
    default:         return homePage(shared, c, accent, name, phone, email, loc, tagline, svcs, slug);
  }
}

// ── SHARED STYLES & NAV ───────────────────────────────────────────
function sharedStyles(accent, name, phone, slug) {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--accent:${accent};--black:#0a0a0a;--dark:#111;--surface:#161616;--border:#252525;--mid:#666;--light:#aaa;--white:#f4f2ee}
    html{scroll-behavior:smooth}
    body{font-family:'DM Sans',sans-serif;background:var(--black);color:var(--white);-webkit-font-smoothing:antialiased}
    a{text-decoration:none;color:inherit}
    nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;background:rgba(10,10,10,.96);border-bottom:1px solid rgba(255,255,255,.06);backdrop-filter:blur(12px)}
    .brand{font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:.06em;color:${accent}}
    .nav-links{display:flex;gap:1.75rem;align-items:center}
    .nav-links a{font-size:.84rem;color:var(--light);transition:color .15s}
    .nav-links a:hover{color:var(--white)}
    .nav-cta{background:${accent}!important;color:#000!important;font-weight:700;padding:.42rem 1.1rem;border-radius:6px}
    section{padding:5.5rem 1.5rem}
    .container{max-width:1080px;margin:0 auto}
    .section-label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:${accent};margin-bottom:.75rem}
    .section-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,4vw,2.8rem);letter-spacing:.03em;margin-bottom:1rem;line-height:1.05}
    .section-sub{font-size:.95rem;color:var(--light);line-height:1.75;max-width:560px}
    footer{background:#0a0a0a;border-top:1px solid #1a1a1a;padding:2.5rem 2rem;text-align:center}
    .footer-brand{font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:${accent};margin-bottom:.35rem}
    .footer-links{display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap;margin:.85rem 0}
    .footer-links a{font-size:.8rem;color:var(--mid);transition:color .15s}
    .footer-links a:hover{color:${accent}}
    .footer-copy{font-size:.74rem;color:var(--mid)}
    .btn-primary{display:inline-block;background:${accent};color:#000;font-size:.9rem;font-weight:700;padding:.8rem 2.1rem;border-radius:7px;transition:opacity .2s}
    .btn-primary:hover{opacity:.85}
    .btn-outline{display:inline-block;background:transparent;color:var(--white);font-size:.9rem;font-weight:600;padding:.8rem 2.1rem;border-radius:7px;border:1.5px solid #333;transition:all .2s}
    .btn-outline:hover{border-color:${accent};color:${accent}}
    @media(max-width:680px){.nav-links{display:none}.container{padding:0 .25rem}}
  </style>
</head>
<body>
<nav>
  <a href="/" class="brand">${name}</a>
  <div class="nav-links">
    <a href="/">Home</a>
    <a href="/services">Services</a>
    <a href="/projects">Projects</a>
    <a href="/team">Our Team</a>
    <a href="/process">Our Process</a>
    <a href="/contact">Contact</a>
    <a href="/portal" class="nav-cta">Client Portal</a>
  </div>
</nav>`;
}

function footerHTML(name, phone, email, loc, accent, slug) {
  return `
<footer>
  <div class="footer-brand">${name}</div>
  <div style="font-size:.84rem;color:#666;margin-bottom:.75rem">${loc} · ${phone}</div>
  <div class="footer-links">
    <a href="/">Home</a><a href="/services">Services</a><a href="/projects">Projects</a>
    <a href="/team">Team</a><a href="/process">Process</a><a href="/contact">Contact</a>
    <a href="/portal" style="color:${accent}">Client Portal</a>
    <a href="/crew">Crew Login</a>
  </div>
  <div class="footer-copy">© ${new Date().getFullYear()} ${name}. Powered by <a href="https://sitecommand.io" style="color:${accent}">SiteCommand</a>.</div>
</footer>
</body></html>`;
}

// ── HOME PAGE ─────────────────────────────────────────────────────
function homePage(shared, c, accent, name, phone, email, loc, tagline, svcs, slug) {
  const icons = ['🏗️','🔨','🏠','⚡','💧','🎨','🪟','🔧','🏗️'];
  return shared + `
<style>
  .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:7rem 1.5rem 4rem;background:radial-gradient(ellipse at 50% 0%,${accent}18 0%,transparent 60%);position:relative;overflow:hidden}
  .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:50px 50px;pointer-events:none}
  .hero h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(3rem,8vw,6rem);letter-spacing:.02em;line-height:.92;margin-bottom:1.25rem}
  .hero h1 em{color:${accent};font-style:normal}
  .hero p{font-size:1.05rem;color:var(--light);max-width:520px;margin:0 auto 2.25rem;line-height:1.7}
  .hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:3rem}
  .trust-row{display:flex;gap:2rem;justify-content:center;flex-wrap:wrap}
  .trust-item{display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--mid)}
  .trust-item span{color:${accent}}
  .svc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem;margin-top:2.5rem}
  .svc-card{background:#161616;border:1px solid #252525;border-radius:12px;padding:1.6rem;transition:all .2s}
  .svc-card:hover{border-color:${accent};transform:translateY(-3px)}
  .svc-icon{font-size:1.8rem;margin-bottom:.7rem}
  .svc-name{font-size:.96rem;font-weight:700;margin-bottom:.35rem}
  .svc-desc{font-size:.81rem;color:var(--light);line-height:1.6}
  .why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem;margin-top:2.5rem}
  .why-card{text-align:center;padding:1.75rem 1.25rem;background:#111;border:1px solid #1e1e1e;border-radius:12px}
  .why-num{font-family:'Bebas Neue',sans-serif;font-size:2.8rem;color:${accent};letter-spacing:.02em;line-height:1}
  .why-label{font-size:.82rem;color:var(--mid);margin-top:.3rem}
  .cta-band{background:linear-gradient(135deg,${accent}18,${accent}06);border:1px solid ${accent}33;border-radius:16px;padding:3.5rem 2rem;text-align:center;max-width:780px;margin:0 auto}
  @media(max-width:680px){.svc-grid{grid-template-columns:1fr 1fr}.why-grid{grid-template-columns:1fr 1fr}}
</style>

<section class="hero">
  <div class="hero-grid"></div>
  <div style="position:relative;z-index:1">
    <div style="display:inline-block;background:${accent}18;border:1px solid ${accent}44;border-radius:99px;font-size:.78rem;font-weight:600;color:${accent};padding:.3rem .9rem;margin-bottom:1.5rem;letter-spacing:.04em">
      📍 Licensed & Insured · ${loc}
    </div>
    <h1>${name.replace(/ /g,'<br>')}<br><em>Construction</em></h1>
    <p>${tagline}</p>
    <div class="hero-btns">
      <a href="/contact" class="btn-primary">Get a Free Estimate →</a>
      <a href="tel:${phone.replace(/\D/g,'')}" class="btn-outline">Call ${phone}</a>
    </div>
    <div class="trust-row">
      <div class="trust-item"><span>✓</span> Licensed & Insured</div>
      <div class="trust-item"><span>✓</span> Free Estimates</div>
      <div class="trust-item"><span>✓</span> Satisfaction Guaranteed</div>
      <div class="trust-item"><span>✓</span> Local ${loc}</div>
    </div>
  </div>
</section>

<section style="background:#0f0f0f">
  <div class="container">
    <div class="section-label">What We Do</div>
    <h2 class="section-title">Our Services</h2>
    <p class="section-sub">We handle everything from small repairs to full renovations. Licensed, insured, and committed to quality on every job.</p>
    <div class="svc-grid">
      ${svcs.slice(0,6).map((s,i) => `
      <div class="svc-card">
        <div class="svc-icon">${icons[i]}</div>
        <div class="svc-name">${s}</div>
        <div class="svc-desc">Professional ${s.toLowerCase()} services in ${loc}. Quality workmanship guaranteed.</div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:2rem">
      <a href="/services" class="btn-outline">View All Services →</a>
    </div>
  </div>
</section>

<section>
  <div class="container">
    <div class="why-grid">
      <div class="why-card"><div class="why-num">100%</div><div class="why-label">Satisfaction Guaranteed</div></div>
      <div class="why-card"><div class="why-num">24hr</div><div class="why-label">Response Time</div></div>
      <div class="why-card"><div class="why-num">Free</div><div class="why-label">Estimates Always</div></div>
    </div>
  </div>
</section>

<section style="background:#0f0f0f">
  <div class="container">
    <div class="cta-band">
      <div class="section-label">Ready to Start?</div>
      <h2 class="section-title">Get Your Free Estimate Today</h2>
      <p style="color:var(--light);margin:0 auto 2rem;max-width:480px;line-height:1.7">No obligation. We will review your project and get back to you within 24 hours with a detailed estimate.</p>
      <a href="/contact" class="btn-primary" style="font-size:1rem;padding:.9rem 2.5rem">Request Free Estimate →</a>
      <div style="margin-top:1.25rem;font-size:.84rem;color:var(--mid)">Or call us directly: <a href="tel:${phone.replace(/\D/g,'')}" style="color:${accent}">${phone}</a></div>
    </div>
  </div>
</section>

${footerHTML(name, phone, email, loc, accent, slug)}`;
}

// ── SERVICES PAGE ─────────────────────────────────────────────────
function servicesPage(shared, c, accent, name, phone, svcs, loc) {
  const icons = ['🏗️','🔨','🏠','⚡','💧','🎨','🪟','🔧','🏡','🛁','🪞','🔩'];
  const descs = [
    'Full-scope general contracting for residential and commercial projects. From permits to final walkthrough.',
    'Complete kitchen transformations — cabinets, countertops, flooring, backsplash, and appliances.',
    'Full bathroom remodels including tile, vanity, shower, plumbing fixtures, and lighting.',
    'Roof replacement and repair for all types. Shingles, flat roofs, metal. Fully insured.',
    'Hardwood, LVP, tile, and carpet installation. Subfloor repair and leveling included.',
    'Interior and exterior painting. Drywall repair, priming, and professional finish coats.',
    'New window and door installation. Energy-efficient options available. Fully sealed and insulated.',
    'Licensed HVAC installation, replacement, and repair. New systems and ductwork.',
    'Framing, drywall, insulation, and structural work for additions and renovations.',
    'Home additions, garage conversions, basement finishing, and new construction.',
    'Siding installation and repair. Vinyl, fiber cement, and wood options available.',
    'Deck building, porch construction, fence installation, and exterior improvements.',
  ];
  return shared + `
<style>
  .page-hero{padding:9rem 1.5rem 4rem;text-align:center;background:radial-gradient(ellipse at 50% 0%,${accent}15 0%,transparent 60%)}
  .svc-full-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem;margin-top:2.5rem}
  .svc-full-card{background:#161616;border:1px solid #252525;border-radius:14px;padding:2rem;display:flex;gap:1.25rem;align-items:flex-start;transition:border-color .2s}
  .svc-full-card:hover{border-color:${accent}}
  .sfc-icon{font-size:2.2rem;flex-shrink:0;margin-top:.1rem}
  .sfc-name{font-size:1.05rem;font-weight:700;margin-bottom:.45rem}
  .sfc-desc{font-size:.84rem;color:var(--light);line-height:1.65}
  @media(max-width:680px){.svc-full-grid{grid-template-columns:1fr}}
</style>
<div class="page-hero">
  <div class="section-label">What We Offer</div>
  <h1 class="section-title" style="font-size:clamp(2.5rem,5vw,4rem)">Our Services</h1>
  <p class="section-sub" style="margin:0 auto">From small repairs to complete renovations — we do it all in ${loc}.</p>
</div>
<section>
  <div class="container">
    <div class="svc-full-grid">
      ${svcs.map((s,i) => `
      <div class="svc-full-card">
        <div class="sfc-icon">${icons[i % icons.length]}</div>
        <div>
          <div class="sfc-name">${s}</div>
          <div class="sfc-desc">${descs[i % descs.length]}</div>
          <a href="/contact" style="font-size:.8rem;color:${accent};font-weight:600;margin-top:.65rem;display:inline-block">Get a Quote →</a>
        </div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:3rem;padding:2.5rem;background:#111;border-radius:14px;border:1px solid #1e1e1e">
      <h3 style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:.04em;margin-bottom:.75rem">Don't See What You Need?</h3>
      <p style="color:var(--light);margin-bottom:1.5rem;font-size:.9rem">We handle many types of construction projects. Call us and we will let you know if we can help.</p>
      <a href="tel:${phone.replace(/\D/g,'')}" class="btn-primary">Call ${phone}</a>
    </div>
  </div>
</section>
${footerHTML(name, phone, c.email||'', loc, accent, c.slug||'')}`;
}

// ── PROJECTS PAGE ──────────────────────────────────────────────────
function projectsPage(shared, c, accent, name, phone, loc) {
  return shared + `
<style>
  .page-hero{padding:9rem 1.5rem 4rem;text-align:center;background:radial-gradient(ellipse at 50% 0%,${accent}15 0%,transparent 60%)}
  .proj-placeholder{display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem;margin-top:2.5rem}
  .proj-card{background:#161616;border:1px solid #252525;border-radius:12px;overflow:hidden;transition:transform .2s}
  .proj-card:hover{transform:translateY(-3px)}
  .proj-img{height:200px;background:linear-gradient(135deg,${accent}22,${accent}08);display:flex;align-items:center;justify-content:center;font-size:3rem}
  .proj-info{padding:1.25rem}
  .proj-type{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:${accent};margin-bottom:.35rem}
  .proj-name{font-size:.96rem;font-weight:700;margin-bottom:.3rem}
  .proj-loc{font-size:.78rem;color:var(--mid)}
  @media(max-width:680px){.proj-placeholder{grid-template-columns:1fr 1fr}}
</style>
<div class="page-hero">
  <div class="section-label">Our Work</div>
  <h1 class="section-title" style="font-size:clamp(2.5rem,5vw,4rem)">Recent Projects</h1>
  <p class="section-sub" style="margin:0 auto">A sample of our recent work across ${loc} and surrounding areas.</p>
</div>
<section>
  <div class="container">
    <div class="proj-placeholder">
      ${['Kitchen Renovation','Roof Replacement','Bathroom Remodel','Full Home Renovation','Deck Addition','Flooring Installation'].map((p,i) => `
      <div class="proj-card">
        <div class="proj-img">${['🍳','🏠','🚿','🏡','🌿','🪵'][i]}</div>
        <div class="proj-info">
          <div class="proj-type">${(c.services||['General Contracting'])[i % (c.services||['General Contracting']).length]}</div>
          <div class="proj-name">${p}</div>
          <div class="proj-loc">📍 ${loc}</div>
        </div>
      </div>`).join('')}
    </div>
    <p style="text-align:center;font-size:.82rem;color:var(--mid);margin-top:2rem">Projects shown are representative. Contact us to see photos specific to your project type.</p>
  </div>
</section>
${footerHTML(name, phone, c.email||'', loc, accent, c.slug||'')}`;
}

// ── TEAM PAGE ─────────────────────────────────────────────────────
function teamPage(shared, c, accent, name, phone, loc) {
  const owner = c.ownerName || 'The Owner';
  const first = owner.split(' ')[0];
  return shared + `
<style>
  .page-hero{padding:9rem 1.5rem 4rem;text-align:center;background:radial-gradient(ellipse at 50% 0%,${accent}15 0%,transparent 60%)}
  .team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-top:2.5rem}
  .team-card{background:#161616;border:1px solid #252525;border-radius:14px;padding:2rem;text-align:center;transition:border-color .2s}
  .team-card:hover{border-color:${accent}}
  .team-avatar{width:72px;height:72px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:#000;margin:0 auto 1rem}
  .team-name{font-size:1rem;font-weight:700;margin-bottom:.25rem}
  .team-role{font-size:.78rem;color:${accent};font-weight:600;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.04em}
  .team-bio{font-size:.82rem;color:var(--light);line-height:1.65}
  @media(max-width:680px){.team-grid{grid-template-columns:1fr 1fr}}
</style>
<div class="page-hero">
  <div class="section-label">The People</div>
  <h1 class="section-title" style="font-size:clamp(2.5rem,5vw,4rem)">Meet Our Team</h1>
  <p class="section-sub" style="margin:0 auto">Experienced, licensed, and dedicated professionals serving ${loc}.</p>
</div>
<section>
  <div class="container">
    <div class="team-grid">
      <div class="team-card">
        <div class="team-avatar">${owner.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="team-name">${owner}</div>
        <div class="team-role">Owner & General Contractor</div>
        <div class="team-bio">${first} founded ${name} with a commitment to quality craftsmanship and honest work. Licensed and insured with years of hands-on construction experience in ${loc}.</div>
      </div>
      <div class="team-card">
        <div class="team-avatar" style="background:#333;color:${accent}">PM</div>
        <div class="team-name">Project Management</div>
        <div class="team-role">On-Site Supervision</div>
        <div class="team-bio">Our project managers oversee every job from start to finish — ensuring timelines are met, quality standards are maintained, and clients are kept informed.</div>
      </div>
      <div class="team-card">
        <div class="team-avatar" style="background:#333;color:${accent}">CR</div>
        <div class="team-name">Skilled Crew</div>
        <div class="team-role">Trade Specialists</div>
        <div class="team-bio">Our crew members are experienced tradespeople — carpenters, roofers, painters, and more — all vetted, trained, and committed to doing the job right.</div>
      </div>
    </div>
  </div>
</section>
${footerHTML(name, phone, c.email||'', loc, accent, c.slug||'')}`;
}

// ── PROCESS PAGE ──────────────────────────────────────────────────
function processPage(shared, c, accent, name, phone, loc) {
  const steps = [
    {icon:'📞', title:'Free Consultation', desc:'Call or fill out our contact form. We respond within 24 hours to discuss your project and schedule a site visit.'},
    {icon:'📋', title:'Detailed Estimate', desc:'We visit your property, assess the scope of work, and provide a detailed written estimate with no hidden fees.'},
    {icon:'📄', title:'Contract & Permits', desc:'Once approved, we sign a clear contract and handle all required permits for your project in ' + loc + '.'},
    {icon:'🏗️', title:'Construction Begins', desc:'Our licensed crew starts work on schedule. You have 24/7 access to your client portal to track progress and view photos.'},
    {icon:'✅', title:'Quality Inspection', desc:'Before completion, we do a thorough walkthrough to ensure everything meets our quality standards and your expectations.'},
    {icon:'🎉', title:'Final Handoff', desc:'We do a final walkthrough with you, ensure everything is perfect, and hand over all warranties and documentation.'},
  ];
  return shared + `
<style>
  .page-hero{padding:9rem 1.5rem 4rem;text-align:center;background:radial-gradient(ellipse at 50% 0%,${accent}15 0%,transparent 60%)}
  .steps-list{display:flex;flex-direction:column;gap:1.1rem;margin-top:2.5rem;max-width:780px;margin-left:auto;margin-right:auto}
  .step-row{display:flex;gap:1.5rem;align-items:flex-start;background:#161616;border:1px solid #252525;border-radius:12px;padding:1.5rem 1.75rem;transition:border-color .2s}
  .step-row:hover{border-color:${accent}}
  .step-num{width:48px;height:48px;border-radius:50%;background:${accent}18;border:2px solid ${accent}44;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0}
  .step-title{font-size:1rem;font-weight:700;margin-bottom:.35rem}
  .step-desc{font-size:.84rem;color:var(--light);line-height:1.65}
</style>
<div class="page-hero">
  <div class="section-label">How We Work</div>
  <h1 class="section-title" style="font-size:clamp(2.5rem,5vw,4rem)">Our Process</h1>
  <p class="section-sub" style="margin:0 auto">Simple, transparent, and stress-free from start to finish.</p>
</div>
<section>
  <div class="container">
    <div class="steps-list">
      ${steps.map((s,i) => `
      <div class="step-row">
        <div class="step-num">${s.icon}</div>
        <div>
          <div style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:${accent};margin-bottom:.2rem">Step ${i+1}</div>
          <div class="step-title">${s.title}</div>
          <div class="step-desc">${s.desc}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:3rem">
      <a href="/contact" class="btn-primary" style="font-size:1rem;padding:.9rem 2.5rem">Start With a Free Estimate →</a>
    </div>
  </div>
</section>
${footerHTML(name, phone, c.email||'', loc, accent, c.slug||'')}`;
}

// ── CONTACT PAGE ─────────────────────────────────────────────────
function contactPage(shared, c, accent, name, phone, email, loc) {
  return shared + `
<style>
  .page-hero{padding:9rem 1.5rem 4rem;text-align:center;background:radial-gradient(ellipse at 50% 0%,${accent}15 0%,transparent 60%)}
  .contact-wrap{display:grid;grid-template-columns:1fr 1.4fr;gap:2.5rem;margin-top:2.5rem;align-items:start}
  .contact-info{display:flex;flex-direction:column;gap:1.1rem}
  .ci-item{background:#161616;border:1px solid #252525;border-radius:12px;padding:1.25rem 1.5rem;display:flex;align-items:flex-start;gap:1rem}
  .ci-icon{font-size:1.5rem;flex-shrink:0;margin-top:.1rem}
  .ci-label{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:${accent};margin-bottom:.25rem}
  .ci-value{font-size:.9rem;color:var(--white);font-weight:500}
  .contact-form{background:#161616;border:1px solid #252525;border-radius:14px;padding:2rem}
  .fg{margin-bottom:1rem}
  .fg label{display:block;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#666;margin-bottom:.35rem}
  .fg input,.fg select,.fg textarea{width:100%;background:#0a0a0a;border:1.5px solid #252525;border-radius:6px;color:var(--white);font-size:.88rem;padding:.65rem .9rem;font-family:inherit;transition:border-color .2s}
  .fg input:focus,.fg select:focus,.fg textarea:focus{outline:none;border-color:${accent}}
  .fg textarea{resize:vertical;min-height:100px}
  .submit-btn{width:100%;background:${accent};color:#000;border:none;border-radius:7px;font-size:.92rem;font-weight:700;padding:.8rem;cursor:pointer;transition:opacity .2s;margin-top:.25rem}
  .submit-btn:hover{opacity:.85}
  @media(max-width:680px){.contact-wrap{grid-template-columns:1fr}}
</style>
<div class="page-hero">
  <div class="section-label">Reach Out</div>
  <h1 class="section-title" style="font-size:clamp(2.5rem,5vw,4rem)">Contact Us</h1>
  <p class="section-sub" style="margin:0 auto">Get your free estimate. We respond within 24 hours.</p>
</div>
<section>
  <div class="container">
    <div class="contact-wrap">
      <div class="contact-info">
        <div class="ci-item"><div class="ci-icon">📞</div><div><div class="ci-label">Phone</div><div class="ci-value"><a href="tel:${phone.replace(/\D/g,'')}" style="color:${accent}">${phone}</a></div></div></div>
        <div class="ci-item"><div class="ci-icon">📧</div><div><div class="ci-label">Email</div><div class="ci-value"><a href="mailto:${email}" style="color:${accent}">${email}</a></div></div></div>
        <div class="ci-item"><div class="ci-icon">📍</div><div><div class="ci-label">Location</div><div class="ci-value">${loc}</div></div></div>
        <div class="ci-item"><div class="ci-icon">🕐</div><div><div class="ci-label">Hours</div><div class="ci-value">Mon–Sat: 7am – 7pm<br>Emergency: 24/7</div></div></div>
        <div class="ci-item"><div class="ci-icon">🤖</div><div><div class="ci-label">AI Phone Assistant</div><div class="ci-value">Call anytime — our AI answers 24/7, captures your info, and a team member follows up within hours.</div></div></div>
      </div>
      <div class="contact-form">
        <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:1.25rem">Request a Free Estimate</h3>
        <div class="fg"><label>Full Name *</label><input id="cName" placeholder="John Smith"/></div>
        <div class="fg"><label>Phone *</label><input type="tel" id="cPhone" placeholder="(302) 000-0000"/></div>
        <div class="fg"><label>Email</label><input type="email" id="cEmail" placeholder="john@email.com"/></div>
        <div class="fg"><label>Service Needed</label>
          <select id="cService"><option value="">Select...</option>${(c.services||['General Contracting']).map(s=>`<option>${s}</option>`).join('')}</select>
        </div>
        <div class="fg"><label>Project Description *</label><textarea id="cDesc" placeholder="Tell us about your project — location, what you need done, any special requirements..."></textarea></div>
        <button class="submit-btn" onclick="submitContact(this)">Send Request →</button>
        <div id="contactMsg" style="font-size:.82rem;text-align:center;margin-top:.75rem;min-height:1rem"></div>
      </div>
    </div>
  </div>
</section>
${footerHTML(name, phone, email, loc, accent, c.slug||'')}
<script>
function submitContact(btn) {
  const name = document.getElementById('cName').value.trim();
  const phone = document.getElementById('cPhone').value.trim();
  const desc  = document.getElementById('cDesc').value.trim();
  const msg   = document.getElementById('contactMsg');
  if (!name || !phone || !desc) { msg.style.color='#e05252'; msg.textContent='Please fill in name, phone, and project description.'; return; }
  btn.textContent='Sending...'; btn.disabled=true;
  // TODO: POST to SiteCommand API to save lead
  setTimeout(() => {
    msg.style.color='#6ec87a';
    msg.textContent='✅ Request sent! We will contact you within 24 hours.';
    btn.textContent='Sent!';
  }, 1000);
}
</script>`;
}

// ── PORTAL REDIRECT ───────────────────────────────────────────────
function portalRedirect(c, accent, name, slug) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Client Portal — ${name}</title>
<style>body{font-family:sans-serif;background:#0a0a0a;color:#f4f2ee;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
.logo{font-size:1.5rem;color:${accent};margin-bottom:1rem;font-weight:700}
.spin{width:36px;height:36px;border:3px solid #333;border-top-color:${accent};border-radius:50%;animation:s .7s linear infinite;margin:.75rem auto}
@keyframes s{to{transform:rotate(360deg)}}</style>
</head><body>
<div><div class="logo">${name}</div><div class="spin"></div><p style="color:#666;font-size:.9rem">Loading your project portal...</p></div>
<script>
// Store contractor context for portal
localStorage.setItem('sc_contractor_slug','${slug}');
localStorage.setItem('sc_company_name','${name}');
localStorage.setItem('sc_accent_color','${accent}');
setTimeout(()=>window.location.href='https://mahousing2025.github.io/alisignatureconstruction/portal.html',1500);
</script></body></html>`;
}

// ── CREW REDIRECT ─────────────────────────────────────────────────
function crewRedirect(c, accent, name, slug) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Crew Login — ${name}</title>
<style>body{font-family:sans-serif;background:#0a0a0a;color:#f4f2ee;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
.logo{font-size:1.5rem;color:${accent};margin-bottom:1rem;font-weight:700}
.spin{width:36px;height:36px;border:3px solid #333;border-top-color:${accent};border-radius:50%;animation:s .7s linear infinite;margin:.75rem auto}
@keyframes s{to{transform:rotate(360deg)}}</style>
</head><body>
<div><div class="logo">${name}</div><div class="spin"></div><p style="color:#666;font-size:.9rem">Loading crew app...</p></div>
<script>
localStorage.setItem('sc_contractor_slug','${slug}');
localStorage.setItem('sc_company_name','${name}');
setTimeout(()=>window.location.href='https://mahousing2025.github.io/alisignatureconstruction/crew.html',1500);
</script></body></html>`;
}

// ── 404 PAGE ──────────────────────────────────────────────────────
function notFoundPage(hostname) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Not Found — SiteCommand</title>
<style>body{font-family:sans-serif;background:#0a0a0a;color:#f4f2ee;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}
h1{font-size:2rem;color:#c8a96e;margin-bottom:.75rem}p{color:#666;font-size:.9rem;line-height:1.7}a{color:#c8a96e}</style>
</head><body><div>
<h1>Site Not Found</h1>
<p>The contractor site for <strong>${hostname}</strong> does not exist or has not been set up yet.<br><br>
Are you a contractor? <a href="https://sitecommand.io">Sign up at SiteCommand →</a></p>
</div></body></html>`;
}
