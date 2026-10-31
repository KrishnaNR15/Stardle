const { getPuzzleInfo } = require('./_lib/stardleCore');

module.exports = (req, res) => {
  // CORS & Cache headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    const info = getPuzzleInfo();
    return res.status(200).json(info);
  } catch (err) {
    console.error('[API /puzzle-info error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve puzzle information' });
  }
};

