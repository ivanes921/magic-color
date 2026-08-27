const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

const COLORS = {
  red:'#ff3030', blue:'#2878ff', green:'#25c96f', yellow:'#ffd52e',
  purple:'#9b5cff', orange:'#ff8a24', pink:'#ff4fa3', cyan:'#16d9d2',
  black:'#000000', white:'#ffffff'
};
const NAMES = Object.keys(COLORS);
const randomColor = () => NAMES[Math.floor(Math.random() * NAMES.length)];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const id = String(req.query.id || '').trim();
  if (!id || id.length > 100) {
    return res.status(400).json({ error:'Missing id' });
  }

  let state = await redis.get('magic:state');
  if (!state) {
    state = { mode:'random', forcedColor:null, version:1 };
    await redis.set('magic:state', state);
  }

  let viewer = await redis.get('magic:viewer:' + id);
  const stateVersion = Number(state.version || 1);

  if (!viewer || Number(viewer.version) !== stateVersion) {
    viewer = {
      color: randomColor(),
      version: stateVersion,
      lastSeen: Date.now()
    };
  } else {
    viewer.lastSeen = Date.now();
  }

  // Регистрируем телефон как активный.
  await redis.set('magic:viewer:' + id, viewer, { ex: 30 });
  await redis.sadd('magic:viewers', id);

  // Фокусник дал общий цвет — он имеет приоритет.
  if (state.mode === 'forced' && COLORS[state.forcedColor]) {
    return res.status(200).json({
      mode:'forced',
      color:COLORS[state.forcedColor],
      version:stateVersion
    });
  }

  return res.status(200).json({
    mode:'random',
    color:COLORS[viewer.color] || COLORS.blue,
    version:stateVersion
  });
}
