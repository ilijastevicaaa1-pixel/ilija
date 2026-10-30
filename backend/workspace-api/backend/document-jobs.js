import { randomUUID } from 'node:crypto';
import { createDocumentReader, documentKind } from './document-reader.js';
import { HttpError } from './lib/validation.js';
export function createDocumentJobs({reader=createDocumentReader(),clock=Date.now,ttl=15*60*1000,maxQueue=3}={}){
  const jobs=new Map(),queue=[];let active=null,pumping=false;
  const owner=user=>String(user.companyId)+':'+String(user.id);
  const clean=()=>{for(const[id,job]of jobs)if(!['queued','processing'].includes(job.status)&&clock()-job.updatedAt>ttl)jobs.delete(id);};
  const publicJob=job=>({jobId:job.id,status:job.status,progress:job.progress,stage:job.stage,...(job.result?{result:job.result}:{}),...(job.error?{error:job.error}:{})});
  async function pump(){
    if(pumping)return;pumping=true;
    try{
      while(queue.length){
        const job=queue.shift();if(job.controller.signal.aborted)continue;
        active=job;job.status='processing';job.updatedAt=clock();
        try{
          job.result=await reader.read(job.buffer,{signal:job.controller.signal,progress:(value,stage)=>{job.progress=Math.max(job.progress,Math.min(100,Number(value)||0));job.stage=stage;job.updatedAt=clock();}});
          job.status=job.controller.signal.aborted?'cancelled':'done';
        }catch(error){job.status=job.controller.signal.aborted?'cancelled':'failed';job.error=error instanceof HttpError?error.message:'Doklad sa nepodarilo načítať. Skúste to znova.';}
        finally{job.buffer=null;job.updatedAt=clock();active=null;}
      }
    }finally{pumping=false;}
  }
  return{
    submit(user,file){
      clean();documentKind(file.buffer);
      if([...jobs.values()].some(job=>job.owner===owner(user)&&['queued','processing'].includes(job.status)))throw new HttpError(429,'Počkajte na dokončenie predchádzajúceho dokladu.');
      if(queue.length>=maxQueue||jobs.size>=30)throw new HttpError(429,'Čítanie dokladov je zaneprázdnené. Skúste to o chvíľu.');
      const job={id:randomUUID(),owner:owner(user),buffer:file.buffer,status:'queued',progress:0,stage:'Doklad čaká na spracovanie',updatedAt:clock(),controller:new AbortController()};
      jobs.set(job.id,job);queue.push(job);setImmediate(()=>{pump().catch(()=>{});});return publicJob(job);
    },
    get(user,id){clean();const job=jobs.get(id);if(!job||job.owner!==owner(user))throw new HttpError(404,'Čítanie dokladu už nie je dostupné. Nahrajte ho znova.');return publicJob(job);},
    cancel(user,id){
      const job=jobs.get(id);if(!job||job.owner!==owner(user))throw new HttpError(404,'Čítanie dokladu nie je dostupné.');
      job.controller.abort();job.status='cancelled';job.buffer=null;job.result=null;job.error=null;jobs.delete(id);return{cancelled:true};
    },
    async close(){for(const job of jobs.values())job.controller.abort();queue.length=0;jobs.clear();await reader.close();},
  };
}
