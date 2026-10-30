import { HttpError, text, date } from './validation.js';
import { validIban } from '../../shared/billing.mjs';

export const PROFILE_FIELDS = ['name','street','city','postal_code','country','ico','dic','vat_id','vat_payer','iban','bic','email','phone','register_info'];
function code(value,label,pattern,max) {
  const result=text(value,label,{max}).replace(/\s/g,'').toUpperCase();
  if (result && !pattern.test(result)) throw new HttpError(400,'Skontrolujte pole: '+label+'.');
  return result;
}
export function companyProfileInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.vat_payer !== 'boolean') throw new HttpError(400,'Skontrolujte údaje firmy a stav platiteľa DPH.');
  const iban=text(value.iban,'IBAN',{max:40}).replace(/\s/g,'').toUpperCase();
  if (iban && !validIban(iban)) throw new HttpError(400,'Kontrolný súčet IBAN nesúhlasí.');
  const email=text(value.email,'E-mail firmy',{max:255});
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400,'Skontrolujte e-mail firmy.');
  return {
    name:text(value.name,'Názov firmy',{required:true,max:200}),street:text(value.street,'Ulica a číslo',{max:250}),
    city:text(value.city,'Mesto',{max:100}),postal_code:text(value.postal_code,'PSČ',{max:20}),
    country:code(value.country || 'SK','Štát',/^[A-Z]{2}$/,2),ico:code(value.ico,'IČO',/^\d{8}$/,8),
    dic:code(value.dic,'DIČ',/^\d{10}$/,10),vat_id:code(value.vat_id,'IČ DPH',/^SK\d{10}$/,12),vat_payer:value.vat_payer,
    iban,bic:code(value.bic,'BIC',/^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/,11),email,
    phone:text(value.phone,'Telefón',{max:50}),register_info:text(value.register_info,'Zápis v registri',{max:500}),
  };
}
export function invoiceBillingInput(value, type = 'output') {
  const raw=value.billing_details ?? value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400,'Neplatné fakturačné údaje.');
  const variable_symbol=code(raw.variable_symbol,'Variabilný symbol',/^\d{1,10}$/,10);
  if (type === 'input') return {variable_symbol};
  return {
    variable_symbol,delivery_date:date(raw.delivery_date,'Dátum dodania'),
    customer_address:text(raw.customer_address,'Adresa odberateľa',{max:600}),
    customer_country:code(raw.customer_country || 'SK','Štát odberateľa',/^[A-Z]{2}$/,2),
    customer_ico:code(raw.customer_ico,'IČO odberateľa',/^\d{8}$/,8),customer_dic:code(raw.customer_dic,'DIČ odberateľa',/^\d{10}$/,10),
    customer_vat_id:code(raw.customer_vat_id,'IČ DPH odberateľa',/^[A-Z]{2}[A-Z0-9]{2,14}$/,16),
  };
}
