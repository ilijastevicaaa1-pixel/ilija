import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError, id } from './validation.js';

const script = `$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$packet=ConvertFrom-Json ([Console]::In.ReadToEnd())
$entropy=[Text.Encoding]::UTF8.GetBytes($packet.context)
if($packet.operation -eq 'protect') {
  $bytes=[Text.Encoding]::UTF8.GetBytes($packet.data)
  $result=[Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Convert]::ToBase64String($result))
} else {
  $bytes=[Convert]::FromBase64String($packet.data)
  $result=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Text.Encoding]::UTF8.GetString($result))
}`;

export function windowsProtect(operation, data, context) {
  if (process.platform !== 'win32') throw new HttpError(503, 'Lokálne uloženie kľúča vyžaduje Windows. Na serveri použite správcu tajných údajov.');
  return new Promise((resolve, reject) => {
    const child=spawn(path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),
      ['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')], {windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',settled=false;
    const timer=setTimeout(()=>{child.kill();finish(new HttpError(503,'Uloženie kľúča trvá príliš dlho. Skúste to znova.'));},15000);
    function finish(error){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(output.trim());}
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>20000){child.kill();finish(new HttpError(503,'Kľúč sa nepodarilo spracovať.'));}});
    child.stderr.resume(); // Never log a secret or the packet passed to the credential helper.
    child.on('error',()=>finish(new HttpError(503,'Bezpečné uloženie kľúča nie je dostupné.')));
    child.on('close',code=>finish(code===0?null:new HttpError(503,'Kľúč sa nepodarilo spracovať pre tento účet Windows.')));
    child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({operation,data,context}));
  });
}

export function createCredentialStore({namespace='openai',keyPattern=/^sk-[A-Za-z0-9_-]{20,500}$/,directory=fileURLToPath(new URL('../.private/'+namespace+'/',import.meta.url)),protect=windowsProtect}={}) {
  if(!['openai','groq'].includes(namespace))throw new Error('Unknown credential namespace.');
  const cache=new Map();
  const identity=user=>`${id(user.companyId)}-${id(user.id)}`;
  const filename=key=>path.join(directory,key+'.json');
  return {
    async get(user){
      const key=identity(user);if(cache.has(key))return cache.get(key);
      let file;
      try{file=await readFile(filename(key),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw new HttpError(503,'Nastavenie AI sa nepodarilo načítať.');}
      try{
        if(file.length>20000)throw new Error('size');
        const record=JSON.parse(file);if(record.version!==1||typeof record.encrypted!=='string')throw new Error('format');
        const secret=await protect('unprotect',record.encrypted,'aap-'+namespace+'-v1:'+key);
        if(!keyPattern.test(secret))throw new Error('format');
        cache.set(key,secret);return secret;
      }catch{throw new HttpError(503,'Uložený kľúč sa nepodarilo odomknúť. Zadajte ho znova v nastaveniach.');}
    },
    async set(user,secret){
      const key=identity(user),encrypted=await protect('protect',secret,'aap-'+namespace+'-v1:'+key);
      await mkdir(directory,{recursive:true,mode:0o700});
      const temporary=filename(key)+'.'+randomUUID()+'.tmp';
      try{await writeFile(temporary,JSON.stringify({version:1,encrypted}),{mode:0o600,flag:'wx'});await rename(temporary,filename(key));}
      finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
      cache.set(key,secret);
    },
    async remove(user){const key=identity(user);await unlink(filename(key)).catch(error=>{if(error.code!=='ENOENT')throw error;});cache.delete(key);},
  };
}
