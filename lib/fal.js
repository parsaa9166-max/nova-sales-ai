import { fal } from '@fal-ai/client';

export function getFal(){
  const key=process.env.FAL_KEY;
  if(!key) throw new Error('FAL_KEY_MISSING');
  fal.config({credentials:key});
  return fal;
}

export function cleanJson(value){
  if(value && typeof value==='object') return value;
  if(typeof value!=='string') throw new Error('AI_JSON_INVALID');
  const s=value.replace(/```json/gi,'').replace(/```/g,'').trim();
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1))}catch{}}
  throw new Error('AI_JSON_INVALID');
}

export async function uploadImage(file){
  return await getFal().storage.upload(file);
}
