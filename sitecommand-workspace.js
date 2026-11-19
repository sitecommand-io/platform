/* SiteCommand shared workspace shell: navigation only; does not access customer data. */
(function(){
'use strict';
const pages=[
['platform.html','Dashboard','◈'],['email-ai.html','Email AI','✉'],['lead-finder.html','Lead Finder','⌕'],['social-media.html','Social Media','▦'],['permits.html','Permits','▤'],['video-gen.html','Video Studio','▶'],['youtube-studio.html','YouTube Studio','▷'],['real-estate.html','Real Estate','⌂'],['deal-finder.html','Deal Finder','◇'],['ai-assistant.html','AI Assistant','✧'],['siteeditor.html','Website Editor','▣'],['client-portal.html','Client Portal','♧'],['admin.html','Administration','⚙']];
const filename=location.pathname.split('/').pop()||'platform.html';
const selected=pages.find(p=>p[0]===filename);
if(!selected)return;
function init(){
const auth=document.getElementById(filename==='platform.html'?'authWrap':filename==='client-portal.html'?'authScreen':'__no_auth__');
if(auth && getComputedStyle(auth).display!=='none'){document.body.classList.add('sc-auth-navy');return;}
if(document.querySelector('.sc-sidebar'))return;
document.body.classList.add('sc-workspace');
const sidebar=document.createElement('aside');
sidebar.className='sc-sidebar';
sidebar.setAttribute('aria-label','Main navigation');
const brand=document.createElement('a');brand.className='sc-sidebrand';brand.href='platform.html';
const mark=document.createElement('span');mark.className='sc-sidebrand-mark';mark.textContent='S';
brand.append(mark,document.createTextNode('SiteCommand'));sidebar.append(brand);
const nav=document.createElement('nav');nav.className='sc-side-nav';nav.setAttribute('aria-label','SiteCommand tools');
const label=document.createElement('div');label.className='sc-side-label';label.textContent='Workspace';nav.append(label);
pages.forEach(([href,name,icon],i)=>{
if(filename==='platform.html'&&href==='platform.html')return;
if(i===1||i===7||i===11){const section=document.createElement('div');section.className='sc-side-label';section.textContent=i===1?'AI tools':i===7?'Real estate':'Management';nav.append(section)}
const a=document.createElement('a');a.className='sc-side-link';a.href=href;if(href===filename)a.setAttribute('aria-current','page');
const ico=document.createElement('span');ico.className='sc-side-icon';ico.textContent=icon;a.append(ico,document.createTextNode(name));nav.append(a)
});
sidebar.append(nav);
const footer=document.createElement('div');footer.className='sc-side-footer';footer.textContent='SiteCommand  ·  Business command center';sidebar.append(footer);
const top=document.createElement('div');top.className='sc-workspace-top';
const left=document.createElement('div');
const eyebrow=document.createElement('div');eyebrow.className='sc-workspace-eyebrow';eyebrow.textContent='SiteCommand / Workspace';
const title=document.createElement('div');title.className='sc-workspace-title';title.textContent=selected[1];left.append(eyebrow,title);
const status=document.createElement('div');status.className='sc-workspace-status';status.textContent='● Workspace';
const toggle=document.createElement('button');toggle.className='sc-mobile-toggle';toggle.type='button';toggle.setAttribute('aria-label','Toggle navigation');toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';toggle.addEventListener('click',()=>{const open=document.body.classList.toggle('sc-menu-open');toggle.setAttribute('aria-expanded',String(open))});
top.append(toggle,left,status);
document.body.prepend(top);document.body.prepend(sidebar);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('sc-menu-open');toggle.setAttribute('aria-expanded','false')}});
document.addEventListener('click',e=>{if(document.body.classList.contains('sc-menu-open')&&!sidebar.contains(e.target)&&!toggle.contains(e.target)){document.body.classList.remove('sc-menu-open');toggle.setAttribute('aria-expanded','false')}});
}
function boot(){init();if(filename==='platform.html'||filename==='client-portal.html'){const auth=document.getElementById(filename==='platform.html'?'authWrap':'authScreen');if(auth){const observer=new MutationObserver(()=>{if(getComputedStyle(auth).display==='none'){document.body.classList.remove('sc-auth-navy');init()}else{document.body.classList.remove('sc-workspace');document.body.classList.add('sc-auth-navy');document.querySelector('.sc-sidebar')?.remove();document.querySelector('.sc-workspace-top')?.remove()}});observer.observe(auth,{attributes:true,attributeFilter:['style','class']})}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
