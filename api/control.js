const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

const COLORS = {
  red:1, blue:1, green:1, yellow:1, purple:1,
  orange:1, pink:1, cyan:1, black:1, white:1
};

const json = (res, status, data) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(status).json(data);
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (req.query.action !== 'count') {
      return json(res, 400, { error:'Bad request' });
    }

    const ids = await redis.smembers('magic:viewers');
    let count = 0;
    const now = Date.now();

    // Проверяем heartbeat каждого телефона.
    for (const id of ids || []) {
      const viewer = await redis.get('magic:viewer:' + id);
      if (viewer && now - Number(viewer.lastSeen || 0) < 10000) {
        count++;
      } else {
        // Удаляем давно неактивные телефоны из списка.
        await redis.srem('magic:viewers', id);
      }
    }

    return json(res, 200, { count });
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error:'Method not allowed' });
  }

  const body = req.body || {};
  let state = await redis.get('magic:state') || {
    mode:'random',
    forcedColor:null,
    version:1
  };

  if (body.action === 'force') {
    if (!COLORS[body.color]) {
      return json(res, 400, { error:'Unknown color' });
    }

    state = {
      mode:'forced',
      forcedColor:body.color,
      version:Number(state.version || 0) + 1
    };

    await redis.set('magic:state', state);

    return json(res, 200, {
      ok:true,
      message:'Все телефоны → ' + body.color
    });
  }

  if (body.action === 'random') {
    state = {
      mode:'random',
      forcedColor:null,
      version:Number(state.version || 0) + 1
    };

    await redis.set('magic:state', state);

    return json(res, 200, {
      ok:true,
      message:'Всем выданы новые случайные цвета'
    });
  }

  return json(res, 400, { error:'Unknown action' });
}
