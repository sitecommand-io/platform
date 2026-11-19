import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages = [
  'email-ai.html', 'permits.html', 'video-gen.html',
  'lead-finder.html', 'real-estate.html', 'social-media.html', 'youtube-studio.html',
];

for (const page of pages) {
  test(page + ' navigation does not apply sticky flex positioning to body', () => {
    const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    assert.match(html, /<header[^>]*class="[^"]*(?:sc-bar|sc-header)/);
    const css = html.match(/<style[^>]*>([\\s\\S]*?)<\\/style>/gi)?.join('\\n') ?? '';
    const rules = [...css.matchAll(/([^{}]+)\\{([^{}]*)\\}/g)];
    assert.ok(rules.some(([, selector, body]) => /\\.(?:sc-bar|sc-header)/.test(selector) && /display\\s*:\\s*flex/.test(body) && /position\\s*:\\s*sticky/.test(body)), 'header has its own layout styles');
    assert.ok(!rules.some(([, selector, body]) => selector.trim().split(',').some(s => s.trim() === 'body') && /display\\s*:\\s*flex/.test(body) && /position\\s*:\\s*sticky/.test(body)), 'body must not inherit sticky header layout');
  });
}
