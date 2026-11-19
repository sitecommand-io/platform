import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pages = ['admin','ai-assistant','checkout','client-portal','deal-finder','email-ai','index','lead-finder','permits','platform','preview-v2','privacy','real-estate','setup-progress','signup','siteeditor','social-media','terms','video-gen','youtube-studio'];
const css = readFileSync(new URL('../sitecommand-navy.css', import.meta.url),'utf8');
test('shared platform theme provides light workspace and matching cards',()=>{
  assert.match(css,/body\.sc-workspace\{background:#f1f5fc!important/);
  assert.match(css,/body\.sc-workspace \.sc-sidebar\{background:#fff!important/);
  assert.match(css,/body\.sc-workspace :is\(\.wiz-card,.panel,.card/);
});
for(const page of pages)test(page+' loads the current shared theme',()=>{
  const html=readFileSync(new URL('../'+page+'.html',import.meta.url),'utf8');
  assert.match(html,/sitecommand-navy\.css\?v=3/);
});
