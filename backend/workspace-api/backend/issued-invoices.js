import express from 'express';
import { createAuth, invoiceSelect } from './core.js';
import { asyncRoute, HttpError, id, date, transaction } from './lib/validation.js';
import { invoiceBillingInput } from './lib/company-profile.js';
import { invoiceBillingIssues } from '../shared/billing.mjs';
import { issuedInvoicePdf } from './lib/issued-invoice-pdf.js';

const locked = () => new HttpError(409,'Faktúra už bola vystavená. Údaje dodávateľa a odberateľa sú na nej uzamknuté.');
async function record(db,companyId,invoiceId,lock=false) {
  const value=(await db.query(`SELECT ${invoiceSelect('output')} FROM output_invoices WHERE company_id=$1 AND id=$2${lock?' FOR UPDATE':''}`,[companyId,id(invoiceId)])).rows[0];
  if(!value)throw new HttpError(404,'Faktúra neexistuje.');
  return value;
}
export function createIssuedInvoicesRouter(db) {
  const router=express.Router();router.use(createAuth(db));
  router.put('/:id/billing',asyncRoute(async(req,res)=>{
    const invoice=await transaction(db,async client=>{
      const current=await record(client,req.user.companyId,req.params.id,true);
      if(current.billing_details?.issued_at)throw locked();
      const details=invoiceBillingInput(req.body,'output');
      const dueDate=Object.hasOwn(req.body,'due_date')?date(req.body.due_date,'Dátum splatnosti'):current.due_date;
      if(dueDate&&dueDate<current.issue_date)throw new HttpError(400,'Splatnosť nesmie byť pred vystavením.');
      await client.query('UPDATE output_invoices SET billing_details=$1,due_date=$2,updated_at=now() WHERE id=$3 AND company_id=$4',[JSON.stringify(details),dueDate,current.id,req.user.companyId]);
      return {...current,due_date:dueDate,billing_details:details};
    });
    res.json(invoice);
  }));
  router.post('/:id/issue',asyncRoute(async(req,res)=>{
    const invoice=await transaction(db,async client=>{
      const current=await record(client,req.user.companyId,req.params.id,true);
      if(current.billing_details?.issued_at)return current;
      const company=(await client.query('SELECT profile FROM app_companies WHERE id=$1',[req.user.companyId])).rows[0];
      const details={...current.billing_details,issuer:company?.profile || null,issued_at:new Date().toISOString()};
      const result={...current,billing_details:details},issues=invoiceBillingIssues(result);
      if(issues.length)throw new HttpError(400,'Pred vystavením doplňte alebo skontrolujte: '+issues.join('; ')+'.');
      await client.query('UPDATE output_invoices SET billing_details=$1,updated_at=now() WHERE id=$2 AND company_id=$3',[JSON.stringify(details),current.id,req.user.companyId]);
      return result;
    });
    res.json(invoice);
  }));
  router.get('/:id/document-pdf',asyncRoute(async(req,res)=>{
    const invoice=await record(db,req.user.companyId,req.params.id);
    if(!invoice.billing_details?.issued_at)throw new HttpError(409,'Najprv skontrolujte údaje a vystavte faktúru tlačidlom „Vystaviť faktúru PDF“.');
    const buffer=await issuedInvoicePdf(invoice);
    res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="faktura-'+invoice.id+'.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(buffer);
  }));
  return router;
}
