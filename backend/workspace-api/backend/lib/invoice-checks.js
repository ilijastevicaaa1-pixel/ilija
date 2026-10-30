import { decimalUnits, invoiceAmounts } from '../../shared/amounts.mjs';
import { invoiceBillingIssues, profileIssues } from '../../shared/billing.mjs';

export const CHECK_LIMIT=500;
const iso=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const cents=value=>{if(value==null||value==='')return null;try{return decimalUnits(value,2);}catch{return null;}};
export const invoiceKey=invoice=>invoice.type+':'+invoice.id;
export function slovakToday(now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(part=>[part.type,part.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
}
export function analyzeInvoices(records,{profile=null,today=slovakToday(),totalRecords=records.length}={}){
  const duplicates=new Map();
  for(const row of records){
    if(row.status==='draft'||!row.party||!iso(row.issue_date)||cents(row.total_amount)==null)continue;
    const signature=JSON.stringify([row.type,row.party.trim().toLocaleLowerCase('sk-SK'),row.issue_date,row.currency,cents(row.amount_without_vat),cents(row.vat_amount),cents(row.total_amount)]);
    const list=duplicates.get(signature)||[];list.push(invoiceKey(row));duplicates.set(signature,list);
  }
  const checked=records.map(row=>{
    const findings=[],add=(code,severity,title,detail,related=[])=>findings.push({code,severity,title,detail,related});
    if(!row.invoice_number||!row.party||!iso(row.issue_date)||!/^[A-Z]{3}$/.test(row.currency||''))add('missing_basics','error','Chýbajú základné údaje','Skontrolujte číslo faktúry, partnera, dátum vystavenia a menu.');
    const net=cents(row.amount_without_vat),vat=cents(row.vat_amount),total=cents(row.total_amount);
    if([net,vat,total].includes(null))add('missing_amounts','error','Neúplné uložené sumy','Doplňte základ dane, DPH a celkovú sumu podľa originálu dokladu.');
    else if(net+vat!==total)add('totals_mismatch','error','Súčet nesúhlasí','Uložený základ dane a DPH sa nezhodujú s celkovou sumou.');
    if(Array.isArray(row.items)&&row.items.length){
      try{
        if(row.items.some(item=>!item||typeof item.name!=='string'||!item.name.trim()||!(Number(item.qty)>0)||item.price==null||Number(item.price)<0||item.vat==null||Number(item.vat)<0||Number(item.vat)>100))throw new Error('items');
        const sums=invoiceAmounts(row.items);
        if(net!==sums.net||vat!==sums.vat||total!==sums.net+sums.vat)add('lines_mismatch','error','Položky nesúhlasia so sumami','Súčet položiek alebo DPH položiek je odlišný od uložených súm faktúry.');
      }catch{add('invalid_items','error','Neplatná položka','Skontrolujte názov, množstvo, cenu a sadzbu DPH každej položky.');}
    }else add('no_items','info','Záznam nemá rozpis položiek','Môže ísť o súhrnný alebo importovaný záznam. Položky porovnajte s originálom; samotná absencia rozpisu nepotvrdzuje chybu.');
    if(row.due_date&&(!iso(row.due_date)||(iso(row.issue_date)&&row.due_date<row.issue_date)))add('invalid_due_date','error','Skontrolujte splatnosť','Dátum splatnosti nie je platný alebo je pred dátumom vystavenia.');
    else if(row.status==='unpaid'&&iso(row.due_date)&&row.due_date<today)add('overdue','warning','Faktúra je po splatnosti','V evidencii je neuhradená a dátum splatnosti už uplynul. Najprv overte úhradu v banke.');
    if(row.type==='output'){
      const issues=invoiceBillingIssues(row,row.billing_details?.issued_at?row.billing_details.issuer:profile);
      if(issues.length)add('pdf_details','warning','Údaje pre vystavenú faktúru PDF nie sú úplné',issues.join('; ')+'.');
    }
    for(const list of duplicates.values())if(list.length>1&&list.includes(invoiceKey(row)))add('possible_duplicate','warning','Možný duplicitný doklad','V kontrolovanej skupine sa opakuje partner, deň, mena a sumy. Môžu to byť aj dve samostatné plnenia; porovnajte originály.',list.filter(key=>key!==invoiceKey(row)));
    return{key:invoiceKey(row),type:row.type,id:row.id,invoice_number:row.invoice_number,party:row.party,issue_date:row.issue_date,due_date:row.due_date,currency:row.currency,total_amount:row.total_amount,status:row.status,findings};
  });
  const invoices=checked.filter(row=>row.findings.length),counts={error:0,warning:0,info:0};
  for(const row of invoices)for(const finding of row.findings)counts[finding.severity]++;
  return{checkedAt:new Date().toISOString(),today,scanned:records.length,totalRecords,truncated:totalRecords>records.length,limit:CHECK_LIMIT,companyMissing:profileIssues(profile),counts,affectedInvoices:invoices.length,invoices};
}
