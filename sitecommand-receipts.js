/* Isolated receipt OCR: failures must never break finance navigation or ledger. */
(()=>{'use strict';
function init(){
const input=document.getElementById('sc-receipt-files'),status=document.getElementById('sc-receipt-status'),pages=document.getElementById('sc-receipt-pages'),scan=document.getElementById('sc-receipt-scan'),review=document.getElementById('sc-receipt-review'),tbody=document.getElementById('sc-receipt-items'),form=document.getElementById('sc-fin-form');
if(!input||!status||!form)return;
let files=[],draft=null;
const fields=document.getElementById('sc-receipt-fields');
const editors={};
for(const [name,label,type] of [['jobName','Job name','text'],['date','Purchase date','date'],['category','Vendor','text'],['receiptNumber','Receipt number','text'],['amount','Receipt total ($)','number'],['tax','Sales tax ($)','number'],['discount','Discount ($)','number'],['description','Notes','text']]){
 const l=document.createElement('label'),el=document.createElement('input');l.textContent=label;el.type=type;if(type==='number'){el.min='0';el.step='.01'}l.append(el);fields.append(l);editors[name]=el;
 el.addEventListener('input',()=>{if(form.elements[name])form.elements[name].value=el.value;if(draft){if(name==='receiptNumber')draft.receiptNumber=el.value;if(name==='category')draft.merchant=el.value;if(name==='amount')draft.total=el.value===''?null:Number(el.value);if(name==='tax'||name==='discount')draft[name]=Number(el.value)||0;reconcile()}});
}
function fillEditors(){for(const [name,el] of Object.entries(editors))el.value=form.elements[name]?.value??draft?.[name]??''}
document.getElementById('sc-receipt-manual').onclick=()=>{setDraft({merchant:'',receiptNumber:'',pageCount:files.length,total:null,items:[]});form.elements.type.value='expense';form.elements.expenseGroup.value='Receipts & Materials';form.elements.amount.value='';form.elements.category.value='';form.elements.description.value='';review.hidden=false;fillEditors();drawItems()};
document.getElementById('sc-receipt-save').onclick=()=>{if(!draft)return;if(!editors.jobName.value.trim()||!editors.category.value.trim()||!editors.amount.value){status.textContent='Enter job name, vendor and receipt total before saving.';return}form.elements.type.value='expense';form.requestSubmit()};

const setDraft=value=>{draft=value;window.scReceiptDraft=value};
function drawPages(){
pages.replaceChildren();scan.disabled=!files.length;
files.forEach((file,i)=>{
const card=document.createElement('div');card.style.cssText='border:1px solid #d8e0eb;border-radius:10px;padding:8px;width:130px';
const img=document.createElement('img'),url=URL.createObjectURL(file);img.src=url;img.alt='Receipt page '+(i+1);img.style.cssText='width:110px;height:100px;object-fit:contain';img.onload=()=>URL.revokeObjectURL(url);
const title=document.createElement('div');title.textContent='Page '+(i+1);
card.append(img,title);
for(const [label,offset] of [['←',-1],['→',1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.title='Reorder page';b.disabled=i+offset<0||i+offset>=files.length;b.addEventListener('click',()=>{[files[i],files[i+offset]]=[files[i+offset],files[i]];setDraft(null);review.hidden=true;drawPages()});card.append(b)}
const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{files.splice(i,1);setDraft(null);review.hidden=true;drawPages()});card.append(remove);pages.append(card);
});status.textContent=files.length?files.length+' page(s) selected as ONE purchase. Reorder if needed, then scan.':'Choose all pages of one purchase.'}
input.addEventListener('change',()=>{const added=[...input.files];input.value='';if(files.length+added.length>10||added.some(f=>!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>10485760)){status.textContent='Maximum 10 JPG/PNG/WebP pages, up to 10 MB each.';return}files.push(...added);setDraft(null);review.hidden=true;drawPages()});
document.getElementById('sc-receipt-clear').addEventListener('click',()=>{files=[];setDraft(null);review.hidden=true;drawPages()});
function reconcile(){if(!draft)return;const sum=draft.items.reduce((n,x)=>n+(Number(x.lineTotal)||0),0);document.getElementById('sc-receipt-reconcile').textContent='Item lines: '+draft.items.length+' · Sum of detected items: $'+sum.toFixed(2)+' · Receipt total: '+(draft.total===null?'not detected':'$'+draft.total.toFixed(2))+' · Review taxes, discounts and missing items.'}
function drawItems(){tbody.replaceChildren();if(!draft)return;
draft.items.forEach((item,i)=>{const tr=document.createElement('tr');
for(const [field,type] of [['description','text'],['quantity','number'],['lineTotal','number']]){const td=document.createElement('td'),el=document.createElement('input');el.type=type;el.value=item[field];el.style.cssText='min-width:80px;max-width:230px;width:100%';if(type==='number'){el.min='0';el.step='.01'}el.addEventListener('input',()=>{item[field]=type==='number'?Number(el.value):el.value;reconcile()});td.append(el);tr.append(td)}
const td=document.createElement('td'),remove=document.createElement('button');remove.type='button';remove.textContent='✕';remove.addEventListener('click',()=>{draft.items.splice(i,1);drawItems()});td.append(remove);tr.append(td);tbody.append(tr)});reconcile()}
document.getElementById('sc-receipt-add-item').addEventListener('click',()=>{if(!draft)return;draft.items.push({description:'',quantity:1,lineTotal:0});drawItems()});
scan.addEventListener('click',async()=>{if(!files.length)return;scan.disabled=true;setDraft(null);review.hidden=true;
try{
if(!window.Tesseract)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('OCR library could not load'));document.head.append(script)});
const texts=[];for(let i=0;i<files.length;i++){status.textContent='Scanning page '+(i+1)+' of '+files.length+'…';const result=await window.Tesseract.recognize(files[i],'eng');texts.push(String(result.data?.text||''))}
const lines=texts.join('\n').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const entries=lines.map(line=>({line,prices:line.match(/\d{1,6}[.,]\d{2}\b/g)})).filter(x=>x.prices);
const number=s=>Number(s.replace(/,/g,''));
const totalRow=entries.filter(x=>/\b(grand total|total due|amount paid|total)\b/i.test(x.line)&&!/subtotal|tax total|total savings|total items/i.test(x.line)).at(-1);
const total=totalRow?number(totalRow.prices.at(-1)):null;
const merchant=lines.find(x=>/home depot|lowe'?s|menards|ace hardware|harbor freight|sherwin.williams|floor & decor/i.test(x))||lines[0]||'Receipt';
const receiptNumber=texts.join('\n').match(/(?:receipt|transaction|invoice)\s*(?:no\.?|number|#|id)?\s*[:#]?\s*([A-Z0-9-]{5,25})/i)?.[1]||'';
const dateMatch=texts.join('\n').match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);let date='';
if(dateMatch){let y=Number(dateMatch[3]);if(y<100)y+=2000;const m=Number(dateMatch[1]),d=Number(dateMatch[2]);if(y>=2000&&y<=2100&&m>=1&&m<=12&&d>=1&&d<=31)date=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
const itemRows=entries.filter(x=>!/\b(total|subtotal|tax|change|balance|tender|cash|visa|mastercard|credit|debit|discount|savings|payment|amount due)\b/i.test(x.line));
setDraft({merchant:merchant.slice(0,100),receiptNumber,pageCount:files.length,total,items:itemRows.slice(0,120).map(x=>({description:x.line.replace(x.prices.at(-1),'').trim().slice(0,120)||'Unidentified item',quantity:1,lineTotal:number(x.prices.at(-1))}))});
form.elements.type.value='expense';form.elements.expenseGroup.value='Receipts & Materials';form.elements.category.value=draft.merchant;if(date)form.elements.date.value=date;if(total!==null)form.elements.amount.value=total.toFixed(2);else form.elements.amount.value='';form.elements.description.value=('Receipt '+receiptNumber+' · '+files.length+' pages · '+draft.merchant).slice(0,200);
review.hidden=false;fillEditors();drawItems();status.textContent='Scanned '+files.length+' pages as ONE receipt. Review items and enter the Job Name, then save ONE transaction. Original photos are not stored.';
}catch(err){status.textContent='Scanner failed: '+err.message+'. Please enter the expense manually.'}finally{scan.disabled=!files.length}});
window.addEventListener('sc-receipt-transaction-saved',()=>{files=[];setDraft(null);review.hidden=true;drawPages()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();