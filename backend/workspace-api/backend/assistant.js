const option=(label,path)=>({label,path});
export const assistantMenu=[
  {key:'fakturacia',label:'Fakturácia',options:[option('Vytvoriť vystavenú faktúru','/invoices/output'),option('Zadať prijatú faktúru','/invoices/input'),option('Načítať text z PDF','/ai/faktura'),option('Prehľad DPH','/vat/periods'),option('Prehľad faktúr a úhrad','/invoices/output')]},
  {key:'banka',label:'Bankové operácie',options:[option('Účty a transakcie','/bank'),option('Pridať transakciu','/bank'),option('Párovanie platieb','/bank#matching'),option('Import bankového výpisu CSV','/bank'),option('Prehľad príjmov a výdavkov','/bank')]},
  {key:'dph',label:'DPH',options:[{label:'Vypočítať DPH',calculator:true},option('Prehľad vstupnej a výstupnej DPH','/vat/periods'),option('Úlohy a termíny','/deadlines')]},
  {key:'vydavky',label:'Výdavky',options:[option('Zadať prijatú faktúru','/invoices/input'),option('Osobný rozpočet a kategórie','/rozpocet'),option('Načítať text z PDF','/ai/faktura')]},
  {key:'prijmy',label:'Príjmy',options:[option('Vystavené faktúry','/invoices/output'),option('Bankové príjmy','/bank'),option('Mesačný a ročný prehľad','/reports/annual')]},
  {key:'reporty',label:'Reporty',options:[option('Mesačný a ročný prehľad','/reports/annual'),option('Prehľad DPH','/vat/periods'),option('Rozpočet a výdavky','/rozpocet')]},
  {key:'dokumenty',label:'Dokumenty',options:[option('Zmluvy','/contracts'),option('Interné doklady','/internal-records'),option('Ponuky','/offers'),option('Cestovné príkazy','/travel-orders'),option('Mzdové podklady','/salaries'),option('Načítať PDF','/ai/faktura')]},
  {key:'zakaznici',label:'Zákazníci',unavailable:'Samostatná evidencia zákazníkov zatiaľ nie je dostupná. Partnera zadajte priamo do faktúry.',options:[option('Vystavené faktúry','/invoices/output')]},
  {key:'projekty',label:'Projekty',unavailable:'Samostatná evidencia projektov zatiaľ nie je dostupná. Podklady môžete evidovať v interných dokladoch.',options:[option('Interné doklady','/internal-records')]},
  {key:'asistent',label:'Pomoc a nastavenie',options:[option('Ručné zadávanie','/manual-entry'),option('Úlohy a termíny','/deadlines'),option('Načítať viac PDF','/ai/batch')]},
  {key:'sklad',label:'Skladové hospodárstvo',options:[option('Stav skladu','/warehouse/stanje'),option('Príjem tovaru','/warehouse/prijemke'),option('Výdaj tovaru','/warehouse/vydajke'),option('Skladové položky a karty pohybov','/warehouse/artikli')]},
];
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const words={jeden:'1',jedna:'1',dva:'2',dve:'2',tri:'3',styri:'4',pat:'5',sest:'6',sedem:'7',osem:'8',devat:'9',desat:'10',jedenast:'11'};
const menuText=()=>assistantMenu.map((item,index)=>`${index+1}) ${item.label}${item.unavailable?' (obmedzené)':''}`).join('\n');
const response=(reply,context={},actions=[])=>({reply,answer:reply,mode:'menu',context,actions});
const categoryReply=category=>response((category.unavailable?category.unavailable+'\n\n':'')+category.label+'\n'+category.options.map((item,index)=>`${index+1}) ${item.label}`).join('\n')+'\n\nNapíšte číslo možnosti alebo „menu“.',{category:category.key});
function calculate(raw){
  const match=String(raw).trim().match(/^(?:dph\s+)?(\d+(?:[.,]\d{1,2})?)\s*[;|]\s*(\d+(?:[.,]\d{1,2})?)\s*%?$/i);
  if(!match)return response('Zadajte základ dane a vlastnú sadzbu oddelené bodkočiarkou, napríklad 100;10. Sadzbu vyberáte vy.',{category:'dph',operation:'calculator'});
  const base=Number(match[1].replace(',','.')),rate=Number(match[2].replace(',','.'));
  if(base>1e9||rate>100)return response('Základ musí byť do 1 000 000 000 a sadzba od 0 do 100 %. Skúste to znova.',{category:'dph',operation:'calculator'});
  const cents=Math.round(base*100),vat=Math.round(cents*rate/100),format=cents=>(cents/100).toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2});
  return response(`Základ dane: ${format(cents)}\nSadzba: ${rate} %\nDPH: ${format(vat)}\nCelkom: ${format(cents+vat)}\n\nPre ďalší výpočet zadajte základ;sadzbu.`,{category:'dph',operation:'calculator'});
}
export function assistantReply(raw,context={}){
  const input=normalize(raw),choice=words[input]||input;
  if(['menu','hlavne menu','hlavna ponuka','spat','reset','zrusit'].includes(input))return response('Vyberte funkciu:\n'+menuText());
  if(/^(?:skontroluj|skontrolovat|kontrola)\b/.test(input))return response('Tu otvoríte kontrolu dokladov. Výsledky môžete po výbere a súhlase vysvetliť pomocou AI.',{},[option('Skontrolovať doklady','/checks/invoices')]);
  if(/(?:priprav|vytvor|vystav).*faktur.*\bai\b|\bai\b.*faktur/.test(input))return response('AI pripraví editovateľný návrh z vášho opisu. Údaje skontrolujete a uložíte až po potvrdení.',{},[option('Pripraviť faktúru s AI','/with-bookkeeper?task=invoice')]);
  if(context?.operation==='calculator'||/^dph\s+\d/.test(input))return calculate(raw);
  if(/prijat.*faktur|vstup.*faktur|ulazn.*faktur/.test(input))return response('Prijatú faktúru zadáte a uložíte v tomto formulári.',{},[option('Prijaté faktúry','/invoices/input')]);
  if(/vystav.*faktur|vytvor.*faktur|izlazn.*faktur/.test(input))return response('Vystavenú faktúru zadáte a uložíte v tomto formulári.',{},[option('Vystavené faktúry','/invoices/output')]);
  const current=assistantMenu.find(item=>item.key===context?.category);
  if(current){
    const selected=/^\d{1,2}$/.test(choice)?current.options[Number(choice)-1]:current.options.find(item=>normalize(item.label)===input);
    if(!selected)return categoryReply(current);
    if(selected.calculator)return calculate('');
    return response(`Otvorte „${selected.label}“. Údaje pred uložením skontrolujte vo formulári.`,{category:current.key},[selected]);
  }
  let category=/^\d{1,2}$/.test(choice)?assistantMenu[Number(choice)-1]:null;
  if(!category)category=assistantMenu.find(item=>input.includes(item.key)||input===normalize(item.label));
  if(!category){
    if(/faktur/.test(input))category=assistantMenu[0];
    else if(/bank/.test(input))category=assistantMenu[1];
    else if(/sklad/.test(input))category=assistantMenu[10];
    else if(/rozpocet/.test(input))return response('Tu otvoríte rozpočet a uložené výdavky.',{},[option('Rozpočet','/rozpocet')]);
    else if(/termin|uloh/.test(input))return response('Tu otvoríte úlohy a termíny.',{},[option('Úlohy a termíny','/deadlines')]);
  }
  return category?categoryReply(category):response('Pomôžem vám vybrať funkciu aplikácie. Vyberte číslo alebo názov:\n'+menuText()+'\n\nPre voľnú AI konverzáciu vyberte pripojenú službu v režime asistenta.');
}
