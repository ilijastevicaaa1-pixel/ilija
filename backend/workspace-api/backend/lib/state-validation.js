import { randomUUID } from 'node:crypto';
import { HttpError, text, money, date } from './validation.js';
const object=value=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Neplatný záznam.');return value;};
function rowId(value,seen){
  const result=value==null?randomUUID():text(typeof value==='number'?String(value):value,'Označenie záznamu',{required:true,max:100});
  if(!/^[A-Za-z0-9_-]+$/.test(result)||seen.has(result))throw new HttpError(400,'Označenia záznamov musia byť jedinečné.');
  seen.add(result);return result;
}
export function normalizeState(key,raw){
  if(key==='deadlines'){
    if(!Array.isArray(raw)||raw.length>5000)throw new HttpError(400,'Neplatný zoznam úloh.');
    const seen=new Set();
    return raw.map(raw=>{
      const task=object(raw);
      if(!['NOVÉ','V PROCESE','HOTOVÉ'].includes(task.status)||!['NÍZKA','STREDNÁ','VYSOKÁ'].includes(task.priority))throw new HttpError(400,'Neplatný stav alebo priorita úlohy.');
      return{id:rowId(task.id,seen),title:text(task.title,'Názov úlohy',{required:true,max:500}),dueDate:date(task.dueDate,'Termín',true),status:task.status,priority:task.priority,
        ...(task.note!=null?{note:text(task.note,'Poznámka',{max:2000})}:{}),...(task.createdAt!=null?{createdAt:date(task.createdAt,'Vytvorenie',true)}:{})};
    });
  }
  if(key!=='budget')throw new HttpError(404,'Neznámy typ údajov.');
  const value=object(raw);
  if(!Array.isArray(value.kategorie)||!value.kategorie.length||!Array.isArray(value.transakcie)||value.kategorie.length>100||value.transakcie.length>10000)throw new HttpError(400,'Neplatné údaje rozpočtu.');
  const categories=new Set(),seen=new Set();
  const kategorie=value.kategorie.map(raw=>{
    const category=object(raw),nazov=text(category.nazov,'Kategória',{required:true,max:100});
    if(categories.has(nazov))throw new HttpError(400,'Kategórie musia mať jedinečný názov.');
    categories.add(nazov);return{nazov,limit:money(category.limit,'Limit')};
  });
  const transakcie=value.transakcie.map(raw=>{
    const item=object(raw),kategoria=text(item.kategoria,'Kategória',{required:true,max:100});
    if(!categories.has(kategoria))throw new HttpError(400,'Kategória výdavku nie je v rozpočte.');
    return{id:rowId(item.id,seen),nazov:text(item.nazov,'Názov',{required:true,max:500}),suma:money(item.suma,'Suma',{min:0.01}),kategoria,datum:date(item.datum,'Dátum',true)};
  });
  return{planovanyRozpocet:money(value.planovanyRozpocet,'Rozpočet'),kategorie,transakcie};
}
