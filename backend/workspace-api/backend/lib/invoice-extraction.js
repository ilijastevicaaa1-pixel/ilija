import { date } from './validation.js';
import { decimalUnits } from '../../shared/amounts.mjs';
const plain=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function parsedDate(raw){
  const match=raw?.match(/(\d{1,2})[./]\s*(\d{1,2})[./]\s*(\d{4})|(\d{4})-(\d{2})-(\d{2})/);
  if(!match)return '';
  const value=match[4]?match[4]+'-'+match[5]+'-'+match[6]:match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0');
  try{return date(value,'Dátum',true);}catch{return '';}
}
function parsedMoney(raw){
  if(!raw)return '';
  let value=raw.replace(/[\s\u00a0]/g,'');
  if(value.includes(',')&&value.includes('.'))value=value.lastIndexOf(',')>value.lastIndexOf('.')?value.replace(/\./g,'').replace(',','.'):value.replace(/,/g,'');
  else value=value.replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(value))return '';
  try{const cents=decimalUnits(value,2);return cents>=0&&cents<=1e11?(cents/100).toFixed(2):'';}catch{return '';}
}
export function extractInvoiceFields(source){
  const lines=String(source).split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
  const find=pattern=>{const index=lines.findIndex(line=>pattern.test(plain(line)));return index<0?'':lines[index];};
  const labeled=(pattern,max=250)=>{
    const index=lines.findIndex(line=>pattern.test(plain(line)));if(index<0)return '';
    const line=lines[index],position=line.indexOf(':');
    const value=position>=0?line.slice(position+1).trim():lines[index+1]||'';
    return value.length<=max&&!/^(ico|dic|ic dph|odberatel|dodavatel|faktura|datum)\s*:/i.test(plain(value))?value:'';
  };
  const amount=pattern=>{
    const line=find(pattern);if(!line)return '';
    const values=line.match(/\d[\d \u00a0.,]*[.,]\d{2}(?!\d)/g);
    return parsedMoney(values?.at(-1));
  };
  const numberLabel=/^(?:cislo\s*faktury|faktura(?:\s*(?:c(?:islo)?\.?|#|:))?|invoice(?:\s*(?:no\.?|number|#|:))?)\s*[:#]?\s*/;
  const numberLine=find(numberLabel),prefix=plain(numberLine).match(numberLabel);
  let invoiceNumber=prefix?numberLine.slice(prefix[0].length).trim():'';
  if(!/\d/.test(invoiceNumber)||!/^[\p{L}\p{N}][\p{L}\p{N}/_.-]{0,99}$/u.test(invoiceNumber))invoiceNumber='';
  const currencies=[...new Set([...(String(source).match(/\b(?:EUR|CZK|USD|GBP)\b/g)||[]),...(String(source).includes('€')?['EUR']:[])])];
  const draft={
    invoice_number:invoiceNumber,supplier:labeled(/^dodavatel\s*:/),customer:labeled(/^odberatel\s*:/),
    issue_date:parsedDate(find(/datum\s*(?:vystavenia|vyhotovenia)|vystavene|issue\s*date/)),
    due_date:parsedDate(find(/datum\s*splatnosti|splatnost|due\s*date/)),
    amount_without_vat:amount(/zaklad\s*dane|celkom\s*bez\s*dph|spolu\s*bez\s*dph|net\s*amount|subtotal/),
    vat_amount:amount(/^(?:dph|vat)(?:\s*celkom|\s*spolu|\s*amount)?\s*[:=]/),
    total_amount:amount(/(?:celkom|spolu|suma)\s*(?:na\s*)?(?:uhradu|k\s*uhrade)|celkom\s*s\s*dph|total\s*(?:due|amount)|^celkom\s*:/),
    currency:currencies.length===1?currencies[0]:'',
  };
  const warnings=['Návrh bol vytvorený z textu. Každý údaj overte podľa pôvodného dokladu.'];
  if(draft.amount_without_vat&&draft.vat_amount&&draft.total_amount&&decimalUnits(draft.amount_without_vat,2)+decimalUnits(draft.vat_amount,2)!==decimalUnits(draft.total_amount,2))warnings.push('Rozpoznané sumy nesúhlasia. Pred uložením opravte základ, DPH a celkovú sumu.');
  return{draft,warnings};
}
