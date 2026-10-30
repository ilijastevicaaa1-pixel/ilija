import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { invoiceAmounts } from '../../shared/amounts.mjs';

const fonts=fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url));
const plain=value=>String(value??'—').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const compact=value=>plain(value).replace(/\s+/g,' ').trim()||'—';
const day=value=>{
  const match=String(value??'').slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?match[3]+'. '+match[2]+'. '+match[1]:'Neuvedený';
};

// Export exactly the saved record; missing identity and tax information is never invented.
export function invoicePdf(invoice,{type='input',companyName=''}={}){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margins:{top:64,right:42,bottom:64,left:42},bufferPages:true,autoFirstPage:true,info:{Title:'Prehľad faktúry '+compact(invoice.invoice_number),Author:'Účtovníctvo',Subject:'Prehľad uloženého záznamu'}});
    const chunks=[];doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    doc.registerFont('regular',fonts+'LiberationSans-Regular.ttf');doc.registerFont('bold',fonts+'LiberationSans-Bold.ttf');
    const left=42,width=doc.page.width-84,bottom=()=>doc.page.height-64,ink='#18363a',muted='#576d70',accent='#08766d';
    const currency=/^[A-Z]{3}$/.test(invoice.currency)?invoice.currency:'EUR';
    const amount=value=>value==null||value===''||!Number.isFinite(Number(value))?'Neúplná suma':new Intl.NumberFormat('sk-SK',{style:'currency',currency}).format(Number(value));
    const heading=()=>{
      doc.save().rect(left,28,width,3).fill(accent).restore();
      doc.font('bold').fontSize(9).fillColor(muted).text('ÚČTOVNÍCTVO · PREHĽAD FAKTÚRY',left,40,{width,lineBreak:false});
      doc.x=left;doc.y=66;
    };
    heading();doc.on('pageAdded',heading);
    doc.font('bold').fontSize(24).fillColor(ink).text(compact(invoice.invoice_number),left,72,{width});
    doc.moveDown(0.25).font('regular').fontSize(10).fillColor(muted).text(type==='input'?'Prijatá faktúra · uložený záznam':'Vystavená faktúra · uložený záznam',{width});
    if(companyName)doc.moveDown(0.35).text('Účet firmy: '+compact(companyName),{width});
    doc.moveDown(1);
    const entry=(label,value)=>{
      const y=doc.y;doc.font('regular').fontSize(10).fillColor(muted).text(label,left,y,{width:132});
      doc.font('bold').fillColor(ink).text(plain(value),left+142,y,{width:width-142});
      doc.x=left;doc.y=Math.max(doc.y,y+12)+7;
    };
    entry(type==='input'?'Dodávateľ':'Odberateľ',compact(invoice.party));
    entry('Dátum vystavenia',day(invoice.issue_date));entry('Dátum splatnosti',day(invoice.due_date));
    entry('Stav úhrady',invoice.status==='paid'?'Uhradená':invoice.status==='draft'?'Koncept':'Neuhradená');
    if(invoice.payment_date)entry('Dátum úhrady',day(invoice.payment_date));
    doc.y+=12;
    const widths=[196,60,88,48,width-392],labels=['Položka','Množstvo','Cena bez DPH','DPH %','Celkom'];
    const tableHeader=()=>{
      const y=doc.y;doc.rect(left,y,width,28).fill('#e9f2f1');let x=left;
      labels.forEach((label,index)=>{doc.font('bold').fontSize(8.5).fillColor(ink).text(label,x+7,y+9,{width:widths[index]-14,align:index?'right':'left'});x+=widths[index];});doc.y=y+28;doc.x=left;
    };
    const items=Array.isArray(invoice.items)?invoice.items:[];
    if(items.length){
      tableHeader();
      for(const item of items){
        const name=compact(item?.name);doc.font('regular').fontSize(9);
        const rowHeight=Math.max(33,doc.heightOfString(name,{width:widths[0]-14,lineGap:2})+18);
        if(doc.y+rowHeight>bottom()){doc.addPage();tableHeader();}
        const y=doc.y;let total='Neúplná suma';
        try{const calculated=invoiceAmounts([item]);total=amount((calculated.net+calculated.vat)/100);}catch{}
        const numeric=(value,digits)=>value==null||value===''||!Number.isFinite(Number(value))?'—':new Intl.NumberFormat('sk-SK',{maximumFractionDigits:digits}).format(Number(value));
        const values=[name,numeric(item?.qty,3),amount(item?.price),numeric(item?.vat,2),total];let x=left;
        values.forEach((value,index)=>{doc.font('regular').fontSize(9).fillColor(ink).text(value,x+7,y+9,{width:widths[index]-14,align:index?'right':'left',lineGap:2});x+=widths[index];});
        doc.moveTo(left,y+rowHeight).lineTo(left+width,y+rowHeight).lineWidth(0.5).strokeColor('#dce5e5').stroke();
        doc.y=y+rowHeight;doc.x=left;
      }
    }else doc.font('regular').fontSize(10).fillColor(muted).text('V evidencii sú uložené súhrnné sumy bez rozpisu položiek.',left,doc.y,{width});
    if(doc.y+132>bottom())doc.addPage();else doc.y+=22;
    const totalsY=doc.y,totalsX=left+width-252;
    [['Základ dane',invoice.amount_without_vat],['DPH',invoice.vat_amount],['Celková suma',invoice.total_amount]].forEach(([label,value],index)=>{
      const y=totalsY+index*30;
      if(index===2)doc.rect(totalsX-10,y-4,262,31).fill('#e9f2f1');
      doc.font(index===2?'bold':'regular').fontSize(index===2?12:10).fillColor(ink).text(label,totalsX,y+4,{width:110});
      doc.text(amount(value),totalsX+108,y+4,{width:134,align:'right'});
    });
    doc.y=totalsY+108;doc.x=left;
    if(invoice.description){
      if(doc.y+52>bottom())doc.addPage();
      doc.font('bold').fontSize(10).fillColor(ink).text('Poznámka',left,doc.y,{width});
      doc.moveDown(0.45).font('regular').fontSize(10).text(plain(invoice.description).replace(/\n{3,}/g,'\n\n'),{width,lineGap:3});
    }
    const range=doc.bufferedPageRange();
    for(let index=0;index<range.count;index++){
      doc.switchToPage(index);const oldMargin=doc.page.margins.bottom;doc.page.margins.bottom=0;
      const y=doc.page.height-45;doc.moveTo(left,y-8).lineTo(left+width,y-8).lineWidth(0.5).strokeColor('#dce5e5').stroke();
      doc.font('regular').fontSize(8).fillColor(muted).text('Prehľad evidencie · originálny doklad uchovajte samostatne.',left,y,{width:width-70,lineBreak:false});
      doc.text((index+1)+' / '+range.count,left+width-65,y,{width:65,align:'right',lineBreak:false});doc.page.margins.bottom=oldMargin;
    }
    doc.end();
  });
}
