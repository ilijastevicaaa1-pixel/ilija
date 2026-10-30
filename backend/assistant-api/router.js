import express from 'express';
import jwt from 'jsonwebtoken';
import {createOpenAIService} from './openai-service.js';
import {createGroqService} from './groq-service.js';
import {assistantReply} from './assistant.js';
import {readEditorProvider,readEditorKey,readEditorVoice} from './lib/editor-ai.js';

// These routes have no database imports or initialization jobs.
export function createAssistantRouter({ai,groq,secret=()=>process.env.JWT_SECRET}={}){
  const unavailableStore={get:async()=>null};
  const settings={selectedProvider:readEditorProvider,preferEnvironmentKey:true,store:unavailableStore};
  ai??=createOpenAIService({...settings,environmentKey:()=>readEditorKey('openai')});
  groq??=createGroqService({...settings,environmentKey:()=>readEditorKey('groq')});
  const router=express.Router();
  const authenticate=(req,res,next)=>{
    const header=req.get('authorization')||'';
    if(!header.startsWith('Bearer ')||header.length>8192)return res.status(401).json({error:'Asistent potrebuje platné prihlásenie.'});
    try{
      const signingKey=secret();
      if(!signingKey)return res.status(503).json({error:'Prihlásenie sa teraz nepodarilo overiť.'});
      const user=jwt.verify(header.slice(7),signingKey,{algorithms:['HS256']});
      // Legacy login tokens for the existing company do not always contain tenantId.
      const id=Number(user.id),companyId=Number(user.tenantId??user.company_id??1);
      if(!user.exp||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(companyId)||companyId<1)throw Error('invalid account');
      req.user={id,companyId,role:user.role,email:user.email};next();
    }catch{return res.status(401).json({error:'Prihlásenie už nie je platné. Prihláste sa znova.'});}
  };
  const route=handler=>(req,res)=>Promise.resolve().then(()=>handler(req,res)).catch(error=>{
    res.status(error.status||500).json({error:error.status?error.message:'Asistent teraz nedokázal odpovedať. Skúste to znova.'});
  });
  for(const [name,service]of Object.entries({openai:ai,groq})){
    router.get('/settings/'+name,authenticate,route(async(req,res)=>res.set('Cache-Control','no-store').json({...await service.status(req.user),voice:readEditorVoice()})));
  }
  router.post('/ai/command',authenticate,route(async(req,res)=>{
    const body=req.body||{};
    if(['groq','openai'].includes(body.mode))return res.set('Cache-Control','no-store').json(await(body.mode==='groq'?groq:ai).chat(req.user,body));
    const message=body.message??body.text;
    if(typeof message!=='string'||!message.trim()||message.length>4000)return res.status(400).json({error:'Napíšte správu asistentovi.'});
    return res.json(assistantReply(message,body.context));
  }));
  router.post('/ai/invoice-draft',authenticate,route(async(req,res)=>{
    if(!['groq','openai'].includes(req.body?.provider))return res.status(400).json({error:'AI služba nie je nastavená.'});
    res.set('Cache-Control','no-store').json(await(req.body.provider==='groq'?groq:ai).invoiceDraft(req.user,{message:req.body.message}));
  }));
  return router;
}

export default createAssistantRouter();
