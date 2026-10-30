import {createApp} from './workspace-api/backend/app.js';
import {createOpenAIService} from './assistant-api/openai-service.js';
import {createGroqService} from './assistant-api/groq-service.js';

const exact=new Set(['/api/me','/api/status','/api/reports','/api/manual-entry','/api/fakture/batch','/api/input-invoices','/api/output-invoices','/api/upload/pdf','/api/upload/bank','/api/ocr','/api/ai/parse-faktura','/api/voice-to-text']);
const prefixes=['/api/invoices/','/api/bank/','/api/warehouse/','/api/documents/','/api/state/','/api/company','/api/checks/invoices','/api/backups','/api/imports/invoice','/api/manual-entry/'];
export const isWorkspacePath=pathname=>exact.has(pathname)||prefixes.some(prefix=>pathname===prefix||pathname.startsWith(prefix.endsWith('/')?prefix:prefix+'/'));

export function createWorkspaceBridge(getDb){
  let application;
  const app=()=>application??=(async()=>{
    const db=await getDb();
    const options={selectedProvider:()=> 'groq',preferEnvironmentKey:true,store:{get:async()=>null}};
    const ai=createOpenAIService(options),groq=createGroqService(options);
    // createApp does not run migrations or start automatic backups.
    return createApp(db,{ai,groq});
  })().catch(error=>{application=null;throw error;});
  return (req,res,next)=>{
    if(!isWorkspacePath(req.path))return next();
    app().then(workspace=>workspace(req,res,next)).catch(()=>res.status(503).json({error:'Modul teraz nie je dostupný. Skúste to znova.'}));
  };
}
