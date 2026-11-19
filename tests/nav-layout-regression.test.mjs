import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=['email-ai.html','permits.html','video-gen.html','lead-finder.html','real-estate.html','social-media.html','youtube-studio.html'];
for(const page of pages){test(page+' navigation must not apply flex sticky positioning to body',()=>{const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');assert.match(html,/<header[^>]*class="[^"]*(sc-bar|sc-header)/);assert.doesNotMatch(html,/body\\{[^}]*display:flex;align-items:center;[^}]*position:sticky/);assert.match(html,/\\.(sc-bar|sc-header)\\{[^}]*display:flex;align-items:center;[^}]*position:sticky/);});}
