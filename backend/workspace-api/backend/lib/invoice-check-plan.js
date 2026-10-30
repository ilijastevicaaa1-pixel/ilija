import { HttpError } from './validation.js';

export const CHECK_PLAN_SCHEMA={type:'object',properties:{order:{type:'array',items:{type:'string'}}},required:['order'],additionalProperties:false};
const severity={error:'Chyba',warning:'Upozornenie',info:'Informácia'};
function nextStep(row,finding){
  switch(finding.code){
    case 'overdue':return row.type==='output'
      ? 'Overte prijatú úhradu v banke a jej priradenie k vystavenej faktúre. Ak platba neprišla, skontrolujte dohodnutú splatnosť a prípadné pripomenutie odberateľovi.'
      : 'Porovnajte prijatú faktúru s bankovým výpisom a skontrolujte, či už bola úhrada zaevidovaná. O ďalšom postupe rozhodnite podľa originálu a skutočného stavu platby.';
    case 'possible_duplicate':return 'Porovnajte oba originály, čísla a predmet plnenia. Rovnaký partner, deň a suma ešte nepotvrdzujú duplicitu.';
    case 'pdf_details':return 'Otvorte detail vystavenej faktúry a skontrolujte uvedené polia aj nastavenia firmy. Neuzamknuté fakturačné údaje možno doplniť; osobitné režimy PDF vyžadujú samostatné spracovanie.';
    case 'no_items':return 'Porovnajte súhrnné sumy s originálnym dokladom. Chýbajúci rozpis v evidencii sám osebe nepreukazuje chybu.';
    case 'invalid_due_date':return 'Overte dátum splatnosti podľa originálu. V detaile vystavenej, ešte neuzamknutej faktúry možno splatnosť upraviť; pri ostatných uložených údajoch požiadajte o opravu správcu alebo účtovníka.';
    default:return 'Porovnajte uvedené údaje a výpočty s originálom. Opravu už uložených položiek alebo súm riešte so správcom aplikácie alebo účtovníkom; táto kontrola ich nemení.';
  }
}
export function checkPlanInput(rows){
  return rows.map((row,rowIndex)=>({...row,findings:row.findings.map((finding,index)=>({...finding,key:rowIndex+'-'+index}))}));
}
export function renderCheckPlan(raw,rows){
  try{
    const plan=JSON.parse(raw);
    if(!plan||!Array.isArray(plan.order)||Object.keys(plan).some(key=>key!=='order'))throw new Error('format');
    const findings=rows.flatMap(row=>row.findings.map(finding=>({row,finding,key:finding.key})));
    if(plan.order.length!==findings.length||new Set(plan.order).size!==findings.length||plan.order.some(key=>!findings.some(item=>item.key===key)))throw new Error('references');
    return plan.order.map((key,index)=>{
      const {row,finding}=findings.find(item=>item.key===key);
      return(index+1)+'. '+row.invoice_number+' – '+(severity[finding.severity]||severity.info)+': '+finding.title+'\n'+finding.detail+'\nĎalší krok: '+nextStep(row,finding);
    }).join('\n\n');
  }catch{throw new HttpError(503,'AI nevrátilo úplné poradie nálezov. Doklady sa nezmenili; použite výsledky automatickej kontroly alebo skúste výber zopakovať.');}
}
