/**
 * SiteCommand Deal Finder — pure, auditable calculations and CSV ingestion.
 * No network requests, no credentials, and no access to customer databases.
 * Imported rows are user-provided and never independently verified.
 */
export function parseCSV(input) {
  const text=String(input??'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],next=text[i+1];
    if(c==='"'){if(quoted&&next==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&next==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('CSV has an unmatched quotation mark');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  if(!rows.length)return [];
  const header=rows.shift().map(h=>h.trim());
  return rows.map((cells,index)=>Object.fromEntries(header.map((h,i)=>[h||'Column '+i,(cells[i]||'').trim()])));
}
const normalize=x=>String(x??'').toLowerCase().replace(/[^a-z0-9]/g,'');
function get(row,...names){
  const fields=Object.entries(row).map(([k,v])=>[normalize(k),v]);
  for(const n of names){
    const value=fields.find(([k,v])=>k===normalize(n)&&String(v??'').trim()!=='')?.[1];
    if(value!==undefined)return value;
  }
  return '';
}
export function moneyNumber(value){
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  const s=String(value??'').trim();
  if(!s)return NaN;
  const m=s.replace(/[$,\s]/g,'').match(/^-?\d+(?:\.\d+)?$/);
  return m?Number(m[0]):NaN;
}
const numberOrNull=value=>{const n=moneyNumber(value);return Number.isFinite(n)?n:null};
export function normalizeListing(row){
  const address=get(row,'address','street address','property address','full address','location','street');
  const city=get(row,'city');
  const state=get(row,'state','state or province');
  const zip=String(get(row,'zip','zip code','zipcode','postal code','zip or postal code')).match(/\d{5}/)?.[0]||'';
  const price=numberOrNull(get(row,'sale price','sold price','closing price','last sale price','price','list price','listing price','asking price'));
  const sqft=numberOrNull(get(row,'sqft','square feet','square footage','living area','living area sqft','approx sqft','approx square feet','sq. ft.','size'));
  const beds=numberOrNull(get(row,'beds','bedrooms','number of bedrooms','bed'));
  const baths=numberOrNull(get(row,'baths','bathrooms','number of bathrooms','bath'));
  const date=String(get(row,'sale date','sold date','closing date','date sold','last sale date'));
  const rawStatus=String(get(row,'status','listing status','property status','sale status','type','sale type')).toLowerCase();
  const status=(date||/past sale|sold|closed/.test(rawStatus))?'sold':rawStatus;
  const url=String(get(row,'url','redfin url','listing url','property url','link'));
  const safeURL=/^https:\/\/(?:www\.)?redfin\.com\//i.test(url)?url:'';
  return {address,city,state,zip,price,sqft,beds,baths,status,date,url:safeURL,source:'User-imported CSV'};
}
export function isSold(row){return /\b(sold|closed|sale completed|recently sold)\b/i.test(row.status);}
export function selectComps(listings,subject,{requireSold=true,minSqftRatio=.7,maxSqftRatio=1.3,bedTolerance=1,maxResults=12,asOf=new Date()}={}){
  const data=listings.filter(row=>{
    if(!row || !Number.isFinite(row.price) || row.price<=0 || !Number.isFinite(row.sqft) || row.sqft<=0)return false;
    if(requireSold && !isSold(row))return false;
    if(subject.zip && row.zip && subject.zip!==row.zip)return false;
    if(subject.zip && !row.zip)return false;
    if(subject.sqft>0 && (row.sqft<subject.sqft*minSqftRatio||row.sqft>subject.sqft*maxSqftRatio))return false;
    if(Number.isFinite(subject.beds)&&Number.isFinite(row.beds)&&Math.abs(row.beds-subject.beds)>bedTolerance)return false;
    if(subject.address&&row.address&&normalize(subject.address)===normalize(row.address))return false;
    if(row.date){
      const dt=new Date(row.date);
      if(Number.isFinite(dt.getTime()) && (dt>asOf||asOf-dt>180*86400000))return false;
    }
    return true;
  });
  return data.map(row=>({...row,pricePerSqft:row.price/row.sqft})).sort((a,b)=>{
    const aDiff=subject.sqft>0?Math.abs(a.sqft-subject.sqft):0;
    const bDiff=subject.sqft>0?Math.abs(b.sqft-subject.sqft):0;
    return aDiff-bDiff;
  }).slice(0,maxResults);
}
export function median(values){
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  const mid=Math.floor(a.length/2);
  return a.length%2?a[mid]:(a[mid-1]+a[mid])/2;
}
export function estimateARV(comps,sqft){
  if(!Number.isFinite(sqft)||sqft<=0)return null;
  const ppsf=median(comps.map(x=>x.pricePerSqft ?? (x.price/x.sqft)).filter(x=>Number.isFinite(x)&&x>0));
  return ppsf===null?null:{value:ppsf*sqft,medianPpsf:ppsf,compCount:comps.length};
}
function positive(value,defaultValue=0){const v=Number(value);return Number.isFinite(v)&&v>=0?v:defaultValue;}
function pct(value){return positive(value)/100;}
export function analyzeFlip(input){
  const purchase=positive(input.purchase);
  const arv=positive(input.arv);
  const rehab=positive(input.rehab);
  const contingency=pct(input.contingencyPercent);
  const buyerCost=pct(input.buyerClosingPercent);
  const saleCost=pct(input.sellingPercent);
  const holdingMonthly=positive(input.monthlyHolding);
  const months=positive(input.holdMonths);
  const other=positive(input.otherCosts);
  const targetProfit=positive(input.targetProfit);
  const rehabWithContingency=rehab*(1+contingency);
  const holding=holdingMonthly*months;
  const acquisition=purchase*(1+buyerCost);
  const totalCost=acquisition+rehabWithContingency+holding+other;
  const proceeds=arv*(1-saleCost);
  const profit=proceeds-totalCost;
  const roi=totalCost>0?profit/totalCost:null;
  const maxOffer=(proceeds-rehabWithContingency-holding-other-targetProfit)/(1+buyerCost);
  const scenarios=[-10,0,10].map(change=>{const sale=arv*(1+change/100);return {change,price:sale,profit:sale*(1-saleCost)-totalCost}});
  const downside=arv*.9*(1-saleCost)-totalCost;
  const verdict=arv<=0?'Missing resale estimate':profit<0?'Below breakeven':profit>=targetProfit && downside>=0?'Meets targets with downside cushion':profit>=targetProfit?'Meets target; downside risk':'Below target profit';
  return {acquisition,rehabWithContingency,holding,totalCost,proceeds,profit,roi,maxOffer,scenarios,verdict};
}
export function mortgagePayment(principal,annualRatePercent,years=30){
  const p=positive(principal),rate=pct(annualRatePercent)/12,n=Math.max(1,Math.round(positive(years,30)*12));
  return rate===0?p/n:p*rate*Math.pow(1+rate,n)/(Math.pow(1+rate,n)-1);
}
export function analyzeRental(input){
  const purchase=positive(input.purchase),rehab=positive(input.rehab),down=pct(input.downPercent);
  const loan=purchase*(1-down);
  const monthlyDebt=mortgagePayment(loan,input.interestPercent,input.loanYears||30);
  const annualGross=positive(input.monthlyRent)*12;
  const effectiveGross=annualGross*(1-pct(input.vacancyPercent));
  const expenses=positive(input.annualTax)+positive(input.annualInsurance)+positive(input.annualMaintenance)+positive(input.annualUtilities)+effectiveGross*pct(input.managementPercent);
  const noi=effectiveGross-expenses;
  const cashFlow=noi-monthlyDebt*12;
  const cashInvested=purchase*down+purchase*pct(input.buyerClosingPercent)+rehab;
  return {annualGross,effectiveGross,expenses,noi,loan,monthlyDebt,cashFlow,monthlyCashFlow:cashFlow/12,cashOnCash:cashInvested>0?cashFlow/cashInvested:null,capRate:purchase+rehab>0?noi/(purchase+rehab):null,dscr:monthlyDebt>0?noi/(monthlyDebt*12):null,cashInvested};
}
