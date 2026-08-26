const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();
const COLORS={red:'#ff3030',blue:'#2878ff',green:'#25c96f',yellow:'#ffd52e',purple:'#9b5cff',orange:'#ff8a24',pink:'#ff4fa3',cyan:'#16d9d2',black:'#000',white:'#fff'};
const NAMES=Object.keys(COLORS);
const randomColor=()=>NAMES[Math.floor(Math.random()*NAMES.length)];
export default async function handler(req,res){res.setHeader('Cache-Control','no-store,no-cache,must-revalidate');const id=String(req.query.id||'').trim();if(!id||id.length>100)return res.status(400).json({error:'Missing id'});let state=await redis.get('magic:state');if(!state){state={mode:'random',forcedColor:null,version:1};await redis.set('magic:state',state)}let viewer=await redis.get('magic:viewer:'+id);if(!viewer||viewer.version!==state.version){viewer={color:randomColor(),version:state.version,lastSeen:Date.now()}}else viewer.lastSeen=Date.now();await redis.set('magic:viewer:'+id,viewer,{ex:86400});if(state.mode==='forced'&&COLORS[state.forcedColor])return res.json({mode:'forced',color:COLORS[state.forcedColor],version:state.version});return res.json({mode:'random',color:COLORS[viewer.color]||COLORS.blue,version:state.version})}
