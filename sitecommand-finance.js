/* SiteCommand finance ledger: browser-local per-account records; no server writes. */
(function(){
'use strict';
const sections=[['dashboard','Business Overview','◈'],['finance','Finances','▥'],['links','My Links','↗'],['aisetup','AI Setup','✧'],['domain','Domain','◎'],['settings','Settings','⚙']];
let account=null;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
const key=()=>account?'sc_finance_local_v1_'+account:null;
function load(){try{const k=key();const data=k?JSON.parse(localStorage.getItem(k)||'[]'):[];return Array.isArray(data)?data.filter(valid):[]}catch{return []}}
function valid(x){return x&&['income','expense','receivable'].includes(x.type)&&typeof x.amount==='number'&&Number.isFinite(x.amount)&&x.amount>=0&&x.amount<=1e12&&typeof x.date==='string'}
function save(rows){if(!key())return;try{localStorage.setItem(key(),JSON.stringify(rows))}catch{alert('This browser could not save the data. Export a CSV backup instead.')}}
function totals(rows){return rows.reduce((a,x)=>{a[x.type]+=x.amount;return a},{income:0,expense:0,receivable:0})}
function jobName(x){return String(x.jobName||'').trim()||'Unassigned'}
function showJobTotals(rows){const body=$('sc-fin-job-rows');if(!body)return;const jobs=new Map();for(const x of rows){const name=jobName(x),v=jobs.get(name)||{income:0,expense:0,receivable:0,count:0};v[x.type]+=x.amount;v.count++;jobs.set(name,v)}body.replaceChildren();for(const [name,v] of [...jobs].sort((a,b)=>b[1].expense-a[1].expense)){const tr=document.createElement('tr');[name,money(v.expense),money(v.income),money(v.income-v.expense),String(v.count)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});body.append(tr)}if($('sc-fin-job-empty'))$('sc-fin-job-empty').hidden=jobs.size>0}
function showTotals(){const rows=load(),t=totals(rows);[['sc-revenue',t.income],['sc-expenses',t.expense],['sc-profit',t.income-t.expense],['sc-outstanding',t.receivable],['sc-fin-revenue',t.income],['sc-fin-expenses',t.expense],['sc-fin-profit',t.income-t.expense],['sc-fin-outstanding',t.receivable]].forEach(([id,n])=>{if($(id))$(id).textContent=money(n)});if($('sc-fin-count'))$('sc-fin-count').textContent=rows.length+' recorded transactions';renderRows(rows);showJobTotals(rows)}
function renderRows(rows){const body=$('sc-fin-rows');if(!body)return;body.replaceChildren();rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100).forEach(x=>{const tr=document.createElement('tr');[x.date,x.type==='income'?'Income':x.type==='expense'?'Expense':'Unpaid invoice',jobName(x),x.category||'—',x.description||'—',money(x.amount)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});const td=document.createElement('td'),btn=document.createElement('button');btn.type='button';btn.className='sc-finance-action secondary';btn.textContent='Remove';btn.setAttribute('aria-label','Remove transaction');btn.addEventListener('click',()=>{if(confirm('Remove this transaction from this browser?')){save(load().filter(row=>row.id!==x.id));showTotals()}});td.append(btn);tr.append(td);body.append(tr)});$('sc-fin-empty').hidden=rows.length>0}
function section(id){const el=$('sec-'+id);if(!el)return;document.querySelectorAll('.p-section').forEach(s=>s.classList.remove('active'));el.classList.add('active');document.querySelectorAll('.sc-side-link[data-section]').forEach(a=>{a.classList.toggle('sc-section-current',a.dataset.section===id);if(a.dataset.section===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});document.querySelectorAll('.p-nav-btn').forEach(b=>b.classList.toggle('active',b.textContent.trim().toLowerCase()===(id==='aisetup'?'ai setup':id)));const title=document.querySelector('.sc-workspace-title');if(title)title.textContent=id==='dashboard'?'Business Overview':sections.find(x=>x[0]===id)?.[1]||'Dashboard';showTotals()}
function addSidebar(){const nav=document.querySelector('.sc-side-nav');if(!nav||nav.querySelector('[data-section]'))return;const head=document.createElement('div');head.className='sc-side-label';head.textContent='Business management';nav.prepend(head);for(const [id,name,icon] of sections.slice().reverse()){const a=document.createElement('a');a.href='#'+id;a.className='sc-side-link';a.dataset.section=id;const ico=document.createElement('span');ico.className='sc-side-icon';ico.textContent=icon;a.append(ico,document.createTextNode(name));a.addEventListener('click',e=>{e.preventDefault();section(id);document.body.classList.remove('sc-menu-open')});head.after(a)}const footer=document.querySelector('.sc-side-footer');if(footer&&!document.getElementById('sc-side-logout')){const out=document.createElement('button');out.type='button';out.id='sc-side-logout';out.className='sc-side-link';out.style.width='100%';out.style.textAlign='left';out.textContent='↪  Log Out';out.addEventListener('click',()=>{if(typeof window.doLogout==='function')window.doLogout()});footer.before(out)}section('dashboard')}
function parseCSV(input){const lines=[];let row=[],field='',quote=false;for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quote&&input[i+1]==='"'){field+='"';i++}else quote=!quote}else if(c===','&&!quote){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))lines.push(row);row=[];field=''}else field+=c}if(quote)throw Error('Unclosed quoted CSV field');row.push(field);if(row.some(x=>x.trim()))lines.push(row);return lines}
function normalizedHeader(value){return String(value||'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[^a-z0-9]/g,'')}
function homeDepotImport(table){
  const headerAt=table.findIndex(r=>r.some(c=>normalizedHeader(c)==='transactionid')&&r.some(c=>normalizedHeader(c)==='skudescription')&&r.some(c=>normalizedHeader(c)==='date'));
  if(headerAt<0)return null;
  const header=table[headerAt].map(normalizedHeader),column=(...names)=>header.findIndex(h=>names.includes(h));
  const at=(r,...names)=>{const i=column(...names);return i<0?'':String(r[i]||'').trim()};
  const result=[],seen=new Set();let skipped=0;
  for(const r of table.slice(headerAt+1)){
    const rawDate=at(r,'date'),match=rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match){skipped++;continue}
    const date=rawDate,description=at(r,'skudescription'),transaction=at(r,'transactionid'),store=at(r,'storenumber');
    if(!description&&!transaction){skipped++;continue}
    const qtyRaw=at(r,'quantity'),qty=Number(qtyRaw.replace(/,/g,''))||1;
    const net=at(r,'netunitprice'),unit=at(r,'unitprice');
    const numeric=x=>{const v=Number(String(x).replace(/[$,\s]/g,'').replace(/^\((.*)\)$/,'-$1'));return Number.isFinite(v)?v:NaN};
    // Home Depot's Net Unit Price is per item; extended retail is before discounts.
    // Prefer quantity x net unit price to avoid ignoring discounts on multi-unit purchases.
    const amount=Math.round(qty*numeric(net||unit)*100)/100;
    if(!Number.isFinite(amount)||amount<=0||amount>1e12){skipped++;continue}
    const project=at(r,'jobname','projectname'),sku=at(r,'skunumber'),order=at(r,'ordernumber'),invoice=at(r,'invoicenumber');
    const category=at(r,'departmentname')||'Materials';
    const detail=['Home Depot',description,sku?'SKU '+sku:'',project?'Job '+project:'',qty!==1?'Qty '+qty:''].filter(Boolean).join(' · ').slice(0,200);
    const fingerprint=['home-depot',date,store,transaction,sku,qty,amount,order,invoice,description].join('|').toLowerCase();
    if(seen.has(fingerprint)){skipped++;continue}seen.add(fingerprint);
    result.push({id:crypto.randomUUID(),date,type:'expense',amount,category:category.slice(0,100),description:detail,jobName:project.slice(0,120),source:'home-depot',fingerprint});
  }
  if(!result.length)throw Error('No valid Home Depot purchases found. Export the purchase history as CSV, not an image.');
  return {rows:result,skipped};
}
function csvImport(text){
  const table=parseCSV(text);
  if(table.length<2)throw Error('No data rows found');
  const hd=homeDepotImport(table);
  if(hd)return {...hd,format:'Home Depot purchase history'};
  const headers=table.shift().map(x=>x.trim().toLowerCase());
  const idx=n=>headers.indexOf(n);
  for(const col of ['date','type','amount'])if(idx(col)<0)throw Error('CSV must include date, type, amount, or be a Home Depot purchase history CSV');
  const rows=table.map((r,i)=>{
    const date=(r[idx('date')]||'').trim(),type=(r[idx('type')]||'').trim().toLowerCase(),amount=Number((r[idx('amount')]||'').replace(/[$,\s]/g,''));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||!['income','expense','receivable'].includes(type)||!Number.isFinite(amount)||amount<0||amount>1e12)throw Error('Invalid transaction on CSV row '+(i+2));
    return {id:crypto.randomUUID(),date,type,amount,category:idx('category')>=0?(r[idx('category')]||'').slice(0,100):'',description:idx('description')>=0?(r[idx('description')]||'').slice(0,200):'',jobName:(idx('job name')>=0?r[idx('job name')]:idx('jobname')>=0?r[idx('jobname')]:idx('job')>=0?r[idx('job')]:'').slice(0,120)}
  });
  return {rows,skipped:0,format:'SiteCommand CSV'};
}
function exportCSV(){const data=[['date','type','amount','category','description','job name'],...load().map(x=>[x.date,x.type,x.amount,x.category||'',x.description||'',x.jobName||''])];const content=data.map(row=>row.map(x=>{const s=String(x);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='sitecommand-finances.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
function clearAllFinances(){if(!account){alert('Sign in first');return}const rows=load();if(!rows.length){alert('There are no financial records to clear.');return}const answer=prompt('This will permanently delete ALL '+rows.length+' financial transactions for this account in this browser, including job totals and Home Depot imports. Export a CSV backup first if needed. Type DELETE to confirm:');if(answer!=='DELETE')return;try{localStorage.removeItem(key());showTotals();alert('All financial records in this browser have been cleared.')}catch{alert('Could not clear financial records in this browser.')}}
function setup(){const f=$('sc-fin-form');if(!f)return;f.addEventListener('submit',e=>{e.preventDefault();if(!account){alert('Sign in first');return}const data=new FormData(f);const row={id:crypto.randomUUID(),date:String(data.get('date')),type:String(data.get('type')),amount:Number(data.get('amount')),category:String(data.get('category')||'').slice(0,100),description:String(data.get('description')||'').slice(0,200),jobName:String(data.get('jobName')||'').trim().slice(0,120)};if(!valid(row)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))return alert('Check the transaction fields');save([...load(),row]);f.reset();$('sc-fin-date').value=new Date().toISOString().slice(0,10);showTotals()});$('sc-fin-date').value=new Date().toISOString().slice(0,10);$('sc-fin-import').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2e6)throw Error('CSV exceeds 2 MB');const imported=csvImport(await file.text());const existing=load(),fingerprints=new Set(existing.map(x=>x.fingerprint).filter(Boolean));const rows=imported.rows.filter(x=>!x.fingerprint||!fingerprints.has(x.fingerprint));const duplicates=imported.rows.length-rows.length;if(!rows.length){alert('No new purchases to import. '+duplicates+' duplicate rows were already recorded.');return}if(confirm('Detected '+imported.format+'. Import '+rows.length+' new transactions as '+(imported.format.startsWith('Home Depot')?'expenses':'financial records')+'?'+(duplicates?' '+duplicates+' existing duplicates will be skipped.':'')+(imported.skipped?' '+imported.skipped+' invalid/empty rows skipped.':''))){save([...existing,...rows]);showTotals()}}catch(err){alert(err.message)}finally{e.target.value=''}});$('sc-fin-export').addEventListener('click',exportCSV);$('sc-fin-clear-all').addEventListener('click',clearAllFinances);$('sc-fin-template').addEventListener('click',()=>{const a=document.createElement('a');a.href='data:text/csv,date%2Ctype%2Camount%2Ccategory%2Cdescription%2Cjob%20name%0A2026-11-01%2Cincome%2C2500%2CProject%2CInvoice%20payment%2CExample%20Job';a.download='finance-template.csv';a.click()});$('sc-finance-open').addEventListener('click',()=>section('finance'))}
function boot(){setup();const observer=new MutationObserver(()=>{if(document.body.classList.contains('sc-workspace'))addSidebar()});observer.observe(document.body,{attributes:true,attributeFilter:['class']});addSidebar();window.addEventListener('sc-account-ready',e=>{account=e.detail.uid;showTotals()});window.addEventListener('sc-account-signed-out',()=>{account=null;showTotals()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
