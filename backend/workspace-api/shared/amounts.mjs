// Monetary values are rounded in decimal arithmetic, half away from zero.
const rounded=(numerator,denominator)=>{
  const sign=numerator<0n?-1n:1n,absolute=numerator*sign;
  return sign*((absolute+denominator/2n)/denominator);
};
const safe=value=>{const result=Number(value);if(!Number.isSafeInteger(result))throw new RangeError('Amount exceeds safe range.');return result;};
export function decimalUnits(value,scale=2){
  if(!['string','number'].includes(typeof value)||!Number.isInteger(scale)||scale<0||scale>6)throw new TypeError('Invalid decimal.');
  const raw=String(value).trim().replace(',','.');
  if(raw.length>100)throw new RangeError('Decimal is too long.');
  const match=raw.match(/^([+-]?)(\d*\.?\d+)(?:e([+-]?\d+))?$/i);
  if(!match)throw new TypeError('Invalid decimal.');
  const exponent=Number(match[3]||0),fraction=(match[2].split('.')[1]||'').length,shift=scale+exponent-fraction;
  if(!Number.isInteger(exponent)||Math.abs(shift)>100)throw new RangeError('Invalid exponent.');
  const coefficient=BigInt(match[2].replace('.',''))*(match[1]==='-'?-1n:1n);
  return safe(shift>=0?coefficient*10n**BigInt(shift):rounded(coefficient,10n**BigInt(-shift)));
}
export const roundMoney=value=>decimalUnits(value,2)/100;
export function invoiceAmounts(items){
  let net=0n,vat=0n;
  for(const item of items){
    const line=rounded(BigInt(decimalUnits(item.qty,3))*BigInt(decimalUnits(item.price,2)),1000n);
    net+=line;vat+=rounded(line*BigInt(decimalUnits(item.vat,2)),10000n);
  }
  return{net:safe(net),vat:safe(vat)};
}
