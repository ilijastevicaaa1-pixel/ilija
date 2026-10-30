import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { invoiceAmounts } from '../../shared/amounts.mjs';
import { invoiceBillingIssues, invoiceTaxGroups } from '../../shared/billing.mjs';
import { HttpError } from './validation.js';

const fonts=fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url));
const clean=value=>String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const compact=value=>clean(value).replace(/\s+/g,' ').trim();
const date=value=>{const [year,month,day]=String(value).slice(0,10).split('-');return `${day}. ${month}. ${year}`;};
const money=value=>new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'}).format(Number(value));
const number=(value,digits=2)=>new Intl.NumberFormat('sk-SK',{maximumFractionDigits:digits}).format(Number(value));

export async function issuedInvoicePdf(invoice) {
  const issues=invoiceBillingIssues(invoice);
  if(issues.length)throw new HttpError(400,'Faktúra nemá úplné údaje pre PDF: '+issues.join('; ')+'.');
  return new Promise((resolve,reject)=>{
    const bill=invoice.billing_details,issuer=bill.issuer,payer=issuer.vat_payer;
    const doc=new PDFDocument({size:'A4',margins:{top:68,right:42,bottom:64,left:42},bufferPages:true,info:{Title:'Faktúra '+compact(invoice.invoice_number),Author:compact(issuer.name)}});
    const chunks=[];doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    doc.registerFont('regular',fonts+'LiberationSans-Regular.ttf');doc.registerFont('bold',fonts+'LiberationSans-Bold.ttf');
    const left=42,width=doc.page.width-84,ink='#18363a',muted='#576d70',accent='#08766d',bottom=()=>doc.page.height-64;
    const heading=()=>{doc.save().rect(left,28,width,3).fill(accent).restore();doc.font('regular').fontSize(9).fillColor(muted).text('FAKTÚRA  ·  '+compact(invoice.invoice_number),left,41,{width,lineBreak:false});doc.x=left;doc.y=70;};
    heading();doc.on('pageAdded',heading);
    const ensure=height=>{if(doc.y+height>bottom())doc.addPage();};
    doc.font('bold').fontSize(27).fillColor(ink).text('Faktúra',left,74,{width});
    doc.moveDown(0.3).fontSize(15).text(compact(invoice.invoice_number),{width});doc.y+=20;
    const sender=[issuer.name,issuer.street,issuer.postal_code+' '+issuer.city+', Slovensko','IČO: '+issuer.ico,'DIČ: '+issuer.dic,...(issuer.vat_id?['IČ DPH: '+issuer.vat_id]:[]),issuer.register_info,...(issuer.email?[issuer.email]:[]),...(issuer.phone?[issuer.phone]:[])];
    const buyer=[invoice.party ?? invoice.customer,bill.customer_address,'Slovensko',...(bill.customer_ico?['IČO: '+bill.customer_ico]:[]),...(bill.customer_dic?['DIČ: '+bill.customer_dic]:[]),...(bill.customer_vat_id?['IČ DPH: '+bill.customer_vat_id]:[])];
    const blockHeight=(lines,w)=>{doc.font('regular').fontSize(9);return 24+lines.reduce((sum,line,index)=>sum+doc.font(index?'regular':'bold').fontSize(index?9:11).heightOfString(clean(line),{width:w,lineGap:2})+4,0);};
    const block=(label,lines,x,y,w)=>{
      doc.font('bold').fontSize(9).fillColor(accent).text(label,x,y,{width:w});let current=y+21;
      lines.forEach((line,index)=>{doc.font(index?'regular':'bold').fontSize(index?9:11).fillColor(index?muted:ink).text(clean(line),x,current,{width:w,lineGap:2});current=doc.y+4;});
      return current;
    };
    const half=(width-28)/2,height=Math.max(blockHeight(sender,half),blockHeight(buyer,half));
    if(height<=300){ensure(height);const y=doc.y;doc.y=Math.max(block('DODÁVATEĽ',sender,left,y,half),block('ODBERATEĽ',buyer,left+half+28,y,half))+16;}
    else{for(const [title,lines] of [['DODÁVATEĽ',sender],['ODBERATEĽ',buyer]]){ensure(blockHeight(lines,width));doc.y=block(title,lines,left,doc.y,width)+16;}}
    doc.x=left;ensure(120);
    const datesY=doc.y;
    [['Dátum vystavenia',invoice.issue_date],['Dátum dodania',bill.delivery_date],['Dátum splatnosti',invoice.due_date]].forEach(([label,value],index)=>{const x=left+index*width/3;doc.font('regular').fontSize(9).fillColor(muted).text(label,x,datesY,{width:width/3-10});doc.font('bold').fontSize(11).fillColor(ink).text(date(value),x,datesY+18,{width:width/3-10});});
    doc.y=datesY+49;doc.x=left;
    doc.font('regular').fontSize(9).fillColor(muted).text('Spôsob úhrady: bankový prevod',left,doc.y,{width});
    doc.moveDown(0.4).font('bold').fontSize(10).fillColor(ink).text('IBAN: '+issuer.iban.replace(/(.{4})/g,'$1 ').trim(),{width});
    if(issuer.bic)doc.moveDown(0.3).font('regular').fontSize(9).text('BIC: '+issuer.bic,{width});
    if(bill.variable_symbol)doc.moveDown(0.3).text('Variabilný symbol: '+bill.variable_symbol,{width});
    doc.moveDown(0.5).font('regular').fontSize(9).text('Správa pre príjemcu: '+compact(invoice.invoice_number),{width});doc.y+=18;
    const widths=payer?[210,70,90,55,width-425]:[230,70,100,width-400];
    const labels=payer?['Položka','Množstvo','Cena bez DPH','DPH %','Spolu s DPH']:['Položka','Množstvo','Jednotková cena','Spolu'];
    const tableHeader=()=>{ensure(72);const y=doc.y;doc.rect(left,y,width,35).fill('#e9f2f1');let x=left;labels.forEach((label,index)=>{doc.font('bold').fontSize(8).fillColor(ink).text(label,x+6,y+8,{width:widths[index]-12,align:index?'right':'left'});x+=widths[index];});doc.y=y+35;doc.x=left;};
    tableHeader();
    for(const item of invoice.items){
      const amounts=invoiceAmounts([item]),quantity=number(item.qty,3)+(item.unit?' '+clean(item.unit):'');
      const values=payer?[clean(item.name),quantity,money(item.price),number(item.vat),money((amounts.net+amounts.vat)/100)]:[clean(item.name),quantity,money(item.price),money(amounts.net/100)];
      doc.font('regular').fontSize(9);
      const height=Math.max(34,...values.map((value,index)=>doc.heightOfString(value,{width:widths[index]-12,lineGap:2})+18));
      if(doc.y+height>bottom()){doc.addPage();tableHeader();}
      const y=doc.y;let x=left;
      values.forEach((value,index)=>{doc.font('regular').fontSize(9).fillColor(ink).text(value,x+6,y+9,{width:widths[index]-12,align:index?'right':'left',lineGap:2});x+=widths[index];});
      doc.moveTo(left,y+height).lineTo(left+width,y+height).lineWidth(0.5).strokeColor('#dce5e5').stroke();doc.y=y+height;doc.x=left;
    }
    if(payer){
      const groups=invoiceTaxGroups(invoice.items);ensure(100);doc.y+=20;
      const taxHeader=()=>{doc.font('bold').fontSize(11).fillColor(ink).text('Rekapitulácia DPH',left,doc.y,{width});doc.y+=10;const y=doc.y;['Sadzba DPH','Základ dane','DPH v EUR'].forEach((label,index)=>doc.font('bold').fontSize(9).text(label,left+index*width/3,y,{width:width/3-10,align:index?'right':'left'}));doc.y=y+24;};
      taxHeader();
      for(const group of groups){if(doc.y+26>bottom()){doc.addPage();taxHeader();}const y=doc.y;[number(group.rate)+' %',money(group.net/100),money(group.vat/100)].forEach((value,index)=>doc.font('regular').fontSize(10).text(value,left+index*width/3,y,{width:width/3-10,align:index?'right':'left'}));doc.y=y+26;}
    }else{ensure(48);doc.y+=18;doc.font('regular').fontSize(10).fillColor(ink).text('Dodávateľ nie je platiteľom DPH.',left,doc.y,{width});}
    ensure(120);doc.y+=12;const totalY=doc.y;
    doc.rect(left,totalY,width,48).fill('#e9f2f1');doc.font('bold').fontSize(13).fillColor(ink).text(invoice.status==='paid'?'Celková suma':'Celkom na úhradu',left+12,totalY+16,{width:width/2});doc.fontSize(18).text(money(invoice.total_amount),left+width/2,totalY+13,{width:width/2-12,align:'right'});doc.y=totalY+60;doc.x=left;
    if(invoice.status==='paid')doc.font('bold').fontSize(10).text('Uhradené'+(invoice.payment_date?' dňa '+date(invoice.payment_date):''),{width});
    if(invoice.description){ensure(50);doc.font('bold').fontSize(10).text('Poznámka',left,doc.y,{width});doc.moveDown(0.4).font('regular').fontSize(10).text(clean(invoice.description),{width,lineGap:3});}
    const range=doc.bufferedPageRange();
    for(let index=0;index<range.count;index++){doc.switchToPage(index);const margin=doc.page.margins.bottom;doc.page.margins.bottom=0;const y=doc.page.height-43;doc.moveTo(left,y-9).lineTo(left+width,y-9).lineWidth(0.5).strokeColor('#dce5e5').stroke();doc.font('regular').fontSize(8).fillColor(muted).text('Faktúra '+compact(invoice.invoice_number),left,y,{width:width-75,lineBreak:false});doc.text((index+1)+' / '+range.count,left+width-65,y,{width:65,align:'right',lineBreak:false});doc.page.margins.bottom=margin;}
    doc.end();
  });
}
