import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,normalizeListing,selectComps,estimateARV,analyzeFlip,analyzeRental,mortgagePayment,isSold} from '../deal-engine.mjs';
import {readFileSync} from 'node:fs';

test('CSV parser preserves quoted commas and doubled quote characters',()=>{
 const rows=parseCSV('ADDRESS,PRICE,STATUS\n"25 Main St, Unit ""A""",250000,active\n');
 assert.equal(rows.length,1);
 assert.equal(rows[0].ADDRESS,'25 Main St, Unit "A"');
 assert.equal(rows[0].PRICE,'250000');
});
test('CSV parser rejects invalid unterminated quote',()=>assert.throws(()=>parseCSV('ADDRESS\n"open'),/unmatched/));
test('Redfin-style CSV fields normalize safely and reject untrusted links',()=>{
 const row=normalizeListing({'ADDRESS':'123 Main','ZIP OR POSTAL CODE':'19805','SALE PRICE':'$225,000','SQUARE FEET':'1,500','BEDS':'3','STATUS':'sold','SOLD DATE':'2026-10-01','URL':'javascript:alert(1)'});
 assert.equal(row.price,225000);assert.equal(row.sqft,1500);assert.equal(row.zip,'');assert.equal(row.url,'');assert.equal(row.beds,3);assert.ok(isSold(row));
});
test('Comps only include sold in ZIP with adequate size and dates',()=>{
 const subject={address:'5 Center',zip:'19805',sqft:1000,beds:3};
 const values=[
 {address:'A',zip:'19805',sqft:1000,beds:3,price:200000,status:'sold',date:'2026-10-01'},
 {address:'B',zip:'19805',sqft:1050,beds:3,price:231000,status:'closed',date:'2026-09-01'},
 {address:'C',zip:'19805',sqft:1000,beds:3,price:100000,status:'active',date:'2026-09-01'},
 {address:'D',zip:'19802',sqft:1000,beds:3,price:250000,status:'sold',date:'2026-10-01'},
 {address:'E',zip:'19805',sqft:2000,beds:3,price:300000,status:'sold',date:'2026-10-01'},
 {address:'F',zip:'19805',sqft:1000,beds:3,price:300000,status:'sold',date:'2024-01-01'}
 ];
 const comps=selectComps(values,subject,{asOf:new Date('2026-11-19')});
 assert.equal(comps.length,2);
 const result=estimateARV(comps,1000);assert.equal(result.medianPpsf,210);assert.equal(result.value,210000);
});
test('Flip net profit and max offer incorporate all fees and contingency',()=>{
 const result=analyzeFlip({purchase:125000,arv:230000,rehab:50000,contingencyPercent:10,buyerClosingPercent:3,sellingPercent:7.5,monthlyHolding:1000,holdMonths:5,otherCosts:0,targetProfit:25000});
 assert.equal(result.totalCost,188750);
 assert.equal(result.proceeds,212750);
 assert.equal(result.profit,24000);
 assert.equal(result.maxOffer,(212750-55000-5000-25000)/1.03);
 assert.equal(result.scenarios.length,3);
 assert.equal(result.verdict,'Below target profit');
});
test('Rental cash flow and mortgage are consistent',()=>{
 assert.equal(Math.round(mortgagePayment(120000,0,30)),333);
 const result=analyzeRental({purchase:125000,rehab:50000,monthlyRent:1800,downPercent:25,interestPercent:7,loanYears:30,vacancyPercent:7,managementPercent:8,annualTax:2500,annualInsurance:1500,annualMaintenance:2000,annualUtilities:0,buyerClosingPercent:3});
 assert.ok(result.noi<result.effectiveGross);
 assert.ok(result.monthlyDebt>0);
 assert.ok(Number.isFinite(result.cashOnCash));
 assert.ok(result.cashInvested>0);
});
test('Deal Finder UI and dashboard links are intact, and no automated Redfin API request exists',()=>{
 const html=readFileSync(new URL('../deal-finder.html',import.meta.url),'utf8');
 const nav=readFileSync(new URL('../platform.html',import.meta.url),'utf8');
 const realEstate=readFileSync(new URL('../real-estate.html',import.meta.url),'utf8');
 assert.match(html,/<title>Deal Finder/);assert.match(html,/name="viewport"/);
 assert.match(html,/id="radarResults"/);assert.match(html,/id="scenarios"/);
 assert.match(html,/import \{parseCSV/);assert.match(nav,/href="deal-finder.html"/);assert.match(realEstate,/href="deal-finder.html"/);
 assert.doesNotMatch(html,/fetch\s*\(\s*['"]https:\/\/(?:www\.)?redfin\.com/i);
 assert.equal((html.match(/<body(?:\s|>)/g)||[]).length,1);
 assert.match(html.trim(),/<\/html>$/);
});
