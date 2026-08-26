const { Redis } = require('@upstash/redis');
const crypto = require('crypto');
const redis=Redis.fromEnv();
const COLORS={red:1,blue:1,green:1,yellow:1,purple:1,orange:1,pink:1,cyan:1,black:1,white:1};
const json=(res,s,d)=>{res.setHeader('Cache-Control','no-store');return res.status(s).json(d)};
const tokenOf=req=>{const h=req.headers.authorization||'';return h.startsWith('Bearer ')?h.slice(7):''};
export default async function handler(req,res){
 if(req.method==='GET'){if(req.query.action!=='count')return json(res,400,{error:'Bad request'});const t=tokenOf(req),ok=t?await redis.get('magic:admin:'+t):null;if(!ok)return json(res,401,{error:'Unauthorized'});const keys=await redis.keys('magic:viewer:*');let count=0;const now=Date.now();for(const k of keys){const v=await redis.get(k);if(v&&now-Number(v.lastSeen||0)<15000)count++}return json(res,200,{count})}
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});const b=req.body||{};
 if(b.action==='login'){if(!process.env.ADMIN_PASSWORD)return json(res,500,{error:'ADMIN_PASSWORD не задан'});if(b.password!==process.env.ADMIN_PASSWORD)return json(res,401,{error:'Неверный пароль'});const t=crypto.randomBytes(24).toString('hex');await redis.set('magic:admin:'+t,{createdAt:Date.now()},{ex:86400});return json(res,200,{token:t})}
 const t=tokenOf(req),ok=t?await redis.get('magic:admin:'+t):null;if(!ok)return json(res,401,{error:'Unauthorized'});let state=await redis.get('magic:state')||{mode:'random',forcedColor:null,version:1};
 if(b.action==='force'){if(!COLORS[b.color])return json(res,400,{error:'Unknown color'});state={mode:'forced',forcedColor:b.color,version:Number(state.version||0)+1};await redis.set('magic:state',state);return json(res,200,{ok:true,message:'Все телефоны → '+b.color})}
 if(b.action==='random'){state={mode:'random',forcedColor:null,version:Number(state.version||0)+1};await redis.set('magic:state',state);return json(res,200,{ok:true,message:'Всем выданы новые случайные цвета'})}
 return json(res,400,{error:'Unknown action'})}
