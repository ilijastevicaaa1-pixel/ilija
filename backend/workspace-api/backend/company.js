import express from 'express';
import { createAuth } from './core.js';
import { asyncRoute, HttpError, number } from './lib/validation.js';
import { companyProfileInput } from './lib/company-profile.js';
import { profileIssues } from '../shared/billing.mjs';

const response = (company,user) => ({name:company.name,profile:company.profile,version:company.profile_version,updatedAt:company.profile_updated_at,canEdit:user.role==='admin',missing:profileIssues(company.profile)});
export function createCompanyRouter(db) {
  const router=express.Router();router.use(createAuth(db));
  router.get('/',asyncRoute(async(req,res)=>{
    const company=(await db.query('SELECT name,profile,profile_version,profile_updated_at FROM app_companies WHERE id=$1',[req.user.companyId])).rows[0];
    if(!company)throw new HttpError(404,'Firma neexistuje.');
    res.set('Cache-Control','no-store').json(response(company,req.user));
  }));
  router.put('/',asyncRoute(async(req,res)=>{
    if(req.user.role!=='admin')throw new HttpError(403,'Údaje firmy môže meniť iba správca firmy.');
    const profile=companyProfileInput(req.body.profile),version=number(req.body.version,'Verzia',{max:2147483646});
    if(!Number.isInteger(version))throw new HttpError(400,'Neplatná verzia údajov.');
    const result=await db.query('UPDATE app_companies SET name=$1,profile=$2,profile_version=profile_version+1,profile_updated_at=now() WHERE id=$3 AND profile_version=$4 RETURNING name,profile,profile_version,profile_updated_at',[profile.name,JSON.stringify(profile),req.user.companyId,version]);
    if(!result.rowCount)throw new HttpError(409,'Údaje firmy sa zmenili v inom okne. Obnovte stránku a skontrolujte zmeny.');
    res.json(response(result.rows[0],req.user));
  }));
  return router;
}
