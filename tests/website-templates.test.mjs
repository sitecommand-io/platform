import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../siteeditor.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../sitecommand-templates.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../sitecommand-templates.css',import.meta.url),'utf8');
test('website editor provides layouts tab, preview, save and current site',()=>{
  for(const id of ['tab-templates','sc-template-grid','sc-template-preview','sc-template-save','sc-template-stage','sc-template-site'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/sc-template-save-request/);
  assert.match(html,/websiteTemplate:templateId/);
  assert.match(html,/sc-template-data/);
});
test('seven distinct selectable layouts exist',()=>{
  for(const id of ['classic','modern','bold','studio','editorial','craft','architectural-premium'])assert.match(js,new RegExp("id:'"+id+"'"));
  assert.equal((js.match(/\{id:'/g)||[]).length,7);
  assert.match(css,/\.sc-template-site\[data-template=bold\]/);
  assert.match(css,/\.sc-template-site\[data-template=studio\]/);
});
test('template save writes only selected template and timestamp',()=>{
  assert.match(html,/setDoc\(doc\(db,'contractors',userUID\),\{websiteTemplate:templateId,updatedAt:serverTimestamp\(\)\},\{merge:true\}\)/);
  assert.match(js,/textContent=name/);
  assert.doesNotMatch(js,/innerHTML\s*=\s*[^;]*\b(name|tag|about|phone)\b/);
});

test('every displayed layout is accepted by the save handler and failures are reported',()=>{
  const ids=[...js.matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
  const handler=html.slice(html.indexOf("window.addEventListener('sc-template-save-request'"));
  assert.equal(ids.length,7);
  for(const id of ids)assert.ok(handler.includes("'"+id+"'"),'save handler rejects '+id);
  assert.match(handler,/sc-template-save-result/);
  assert.match(handler,/Please sign in to save your layout/);
});
