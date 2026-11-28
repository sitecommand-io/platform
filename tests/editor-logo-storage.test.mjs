import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../siteeditor.html',import.meta.url),'utf8');
const preview=s.slice(s.indexOf('window.uploadLogo ='),s.indexOf('window.scPublishLogo='));
const publish=s.slice(s.indexOf('window.scPublishLogo='),s.indexOf('// ── COLORS',s.indexOf('window.scPublishLogo=')));
test('logo extraction stages local preview without publishing',()=>{
 assert.match(preview,/const optimized=await scOptimizeLogo\(file\)/);
 assert.match(preview,/scPendingLogo=optimized/);
 assert.match(preview,/sc-logo-result/);
 assert.match(preview,/sc-logo-header/);
 assert.doesNotMatch(preview,/uploadBytes|setDoc|saveChanges\(/);
 assert.match(s,/onclick="scPublishLogo\(\)"/);
});
test('approved logo stores binary and verifies URL',()=>{
 assert.match(publish,/file=scPendingLogo/);
 assert.match(publish,/await uploadBytes\(logoRef,file,\{contentType:'image\/png'\}\)/);
 assert.match(publish,/await getDownloadURL\(logoRef\)/);
 assert.match(publish,/await setDoc\(doc\(db,'contractors',uid\),\{logoUrl:url/);
 assert.match(publish,/await getDocFromServer/);
 assert.match(publish,/verified\.data\(\)\?\.logoUrl!==url/);
});
test('base64 logos are never written into Firestore',()=>{
 assert.match(s,/\^https:\\\/\\\//);
 assert.match(s,/updates\.logoUrl = userData\.logoUrl/);
 assert.match(s,/selectedLogo && new Blob\(\[selectedLogo\]\)\.size < 200000/);
 assert.match(s,/c=await scExtractCardLogo\(c\);/);
 assert.doesNotMatch(s,/Logo extraction unavailable; preserving original/);
});
