// Read-only smoke checks. Run with: node --test tests/source-smoke.test.mjs
// No Firebase, Cloudflare, Stripe, or customer data is accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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
