import express from 'express';
import { createAuth, invoiceSelect } from './core.js';
import { asyncRoute, HttpError, id } from './lib/validation.js';
import { analyzeInvoices, CHECK_LIMIT } from './lib/invoice-checks.js';

export function createInvoiceChecksRouter(db,{ai,groq}={}){
  const router=express.Router();router.use(createAuth(db));
  const inspect=async companyId=>{
    const client=await db.connect();
    try{
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const records=(await client.query(`SELECT 'input' AS type,${invoiceSelect('input')} FROM input_invoices WHERE company_id=$1 UNION ALL SELECT 'output' AS type,${invoiceSelect('output')} FROM output_invoices WHERE company_id=$1 ORDER BY issue_date DESC NULLS LAST,id DESC,type LIMIT $2`,[companyId,CHECK_LIMIT])).rows;
      const totalRecords=Number((await client.query('SELECT (SELECT COUNT(*) FROM input_invoices WHERE company_id=$1)+(SELECT COUNT(*) FROM output_invoices WHERE company_id=$1) AS total',[companyId])).rows[0].total);
      const profile=(await client.query('SELECT profile FROM app_companies WHERE id=$1',[companyId])).rows[0]?.profile;
      await client.query('COMMIT');
      return analyzeInvoices(records,{profile,totalRecords});
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  };
  router.get('/',asyncRoute(async(req,res)=>res.set('Cache-Control','no-store').json(await inspect(req.user.companyId))));
  router.post('/explain',asyncRoute(async(req,res)=>{
    const {provider,selection,confirmSend}=req.body;
    if(!['groq','openai'].includes(provider)||confirmSend!==true)throw new HttpError(400,'Vyberte AI službu a potvrďte odoslanie vybraných výsledkov.');
    if(!Array.isArray(selection)||selection.length<1||selection.length>5)throw new HttpError(400,'Vyberte 1 až 5 faktúr s nálezmi.');
    const keys=selection.map(row=>{if(!row||!['input','output'].includes(row.type))throw new HttpError(400,'Neplatný výber faktúry.');return row.type+':'+id(row.id);});
    if(new Set(keys).size!==keys.length)throw new HttpError(400,'Vyberte každú faktúru iba raz.');
    const report=await inspect(req.user.companyId),selected=keys.map(key=>report.invoices.find(row=>row.key===key));
    if(selected.some(row=>!row))throw new HttpError(404,'Vybrané faktúry nemajú dostupné nálezy v tejto kontrole. Obnovte prehľad.');
    const payload=selected.map(row=>({invoice_number:row.invoice_number,party:row.party,type:row.type,total_amount:row.total_amount,currency:row.currency,findings:row.findings.map(({code,severity,title,detail})=>({code,severity,title,detail}))}));
    const result=await(provider==='groq'?groq:ai).explainInvoiceChecks(req.user,payload);
    res.set('Cache-Control','no-store').json({...result,reviewedKeys:keys});
  }));
  return router;
}
