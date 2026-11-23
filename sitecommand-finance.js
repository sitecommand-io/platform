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
function jobKey(name){return String(name||'').trim().toLowerCase().replace(/\b(street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?)\b/g,'').replace(/[^a-z0-9]/g,'')}
function expenseGroup(x){if(x.type!=='expense')return 'Income / invoices';if(x.source==='home-depot'||x.source==='lowes')return 'Receipts & Materials';const c=String(x.category||'').toLowerCase();if(/labor|labour|payroll|wages|subcontract|crew|contractor pay/.test(c))return 'Labor';if(/material|suppl|receipt|hardware|lumber|electrical|plumbing|paint/.test(c))return 'Receipts & Materials';return 'Other Expenses'}
function showExpenseGroups(rows){
 const body=$('sc-fin-group-rows');if(!body)return;body.replaceChildren();
 const groups=new Map();
 for(const x of rows){if(x.type!=='expense')continue;const name=jobName(x),key=jobKey(name),v=groups.get(key)||{name,receipts:0,labor:0,other:0,count:0};const g=expenseGroup(x);if(g==='Receipts & Materials')v.receipts+=x.amount;else if(g==='Labor')v.labor+=x.amount;else v.other+=x.amount;v.count++;groups.set(key,v)}
 for(const v of groups.values()){const tr=document.createElement('tr');[v.name,money(v.receipts),money(v.labor),money(v.other),money(v.receipts+v.labor+v.other),String(v.count)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});body.append(tr)}
 $('sc-fin-group-empty').hidden=groups.size>0;
}
function showJobTotals(rows){const body=$('sc-fin-job-rows');if(!body)return;const jobs=new Map();for(const x of rows){const name=jobName(x),v=jobs.get(name)||{income:0,expense:0,receivable:0,count:0};v[x.type]+=x.amount;v.count++;jobs.set(name,v)}body.replaceChildren();for(const [name,v] of [...jobs].sort((a,b)=>b[1].expense-a[1].expense)){const tr=document.createElement('tr');[name,money(v.expense),money(v.income),money(v.income-v.expense),String(v.count)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});body.append(tr)}if($('sc-fin-job-empty'))$('sc-fin-job-empty').hidden=jobs.size>0}

const projectKey=()=>account?'sc_fin_projects_v1_'+account:null;
function loadProjects(){try{const k=projectKey();const data=k?JSON.parse(localStorage.getItem(k)||'[]'):[];return Array.isArray(data)?data:[]}catch{return []}}
function saveProjects(rows){try{if(projectKey())localStorage.setItem(projectKey(),JSON.stringify(rows))}catch{alert('Could not save projects in this browser. Export a backup.')}}
function projectNum(x){const n=Number(x);return Number.isFinite(n)&&n>=0?n:0}
function showProjects(){
 const body=$('sc-project-rows');if(!body)return;body.replaceChildren();
 const ledger=load(),projects=loadProjects();
 for(const p of projects){
  const related=ledger.filter(x=>jobKey(jobName(x))===jobKey(p.name));
  const spent=related.filter(x=>x.type==='expense').reduce((a,x)=>a+x.amount,0);
  const received=related.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0);
  const expected=projectNum(p.target),fixed=p.type==='flip'?projectNum(p.purchase):0;
  const saleCosts=p.type==='flip'?expected*projectNum(p.salePct)/100:0;
  const estimatedRemaining=projectNum(p.budget);
  // Budget is the remaining estimated cost; actual ledger costs are counted separately.
  const projected=expected-fixed-spent-estimatedRemaining-saleCosts;
  const realized=received-fixed-spent-(p.type==='flip'?received*projectNum(p.salePct)/100:0);
  const tr=document.createElement('tr');
  [p.name,p.type==='flip'?'House Flip':'Contractor Job',money(expected),money(spent),money(projected),money(realized)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});
  const td=document.createElement('td'),edit=document.createElement('button');edit.type='button';edit.className='sc-finance-action secondary';edit.textContent='Edit';edit.addEventListener('click',()=>{const form=$('sc-project-form');for(const k of ['name','type','target','purchase','budget','salePct']){if(form.elements[k])form.elements[k].value=p[k]??''}form.elements.projectId.value=p.id;form.scrollIntoView({behavior:'smooth',block:'center'})});
  const del=document.createElement('button');del.type='button';del.className='sc-finance-action secondary';del.textContent='Remove';del.style.marginLeft='5px';del.addEventListener('click',()=>{if(confirm('Remove project '+p.name+'? Transactions will be kept.')){saveProjects(loadProjects().filter(x=>x.id!==p.id));showProjects()}});
  td.append(edit,del);tr.append(td);body.append(tr);
 }
 $('sc-project-empty').hidden=projects.length>0;
}
function setupProjects(){
 const form=$('sc-project-form');if(!form)return;
 const type=form.elements.type;
 const updateType=()=>{const flip=type.value==='flip';$('sc-project-purchase').hidden=!flip;$('sc-project-sale').hidden=!flip;$('sc-project-target-label').textContent=flip?'Expected sale price ($)':'Contract value ($)';$('sc-project-budget-label').textContent=flip?'Estimated remaining renovation/labor costs ($)':'Estimated remaining labor/material costs ($)'};
 type.addEventListener('change',updateType);updateType();
 form.addEventListener('submit',e=>{e.preventDefault();if(!account)return alert('Sign in first');const d=new FormData(form),name=String(d.get('name')||'').trim().slice(0,120);if(!name)return alert('Enter the project address or name');const list=loadProjects(),id=String(d.get('projectId')||'');if(list.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==id))return alert('A project with that name already exists.');const p={id:id||crypto.randomUUID(),name,type:String(d.get('type')),target:projectNum(d.get('target')),purchase:projectNum(d.get('purchase')),budget:projectNum(d.get('budget')),salePct:projectNum(d.get('salePct'))};if(p.salePct>100)return alert('Selling cost percentage must be 0 to 100');const idx=list.findIndex(x=>x.id===id);if(idx>=0)list[idx]=p;else list.push(p);saveProjects(list);form.reset();updateType();showProjects()});
 $('sc-project-new').addEventListener('click',()=>{form.reset();updateType()});
 $('sc-project-export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({projects:loadProjects(),transactions:load()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sitecommand-projects-and-finances.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
}

function showTotals(){const rows=load(),t=totals(rows);[['sc-revenue',t.income],['sc-expenses',t.expense],['sc-profit',t.income-t.expense],['sc-outstanding',t.receivable],['sc-fin-revenue',t.income],['sc-fin-expenses',t.expense],['sc-fin-profit',t.income-t.expense],['sc-fin-outstanding',t.receivable]].forEach(([id,n])=>{if($(id))$(id).textContent=money(n)});if($('sc-fin-count'))$('sc-fin-count').textContent=rows.length+' recorded transactions';renderRows(rows);showJobTotals(rows);showExpenseGroups(rows);showProjects()}
function renderRows(rows){const body=$('sc-fin-rows');if(!body)return;body.replaceChildren();rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100).forEach(x=>{const tr=document.createElement('tr');[x.date,x.type==='income'?'Income':x.type==='expense'?'Expense':'Unpaid invoice',jobName(x),x.category||'—',x.description||'—',money(x.amount)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});const td=document.createElement('td'),btn=document.createElement('button');btn.type='button';btn.className='sc-finance-action secondary';btn.textContent='Remove';btn.setAttribute('aria-label','Remove transaction');btn.addEventListener('click',()=>{if(confirm('Remove this transaction from this browser?')){save(load().filter(row=>row.id!==x.id));showTotals()}});const edit=document.createElement('button');edit.type='button';edit.className='sc-finance-action secondary';edit.textContent='Edit Job';edit.style.marginRight='6px';edit.addEventListener('click',()=>editTransactionJob(x.id));td.append(edit,btn);tr.append(td);body.append(tr)});$('sc-fin-empty').hidden=rows.length>0}
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
    const project=at(r,'jobname')||at(r,'projectname'),sku=at(r,'skunumber'),order=at(r,'ordernumber'),invoice=at(r,'invoicenumber');
    const category=at(r,'departmentname')||'Materials';
    const detail=['Home Depot',description,sku?'SKU '+sku:'',project?'Job '+project:'',qty!==1?'Qty '+qty:''].filter(Boolean).join(' · ').slice(0,200);
    const fingerprint=['home-depot',date,store,transaction,sku,qty,amount,order,invoice,description].join('|').toLowerCase();
    if(seen.has(fingerprint)){skipped++;continue}seen.add(fingerprint);
    result.push({id:crypto.randomUUID(),date,type:'expense',amount,category:category.slice(0,100),description:detail,jobName:project.slice(0,120),source:'home-depot',fingerprint});
  }
  if(!result.length)throw Error('No valid Home Depot purchases found. Export the purchase history as CSV, not an image.');
  return {rows:result,skipped};
}
function lowesImport(table){
  const aliases={date:['date','purchasedate','transactiondate','orderdate','invoicedate'],description:['description','itemdescription','productdescription','productname','item','product'],amount:['amount','total','linetotal','extendedprice','extendedamount','netamount','subtotal','totalprice'],unit:['unitprice','price','saleprice','netunitprice'],qty:['quantity','qty'],job:['jobname','job','projectname','project','jobnumber','projectnumber'],category:['category','department','departmentname','productcategory'],transaction:['transactionid','transactionnumber','receiptnumber','receipt','ordernumber','orderid','invoicenumber']};
  const headerAt=table.findIndex(r=>{const h=r.map(normalizedHeader);return aliases.date.some(x=>h.includes(x))&&aliases.description.some(x=>h.includes(x))&&(aliases.amount.some(x=>h.includes(x))||aliases.unit.some(x=>h.includes(x)))});
  if(headerAt<0)return null;
  const header=table[headerAt].map(normalizedHeader);
  const at=(r,field)=>{const i=header.findIndex(x=>aliases[field].includes(x));return i<0?'':String(r[i]||'').trim()};
  const sourceHeader=table.slice(0,headerAt).flat().join(' ').toLowerCase();
  const headerWords=header.join(' ');
  if(!/lowe'?s|lowes/.test(sourceHeader)&&!/(itemdescription|productdescription|receipt|ordernumber)/.test(headerWords))return null;
  const numeric=x=>{const v=Number(String(x).replace(/[$,\s]/g,'').replace(/^\((.*)\)$/,'-$1'));return Number.isFinite(v)?v:NaN};
  const rows=[];let skipped=0;
  for(const r of table.slice(headerAt+1)){
    let date=at(r,'date');
    if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)){const [m,d,y]=date.split('/');date=y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0')}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))){skipped++;continue}
    const description=at(r,'description'),rawAmount=at(r,'amount'),unit=at(r,'unit'),qty=numeric(at(r,'qty'))||1;
    const amount=Math.round((rawAmount?numeric(rawAmount):numeric(unit)*qty)*100)/100;
    if(!description||!Number.isFinite(amount)||amount<=0||amount>1e12){skipped++;continue}
    const project=at(r,'job'),category=at(r,'category')||'Materials',transaction=at(r,'transaction');
    const fingerprint=['lowes',date,transaction,description,amount,qty].join('|').toLowerCase();
    rows.push({id:crypto.randomUUID(),date,type:'expense',amount,category:category.slice(0,100),description:('Lowe\'s · '+description).slice(0,200),jobName:project.slice(0,120),source:'lowes',fingerprint});
  }
  if(!rows.length)throw Error('No valid Lowe\'s purchase rows found in this CSV.');
  return {rows,skipped,format:'Lowe\'s purchase history'};
}
function csvImport(text){
  const table=parseCSV(text);
  if(table.length<2)throw Error('No data rows found');
  const hd=homeDepotImport(table);
  if(hd)return {...hd,format:'Home Depot purchase history'};
  const lowes=lowesImport(table);
  if(lowes)return lowes;
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
function assignImportJobs(rows){
 // Import exact job labels from the store CSV without asking for manual entry.
 // Missing values remain Unassigned and can be edited later.
 return true;
}
function editTransactionJob(id){
  const rows=load(),row=rows.find(x=>x.id===id);if(!row)return;
  const names=[...new Set(rows.map(x=>String(x.jobName||'').trim()).filter(Boolean))].slice(0,15);
  const answer=prompt('Assign this purchase to a job. Existing jobs: '+(names.join(', ')||'none')+'. Blank means Unassigned:',row.jobName||'');
  if(answer===null)return;row.jobName=answer.trim().slice(0,120);save(rows);showTotals();
}
function exportCSV(){const data=[['date','type','amount','category','description','job name'],...load().map(x=>[x.date,x.type,x.amount,x.category||'',x.description||'',x.jobName||''])];const content=data.map(row=>row.map(x=>{const s=String(x);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='sitecommand-finances.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
function clearAllFinances(){if(!account){alert('Sign in first');return}const rows=load();if(!rows.length){alert('There are no financial records to clear.');return}const answer=prompt('This will permanently delete ALL '+rows.length+' financial transactions for this account in this browser, including job totals and Home Depot imports. Export a CSV backup first if needed. Type DELETE to confirm:');if(answer!=='DELETE')return;try{localStorage.removeItem(key());showTotals();alert('All financial records in this browser have been cleared.')}catch{alert('Could not clear financial records in this browser.')}}
function setup(){const f=$('sc-fin-form');if(!f)return;f.addEventListener('submit',e=>{e.preventDefault();if(!account){alert('Sign in first');return}const data=new FormData(f);const row={id:crypto.randomUUID(),date:String(data.get('date')),type:String(data.get('type')),amount:Number(data.get('amount')),category:(String(data.get('expenseGroup')||'')==='Labor'?'Labor':String(data.get('expenseGroup')||'')==='Receipts & Materials'?'Materials':String(data.get('category')||'').slice(0,100)),description:String(data.get('description')||'').slice(0,200),jobName:String(data.get('jobName')||'').trim().slice(0,120)};if(!valid(row)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))return alert('Check the transaction fields');save([...load(),row]);f.reset();$('sc-fin-date').value=new Date().toISOString().slice(0,10);showTotals()});$('sc-fin-date').value=new Date().toISOString().slice(0,10);$('sc-fin-import').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2e6)throw Error('CSV exceeds 2 MB');const imported=csvImport(await file.text());if(!assignImportJobs(imported.rows))return;const existing=load(),byFingerprint=new Map(existing.filter(x=>x.fingerprint).map(x=>[x.fingerprint,x]));
 const rows=[],repairs=[];
 for(const item of imported.rows){
   const match=item.fingerprint?byFingerprint.get(item.fingerprint):null;
   if(match){
     if(!String(match.jobName||'').trim()&&String(item.jobName||'').trim())repairs.push({match,name:item.jobName});
   }else{rows.push(item);if(item.fingerprint)byFingerprint.set(item.fingerprint,item)}
 }
 const duplicates=imported.rows.length-rows.length;
 if(!rows.length&&!repairs.length){alert('No new purchases or missing Job Names to update. '+duplicates+' purchases were already recorded.');return}if(confirm('Detected '+imported.format+'. Import '+rows.length+' new transactions and restore '+repairs.length+' missing Job Names from matching existing purchases? Existing assigned Job Names will not be overwritten.'+(duplicates?' '+duplicates+' already-recorded purchases will not be duplicated.':'')+(imported.skipped?' '+imported.skipped+' invalid/empty rows skipped.':''))){for(const fix of repairs)fix.match.jobName=fix.name;save([...existing,...rows]);showTotals();alert('Import complete: '+rows.length+' new purchases, '+repairs.length+' existing Job Names restored.')}}catch(err){alert(err.message)}finally{e.target.value=''}});$('sc-fin-export').addEventListener('click',exportCSV);$('sc-fin-clear-all').addEventListener('click',clearAllFinances);$('sc-fin-template').addEventListener('click',()=>{const a=document.createElement('a');a.href='data:text/csv,date%2Ctype%2Camount%2Ccategory%2Cdescription%2Cjob%20name%0A2026-11-01%2Cincome%2C2500%2CProject%2CInvoice%20payment%2CExample%20Job';a.download='finance-template.csv';a.click()});$('sc-finance-open').addEventListener('click',()=>section('finance'))}
function boot(){setup();setupProjects();const observer=new MutationObserver(()=>{if(document.body.classList.contains('sc-workspace'))addSidebar()});observer.observe(document.body,{attributes:true,attributeFilter:['class']});addSidebar();window.addEventListener('sc-account-ready',e=>{account=e.detail.uid;showTotals()});window.addEventListener('sc-account-signed-out',()=>{account=null;showTotals()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
