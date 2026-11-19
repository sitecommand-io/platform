import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../siteeditor.html',import.meta.url),'utf8');
test('editor does not bounce users to business overview when profile is missing',()=>{
  assert.doesNotMatch(html,/window\.location\.href\s*=\s*['"]platform\.html['"]/);
  assert.match(html,/snap\.exists\(\)\s*\?\s*snap\.data\(\)\s*:/);
  assert.match(html,/id="sc-editor-notice"/);
});
test('template save uses merge to preserve existing contractor records',()=>{
  assert.match(html,/setDoc\(doc\(db,'contractors',userUID\),\{websiteTemplate:templateId,updatedAt:serverTimestamp\(\)\},\{merge:true\}\)/);
  assert.match(html,/setDoc\(doc\(db,'contractors',userUID\), updates, \{merge:true\}\)/);
});
