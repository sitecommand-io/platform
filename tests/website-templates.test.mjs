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
test('six distinct selectable layouts exist',()=>{
  for(const id of ['classic','modern','bold','studio','editorial','craft'])assert.match(js,new RegExp("id:'"+id+"'"));
  assert.equal((js.match(/\{id:'/g)||[]).length,6);
  assert.match(css,/\.sc-template-site\[data-template=bold\]/);
  assert.match(css,/\.sc-template-site\[data-template=studio\]/);
});
test('template save writes only selected template and timestamp',()=>{
  assert.match(html,/setDoc\(doc\(db,'contractors',userUID\),\{websiteTemplate:templateId,updatedAt:serverTimestamp\(\)\},\{merge:true\}\)/);
  assert.match(js,/textContent=name/);
  assert.doesNotMatch(js,/innerHTML\s*=\s*[^;]*\b(name|tag|about|phone)\b/);
});
