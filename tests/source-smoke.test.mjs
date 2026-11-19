// Read-only smoke checks. Run with: node --test tests/source-smoke.test.mjs
// No Firebase, Cloudflare, Stripe, or customer data is accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = name => readFileSync(resolve(root, name), 'utf8');

test('all essential pages exist and contain HTML', () => {
  for (const name of ['index.html', 'checkout.html', 'signup.html', 'platform.html', 'admin.html', 'client-portal.html']) {
    assert.ok(existsSync(resolve(root, name)), `Missing ${name}`);
    assert.match(read(name), /<!doctype html|<html\b/i, `Invalid HTML entry: ${name}`);
  }
});

test('signup retains Firebase authentication integration', () => {
  const signup = read('signup.html');
  assert.match(signup, /firebase-auth\.js/);
  assert.match(signup, /createUserWithEmailAndPassword/);
});

test('customer portal retains Firestore integration', () => {
  const portal = read('client-portal.html');
  assert.match(portal, /firebase-firestore\.js/);
  assert.match(portal, /signInWithEmailAndPassword/);
});

test('checkout retains its Firestore integration', () => {
  assert.match(read('checkout.html'), /firebase-firestore\.js/);
});

test('deployment guide remains available', () => {
  assert.ok(existsSync(resolve(root, 'FULL-DEPLOY-GUIDE.md')));
});

test('redesigned preview has one hero, pricing section, and safe links', () => {
  const preview = read('preview-v2.html');
  assert.equal((preview.match(/<h1\b/g) || []).length, 1);
  assert.equal((preview.match(/id="pricing"/g) || []).length, 1);
  assert.match(preview, /href="signup.html"/);
  assert.match(preview, /href="platform.html"/);
  assert.doesNotMatch(preview, /firebase|deleteDoc|localStorage/i);
});

test('local HTML navigation links resolve to existing pages', () => {
  const pages = readdirSync(root).filter(name => name.endsWith('.html'));
  const missing = [];
  for (const page of pages) {
    const html = read(page);
    for (const match of html.matchAll(/href=["']([^"']+)["']/g)) {
      const href = match[1].trim();
      if (!href || href.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
      const target = href.split(/[?#]/, 1)[0];
      if (!target || target.startsWith('/') || target.includes('${')) continue;
      if (target.endsWith('.html') && !existsSync(resolve(root, target))) {
        missing.push(`${page} -> ${target}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'Broken local HTML links');
});

test('dashboard navigation groups tools and preserves all destinations', () => {
  const dashboard = read('platform.html');
  assert.match(dashboard, /aria-label="SiteCommand tools"/);
  assert.match(dashboard, /<summary>✦ AI & Marketing<\/summary>/);
  assert.match(dashboard, /<summary>▤ Operations<\/summary>/);
  for (const name of ['email-ai.html', 'lead-finder.html', 'social-media.html', 'video-gen.html', 'youtube-studio.html', 'ai-assistant.html', 'permits.html', 'real-estate.html', 'siteeditor.html']) {
    assert.ok(dashboard.includes('href="' + name + '"'), 'Missing tool: ' + name);
  }
});

test('document intelligence is linked and keeps files local', () => {
  const page = read('document-ai.html');
  const dashboard = read('platform.html');
  assert.match(dashboard, /href="document-ai\.html"/);
  assert.match(page, /id="files"/);
  assert.match(page, /id="askform"/);
  assert.match(page, /Sources:/);
  assert.match(page, /getDocument/);
  assert.match(page, /extractRawText/);
  assert.doesNotMatch(page, /firebase|firestore|localStorage|indexedDB|fetch\(/i);
});
