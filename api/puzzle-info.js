const { getPuzzleInfo } = require('./_lib/stardleCore');

module.exports = (req, res) => {
  // CORS & Cache headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status ? res.status(200).end() : res.end();
  }

  // Ensure HTTP 200 is set on standard Node http.ServerResponse as well as Express/Vercel res
  res.statusCode = 200;

  try {
    const info = getPuzzleInfo();
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(200).json(info);
    }
    return res.end(JSON.stringify(info));
  } catch (err) {
    console.error('[API /puzzle-info error]:', err);
    res.statusCode = 500;
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(500).json({ error: 'Failed to retrieve puzzle information' });
    }
    return res.end(JSON.stringify({ error: 'Failed to retrieve puzzle information' }));
  }
};

