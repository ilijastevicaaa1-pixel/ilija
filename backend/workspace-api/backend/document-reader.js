import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';
import { createWorker } from 'tesseract.js';
import { HttpError } from './lib/validation.js';
import { extractInvoiceFields } from './lib/invoice-extraction.js';
const MAX_PIXELS=24000000,MAX_PAGES=30,MAX_OCR_PAGES=5;
const languageDirectory=fileURLToPath(new URL('./.private/ocr-data/',import.meta.url));
const aborted=signal=>{if(signal?.aborted)throw new HttpError(409,'Čítanie bolo zrušené.');};
export function documentKind(buffer){
  if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>10*1024*1024)throw new HttpError(400,'Vyberte PDF, PNG alebo JPG do 10 MB.');
  if(buffer.subarray(0,5).equals(Buffer.from('%PDF-')))return 'pdf';
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpeg';
  throw new HttpError(400,'Podporované sú PDF, PNG a JPG. Vyberte pôvodný doklad alebo jeho fotografiu.');
}
export function createDocumentReader({workerFactory=createWorker}={}){
  let worker=null,currentProgress=null,generation=0;
  async function release(){generation++;const previous=worker;worker=null;if(previous)await previous.terminate().catch(()=>{});}
  async function recognize(buffer,signal,progress){
    aborted(signal);currentProgress=progress;
    let rejectInterrupt;
    const interruption=new Promise((resolve,reject)=>{rejectInterrupt=reject;});
    const interrupt=error=>{release().catch(()=>{});rejectInterrupt(error);};
    const cancel=()=>interrupt(new HttpError(409,'Čítanie bolo zrušené.'));
    signal?.addEventListener('abort',cancel,{once:true});
    const timer=setTimeout(()=>interrupt(new HttpError(503,'Rozpoznávanie trvá príliš dlho. Skúste menší súbor.')),120000);timer.unref();
    const action=async()=>{
      if(!worker){
        progress(0,'Pripravujem lokálne OCR');await mkdir(languageDirectory,{recursive:true});
        const ownGeneration=++generation;
        const candidate=await workerFactory('slk+eng',1,{cachePath:languageDirectory,logger:event=>{
          if(ownGeneration===generation&&event.status==='recognizing text')currentProgress?.(event.progress,'Rozpoznávam text');
        },errorHandler:()=>{}});
        if(signal?.aborted||ownGeneration!==generation){await candidate.terminate();throw new HttpError(409,'Čítanie bolo zrušené.');}
        worker=candidate;await worker.setParameters({preserve_interword_spaces:'1',user_defined_dpi:'180'});
      }
      aborted(signal);return worker.recognize(buffer);
    };
    try{
      const result=await Promise.race([action(),interruption]);aborted(signal);
      return{text:result.data.text?.trim()||'',confidence:Number(result.data.confidence)||0};
    }catch(error){
      await release();aborted(signal);
      throw error instanceof HttpError?error:new HttpError(422,'Text sa nepodarilo rozpoznať. Skúste ostrejší a rovno otočený obrázok.');
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);currentProgress=null;}
  }
  async function readImage(buffer,signal,progress){
    let dimensions;try{dimensions=imageSize(buffer);}catch{throw new HttpError(400,'Obrázok je poškodený alebo nemá platné rozmery.');}
    if(!dimensions.width||!dimensions.height||dimensions.width*dimensions.height>MAX_PIXELS)throw new HttpError(400,'Obrázok je príliš veľký. Zmenšite ho na najviac 24 megapixelov.');
    const {loadImage,createCanvas}=await import('@napi-rs/canvas');
    let image;try{image=await loadImage(buffer);}catch{throw new HttpError(400,'Obrázok sa nepodarilo otvoriť.');}
    aborted(signal);
    const scale=Math.min(1,3200/Math.max(image.width,image.height)),canvas=createCanvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)));
    try{
      const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      const result=await recognize(canvas.toBuffer('image/png'),signal,(value,stage)=>progress(Math.round(value*95),stage));
      return{...result,pages:1,pagesRead:1,ocrPages:1,method:'ocr',warnings:[],truncated:false};
    }finally{canvas.width=1;canvas.height=1;}
  }
  async function readPdf(buffer,signal,progress,allowOcr){
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    let loading,document;
    try{
      loading=getDocument({data:new Uint8Array(buffer),isEvalSupported:false,enableXfa:false,disableFontFace:true,useSystemFonts:false,maxImageSize:MAX_PIXELS,verbosity:0,
        standardFontDataUrl:fileURLToPath(new URL('./node_modules/pdfjs-dist/',import.meta.url))+'standard_fonts/',
        cMapUrl:fileURLToPath(new URL('./node_modules/pdfjs-dist/',import.meta.url))+'cmaps/',cMapPacked:true});
      document=await loading.promise;aborted(signal);
      const pagesRead=Math.min(document.numPages,MAX_PAGES),texts=[],warnings=[],confidences=[];
      let ocrPages=0,omitted=0;
      for(let index=1;index<=pagesRead;index++){
        aborted(signal);progress(Math.round((index-1)/pagesRead*95),'Čítam stranu '+index+' z '+pagesRead);
        const page=await document.getPage(index),content=await page.getTextContent();
        let pageText=content.items.filter(item=>typeof item.str==='string').map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();
        if(allowOcr&&pageText.replace(/\s/g,'').length<25){
          if(ocrPages>=MAX_OCR_PAGES){omitted++;continue;}
          const base=page.getViewport({scale:1}),scale=Math.min(2.5,Math.sqrt(12000000/(base.width*base.height)));
          if(!Number.isFinite(scale)||scale<=0||base.width>20000||base.height>20000)throw new HttpError(400,'Rozmery strany PDF sú príliš veľké.');
          const viewport=page.getViewport({scale}),factory=document.canvasFactory,canvas=factory.create(Math.ceil(viewport.width),Math.ceil(viewport.height));
          try{
            await page.render({canvasContext:canvas.context,viewport,background:'rgb(255,255,255)'}).promise;
            const result=await recognize(canvas.canvas.toBuffer('image/png'),signal,(value,stage)=>progress(Math.round(((index-1+value)/pagesRead)*95),stage+' – strana '+index));
            pageText=result.text;confidences.push(result.confidence);ocrPages++;
          }finally{factory.destroy(canvas);}
        }
        texts.push(pageText);page.cleanup();
      }
      if(document.numPages>MAX_PAGES)warnings.push('Načítaných bolo iba prvých 30 strán. Skontrolujte aj zvyšok pôvodného PDF.');
      if(omitted)warnings.push('OCR spracovalo najviac 5 skenovaných strán. Ďalšie skeny rozdeľte do menších súborov.');
      return{text:texts.join('\n\n'),pages:document.numPages,pagesRead,ocrPages,method:ocrPages?'ocr':'text',confidence:confidences.length?Math.round(confidences.reduce((sum,value)=>sum+value,0)/confidences.length):null,warnings,truncated:document.numPages>MAX_PAGES||omitted>0};
    }catch(error){aborted(signal);if(error instanceof HttpError)throw error;throw new HttpError(400,'PDF sa nepodarilo prečítať. Skontrolujte, či nie je poškodené alebo zaheslované.');}
    finally{if(loading)await loading.destroy().catch(()=>{});}
  }
  return{
    async read(buffer,{signal,progress=()=>{},allowOcr=true}={}){
      const kind=documentKind(buffer);aborted(signal);
      const result=kind==='pdf'?await readPdf(buffer,signal,progress,allowOcr):await readImage(buffer,signal,progress);
      if(!result.text?.trim())throw new HttpError(422,'V doklade sa nepodarilo nájsť čitateľný text. Skúste kvalitnejší sken alebo ručný zápis.');
      if(result.text.length>50000){result.text=result.text.slice(0,50000);result.truncated=true;result.warnings.push('Text bol skrátený na 50 000 znakov. Skontrolujte celý pôvodný doklad.');}
      if(result.confidence!=null&&result.confidence<75)result.warnings.push('Istota OCR je nízka. Osobitne overte čísla, dátumy a názvy.');
      const extracted=extractInvoiceFields(result.text);progress(100,'Doklad je pripravený na kontrolu');
      return{...result,draft:extracted.draft,warnings:[...result.warnings,...extracted.warnings]};
    },
    close:release,
  };
}
