/**
 * stardle.js
 * -----------------------------------------------------------------
 * Handles all Stardle-specific features:
 *   1. Animated starfield canvas background
 *   2. CSV word list loading (astrophysics_wordle_song_links-2.csv)
 *   3. IST-based word-of-the-day selection
 *   4. Hint panel (song links: Spotify, Apple Music, YouTube Music)
 *   5. Post-game popup (post-it note with Buzz wings & thrusters)
 *
 * IMPORTANT: This file does NOT touch any game logic in script.js.
 *            It only reads state, and hooks into game end events via
 *            MutationObserver watching the toast container + game state.
 * -----------------------------------------------------------------
 */

/* ==============================================================
   1. STARFIELD CANVAS
   ============================================================== */
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, stars = [], shootingStars = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randBetween(a, b) { return a + Math.random() * (b - a); }

  function createStars(count) {
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x:        Math.random() * W,
        y:        Math.random() * H,
        r:        randBetween(0.3, 1.8),
        alpha:    randBetween(0.2, 1.0),
        alphaDir: Math.random() < 0.5 ? 1 : -1,
        speed:    randBetween(0.003, 0.018),
      });
    }
  }

  function maybeAddShootingStar() {
    if (Math.random() < 0.004 && shootingStars.length < 3) {
      shootingStars.push({
        x:      randBetween(W * 0.1, W * 0.9),
        y:      randBetween(0, H * 0.4),
        len:    randBetween(60, 140),
        speed:  randBetween(6, 14),
        angle:  randBetween(Math.PI / 6, Math.PI / 3),
        alpha:  1,
        decay:  randBetween(0.012, 0.025),
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Twinkling stars
    for (const s of stars) {
      s.alpha += s.alphaDir * s.speed;
      if (s.alpha >= 1 || s.alpha <= 0.15) s.alphaDir *= -1;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 255, ${s.alpha})`;
      ctx.fill();
    }

    // Shooting stars
    maybeAddShootingStar();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ctx.save();
      ctx.globalAlpha = ss.alpha;
      const grd = ctx.createLinearGradient(
        ss.x, ss.y,
        ss.x - Math.cos(ss.angle) * ss.len,
        ss.y - Math.sin(ss.angle) * ss.len
      );
      grd.addColorStop(0, 'rgba(255, 255, 230, 0.95)');
      grd.addColorStop(1, 'rgba(255, 255, 230, 0)');
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - Math.cos(ss.angle) * ss.len, ss.y - Math.sin(ss.angle) * ss.len);
      ctx.stroke();
      ctx.restore();

      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.alpha -= ss.decay;
      if (ss.alpha <= 0) shootingStars.splice(i, 1);
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); createStars(260); });
  resize();
  createStars(260);
  draw();
})();


/* ==============================================================
   2. CSV PARSING — load astrophysics word list
   ============================================================== */

/**
 * Columns in the CSV (1-indexed for humans, 0-indexed internally):
 *   0: Word
 *   1: Song
 *   2: Artist
 *   3: Spotify Search URL
 *   4: Apple Music Search URL
 *   5: YouTube Music Search URL
 *   6: Meaning Article URL
 */

let stardleWordData = []; // array of parsed row objects

async function loadStardleCSV() {
  try {
    const resp = await fetch('astrophysics_wordle_song_links-4.csv');
    const text = await resp.text();
    stardleWordData = parseCSV(text);
    injectTodaysWord();
    addCSVWordsToDictionary();
  } catch (e) {
    console.warn('[Stardle] Could not load CSV:', e);
  }
}

function addCSVWordsToDictionary() {
  if (!stardleWordData.length) return;
  const interval = setInterval(() => {
    try {
      if (typeof possibleWords !== 'undefined' && possibleWords && typeof possibleWords.set === 'function') {
        stardleWordData.forEach(row => {
          if (row.word && row.word.length === 5) {
            possibleWords.set(row.word.toLowerCase(), row.word.toLowerCase());
          }
        });
        clearInterval(interval);
      }
    } catch(e) {
      clearInterval(interval);
    }
  }, 100);
}

/**
 * Minimal CSV parser that handles:
 *   - Quoted fields (including embedded commas)
 *   - Windows/Unix line endings
 *   - Skips the header row
 */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = splitCSVLine(line);
    if (fields.length < 7) continue;
    rows.push({
      word:       fields[0].trim().toLowerCase(),
      song:       fields[1].trim(),
      artist:     fields[2].trim(),
      spotify:    fields[3].trim(),
      apple:      fields[4].trim(),
      youtube:    fields[5].trim(),
      articleUrl: fields[6].trim(),
    });
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}


/* ==============================================================
   3. IST-BASED WORD-OF-THE-DAY & MIDNIGHT LOCKOUT
   ============================================================== */

const IST_OFFSET_MS = 330 * 60 * 1000; // +5:30 in ms

/**
 * Return current date string in IST, formatted as YYYY-MM-DD.
 */
function getISTDateString() {
  const istDate = new Date(Date.now() + IST_OFFSET_MS);
  return istDate.toISOString().slice(0, 10);
}

/* ==============================================================
   3a. PERSISTENT PLAYER STATISTICS
   ============================================================== */

const STARDLE_STATS_KEY = 'stardle:stats:v1';

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[Stardle] Could not read ${key}:`, e);
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[Stardle] Could not save ${key}:`, e);
    return false;
  }
}

function createDefaultStats() {
  return {
    version: 1,
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    lastPlayedPuzzle: null,
    lastWonPuzzle: null,
    lastResult: null,
  };
}

let statsSession = createDefaultStats();

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizeStats(value) {
  const defaults = createDefaultStats();
  if (!value || typeof value !== 'object') return defaults;

  const distribution = value.guessDistribution && typeof value.guessDistribution === 'object'
    ? value.guessDistribution
    : {};
  const lastResult = value.lastResult && typeof value.lastResult === 'object'
    && typeof value.lastResult.puzzle === 'string'
    && typeof value.lastResult.won === 'boolean'
    && Number.isInteger(value.lastResult.guesses)
    && value.lastResult.guesses >= 1
    && value.lastResult.guesses <= 6
    ? { ...value.lastResult }
    : null;

  const gamesPlayed = nonNegativeInteger(value.gamesPlayed);

  return {
    version: 1,
    gamesPlayed,
    gamesWon: Math.min(nonNegativeInteger(value.gamesWon), gamesPlayed),
    currentStreak: nonNegativeInteger(value.currentStreak),
    maxStreak: nonNegativeInteger(value.maxStreak),
    guessDistribution: {
      1: nonNegativeInteger(distribution[1]),
      2: nonNegativeInteger(distribution[2]),
      3: nonNegativeInteger(distribution[3]),
      4: nonNegativeInteger(distribution[4]),
      5: nonNegativeInteger(distribution[5]),
      6: nonNegativeInteger(distribution[6]),
    },
    lastPlayedPuzzle: typeof value.lastPlayedPuzzle === 'string' ? value.lastPlayedPuzzle : null,
    lastWonPuzzle: typeof value.lastWonPuzzle === 'string' ? value.lastWonPuzzle : null,
    lastResult,
  };
}

function loadStats() {
  try {
    const stored = safeStorageGet(STARDLE_STATS_KEY);
    statsSession = normalizeStats(stored ? JSON.parse(stored) : statsSession);
  } catch (e) {
    console.warn('[Stardle] Could not load saved statistics:', e);
  }
  return statsSession;
}

function saveStats(stats) {
  statsSession = normalizeStats(stats);
  try {
    safeStorageSet(STARDLE_STATS_KEY, JSON.stringify(statsSession));
  } catch (e) {
    console.warn('[Stardle] Could not save statistics:', e);
  }
  return statsSession;
}

function isPreviousPuzzle(previousPuzzle, currentPuzzle) {
  if (typeof previousPuzzle !== 'string' || typeof currentPuzzle !== 'string') return false;
  const previous = Date.parse(`${previousPuzzle}T00:00:00Z`);
  const current = Date.parse(`${currentPuzzle}T00:00:00Z`);
  return Number.isFinite(previous) && Number.isFinite(current)
    && current - previous === 24 * 60 * 60 * 1000;
}

function getDisplayStats(stats, today = getISTDateString()) {
  const displayStats = normalizeStats(stats);
  if (displayStats.lastWonPuzzle !== today && !isPreviousPuzzle(displayStats.lastWonPuzzle, today)) {
    displayStats.currentStreak = 0;
  }
  return displayStats;
}

function recordGameResult({ won, guesses }) {
  const puzzle = getISTDateString();
  const stats = loadStats();
  if (stats.lastPlayedPuzzle === puzzle) return renderStats(stats);

  stats.gamesPlayed += 1;
  if (won) {
    stats.gamesWon += 1;
    stats.guessDistribution[guesses] += 1;
    stats.currentStreak = isPreviousPuzzle(stats.lastWonPuzzle, puzzle)
      ? stats.currentStreak + 1
      : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastWonPuzzle = puzzle;
  } else {
    stats.currentStreak = 0;
  }

  stats.lastPlayedPuzzle = puzzle;
  stats.lastResult = { puzzle, won, guesses };
  saveStats(stats);
  return renderStats(stats);
}

function renderStats(savedStats = loadStats()) {
  const stats = getDisplayStats(savedStats);
  const winPercent = stats.gamesPlayed
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const values = {
    gamesPlayed: stats.gamesPlayed,
    winPercent,
    currentStreak: stats.currentStreak,
    maxStreak: stats.maxStreak,
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  });

  const noHistory = document.querySelector('no-history');
  const graph = document.querySelector('graph');
  const heading = document.querySelector('stats h3');
  const maxCount = Math.max(...Object.values(stats.guessDistribution), 0);
  const hasWins = stats.gamesWon > 0;

  if (noHistory) noHistory.style.display = hasWins ? 'none' : 'flex';
  if (graph) graph.style.display = hasWins ? 'grid' : 'none';
  if (heading) heading.style.display = hasWins ? 'block' : 'none';

  if (hasWins) {
    for (let guess = 1; guess <= 6; guess++) {
      const bar = document.getElementById(`bar-${guess}`);
      if (!bar) continue;
      const count = stats.guessDistribution[guess];
      const container = bar.closest('bar-container');
      const barText = bar.querySelector('bar-text');
      const isLatestWin = stats.lastResult?.won && stats.lastResult.guesses === guess;
      bar.style.width = `${Math.max(8, Math.round((count / maxCount) * 100))}%`;
      bar.style.height = '28px';
      if (barText) barText.textContent = String(count);
      container?.classList.toggle('latest-win', isLatestWin);
    }
  }
  return stats;
}

window.loadStardleStats = loadStats;
window.renderStardleStats = renderStats;
window.recordStardleGameResult = recordGameResult;

/**
 * Return ms remaining until the next 12:00 AM (midnight) IST.
 */
function getMsUntilNextISTMidnight() {
  const now = Date.now();
  const nowIST = new Date(now + IST_OFFSET_MS);

  // Next midnight UTC in the offset timeframe represents next midnight IST
  const nextIST = new Date(nowIST);
  nextIST.setUTCHours(24, 0, 0, 0);

  return Math.max(0, nextIST.getTime() - nowIST.getTime());
}

function formatCountdown(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}

function startMidnightCountdown() {
  function tick() {
    const el = document.getElementById('countdown-timer');
    if (el) {
      const ms = getMsUntilNextISTMidnight();
      el.textContent = formatCountdown(ms);
      if (ms <= 1000) {
        // Next midnight IST arrived! Reload for the new day
        // Clear stored date and reload for the new day
        try { localStorage.removeItem('stardleLastDate'); } catch(e) { console.warn('[Stardle] Could not remove stardleLastDate:', e); }
        setTimeout(() => location.reload(), 1500);
      }
    }
  }
  tick();
  setInterval(tick, 1000);
}

/**
 * Compute a deterministic day-index based on IST (UTC+5:30).
 * Index wraps around when it exceeds the word list length.
 */
function getISTDayIndex(listLength) {
  if (!listLength) return 0;
  const epoch = new Date('2024-01-01T00:00:00Z').getTime();
  const nowIST = Date.now() + IST_OFFSET_MS;
  const daysSinceEpoch = Math.floor((nowIST - epoch) / (24 * 60 * 60 * 1000));
  return ((daysSinceEpoch % listLength) + listLength) % listLength;
}

function getTodayWordData() {
  if (!stardleWordData.length) return null;
  const idx = getISTDayIndex(stardleWordData.length);
  return stardleWordData[idx];
}

/**
 * Override the game's chosen word with today's IST word from the CSV.
 * Enforces one game per day according to IST.
 */
function injectTodaysWord() {
  const entry = getTodayWordData();
  if (!entry) return;

  // Always update hint panel immediately so song links are ready
  updateHintPanel(entry);

  const word = entry.word;
  if (word.length !== 5) {
    console.warn(`[Stardle] Word "${word}" is not 5 letters — skipping injection.`);
    return;
  }

  const todayIST = getISTDateString();
  const lastPlayedDate = safeStorageGet('stardleLastDate');

  const saved = (() => {
    try {
      const savedState = safeStorageGet('gameState');
      return savedState ? JSON.parse(savedState) : null;
    } catch(e) {
      return null;
    }
  })();

  // If today is a new calendar day in IST:
  if (lastPlayedDate && lastPlayedDate !== todayIST) {
    safeStorageSet('stardleLastDate', todayIST);
    // Reset board for today's new word while keeping win stats & history
    if (typeof defaultGameState !== 'undefined' && typeof defaultUserState !== 'undefined') {
      const freshState = {
        ...defaultGameState,
        ...defaultUserState,
        stats: saved?.stats || defaultUserState.stats,
        winHistory: saved?.winHistory || defaultUserState.winHistory,
        gameHistory: saved?.gameHistory || defaultUserState.gameHistory,
        wordle: word,
      };
      if (typeof State !== 'undefined') {
        State = { ...State, ...freshState };
      }
      safeStorageSet('gameState', JSON.stringify(freshState));
      [...document.querySelectorAll('keyboard-row button')].forEach(k => k.removeAttribute('style'));
    }
    return;
  }

  // Record today's IST date if not recorded yet
  if (!lastPlayedDate) {
    safeStorageSet('stardleLastDate', todayIST);
  }

  // If already playing or completed today's word on this same day, keep it as-is
  if (saved && saved.wordle === word) {
    return;
  }

  // First time today: set wordle
  if (typeof State !== 'undefined') {
    State.wordle = word;
    if (typeof persist === 'function') {
      persist(null, State);
    } else {
      safeStorageSet('gameState', JSON.stringify(State));
    }
  }
}

/* Update hint panel with today's song info */
function updateHintPanel(entry) {
  if (!entry) entry = getTodayWordData();
  if (!entry) return;

  const songNameEl  = document.getElementById('hint-song-name');
  const artistEl    = document.getElementById('hint-song-artist');
  const spotifyEl   = document.getElementById('hint-spotify');
  const appleEl     = document.getElementById('hint-apple');
  const youtubeEl   = document.getElementById('hint-youtube');

  if (songNameEl)  songNameEl.textContent  = entry.song   || '—';
  if (artistEl)    artistEl.textContent    = entry.artist || '—';
  if (spotifyEl)   spotifyEl.href          = entry.spotify || '#';
  if (appleEl)     appleEl.href            = entry.apple || '#';
  if (youtubeEl)   youtubeEl.href          = entry.youtube || '#';
}


/* ==============================================================
   4. HINT PANEL TOGGLE
   ============================================================== */

let hintPanelOpen = false;

function toggleHintPanel(forceState) {
  const panel = document.getElementById('hint-panel');
  if (!panel) return;
  const entry = getTodayWordData();
  if (entry) updateHintPanel(entry);

  if (typeof forceState === 'boolean') {
    hintPanelOpen = forceState;
  } else {
    hintPanelOpen = !hintPanelOpen;
  }
  panel.classList.toggle('open', hintPanelOpen);
  panel.setAttribute('aria-hidden', String(!hintPanelOpen));
}

// Close hint panel when clicking outside, BUT do not close when typing on virtual keyboard!
document.addEventListener('click', function(e) {
  if (!hintPanelOpen) return;
  const wrapper = document.getElementById('hint-btn-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    // If the click was on the keyboard, keep the hint panel open for the player
    const isKeyboard = e.target.closest('keyboard-row') || e.target.closest('#keyboard');
    if (!isKeyboard) {
      toggleHintPanel(false);
    }
  }
});


/* ==============================================================
   4b. MOBILE DROPDOWN MENU
   ============================================================== */

let mobileMenuOpen = false;

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('mobile-dropdown-btn') || document.getElementById('hamburger-btn');
  if (!menu || !btn) return;

  mobileMenuOpen = !mobileMenuOpen;
  menu.classList.toggle('open', mobileMenuOpen);
  menu.setAttribute('aria-hidden', String(!mobileMenuOpen));
  btn.setAttribute('aria-expanded', String(mobileMenuOpen));
}

function closeMobileMenu() {
  if (!mobileMenuOpen) return;
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('mobile-dropdown-btn') || document.getElementById('hamburger-btn');
  mobileMenuOpen = false;
  if (menu) {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
  }
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
  }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
  if (!mobileMenuOpen) return;
  const btn = document.getElementById('mobile-dropdown-btn') || document.getElementById('hamburger-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    closeMobileMenu();
  }
});

// Close mobile menu on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && mobileMenuOpen) {
    closeMobileMenu();
    const btn = document.getElementById('mobile-dropdown-btn') || document.getElementById('hamburger-btn');
    if (btn) btn.focus();
  }
});


/* ==============================================================
   5. WORD POPUP — post-game reveal
   ============================================================== */

/**
 * Word explanations are sourced from the CSV article URLs.
 * We show a brief explanation for each word below.
 * You can extend this object whenever you add new words.
 */
const WORD_EXPLANATIONS = {
  apsis:   "An apsis is the point in an orbit where an orbiting body is either at its closest (periapsis) or farthest (apoapsis) distance from the central body it orbits.",
  epoch:   "In astronomy, an epoch is a specific moment in time used as a reference point for celestial coordinates. It defines the position of objects on the celestial sphere.",
  comet:   "A comet is an icy small Solar System body that warms and begins to release gases when passing close to the Sun — a process called outgassing — producing a visible coma and sometimes a tail.",
  lunar:   "Lunar refers to anything relating to the Moon. The word comes from 'Luna', the Latin name for Earth's natural satellite.",
  helio:   "Helio- is a prefix meaning 'Sun', from the Greek 'Helios'. It appears in words like heliocentrism (Sun-centred) and heliosphere (the region of space dominated by the Sun's magnetic field).",
  orbit:   "An orbit is the curved path of an object around a star, planet, or moon due to gravity. Most orbits are elliptical, a discovery attributed to Johannes Kepler.",
  solar:   "Solar refers to anything relating to the Sun. The Solar System consists of the Sun and all objects gravitationally bound to it, including the eight planets.",
  night:   "Night is the period between sunset and sunrise, when the Sun is below the horizon. Earth's rotation causes the cycle of day and night.",
  atoms:   "Atoms are the fundamental units of ordinary matter. Each atom has a nucleus of protons and neutrons, surrounded by electrons. Stars fuse atoms together to release enormous energy.",
  muons:   "Muons are elementary particles similar to electrons but ~207 times heavier. They rain down on Earth from cosmic ray interactions in the upper atmosphere.",
  gamma:   "Gamma rays are the most energetic form of electromagnetic radiation, produced by radioactive decay and extreme astrophysical events like gamma-ray bursts and supernovae.",
  hertz:   "Hertz (Hz) is the SI unit of frequency, equal to one cycle per second. Radio waves, light, and gravitational waves are all measured in hertz.",
  laser:   "LASER stands for Light Amplification by Stimulated Emission of Radiation. Lasers are used in astronomy for adaptive optics, LIDAR, and laser-ranging of the Moon.",
  light:   "Light is electromagnetic radiation that travels at ~299,792 km/s in a vacuum — the universal speed limit. A light-year is the distance light travels in one year (~9.46 trillion km).",
  venus:   "Venus is the second planet from the Sun and the hottest planet in the Solar System due to a runaway greenhouse effect. It rotates retrograde (backwards) compared to most planets.",
  earth:   "Earth is the third planet from the Sun and the only known planet to harbour life. It has a protective magnetic field, liquid water oceans, and a nitrogen-oxygen atmosphere.",
  quark:   "Quarks are fundamental particles that combine to form hadrons like protons and neutrons. They are never found alone — a property called confinement.",
  alien:   "Extraterrestrial life, or 'aliens', refers to life that may exist outside Earth. No confirmed evidence exists yet, but the universe's vast scale makes this one of astronomy's greatest open questions.",
  ceres:   "Ceres is the largest object in the asteroid belt and the closest dwarf planet to the Sun. It was the first asteroid discovered, in 1801, by Giuseppe Piazzi.",
  pluto:   "Pluto is a dwarf planet in the Kuiper Belt. Discovered in 1930 and reclassified in 2006, it has five moons. NASA's New Horizons probe revealed its stunning heart-shaped plain in 2015.",
  nadir:   "The nadir is the point on the celestial sphere directly below an observer — the opposite of the zenith. It also refers to the lowest point in a planet's orbit or an object's path.",
  probe:   "A space probe is an uncrewed spacecraft sent beyond Earth orbit to study celestial bodies. Notable probes include Voyager 1 & 2, which have left the Solar System.",
  optic:   "Optics is the branch of physics that studies light behaviour. Telescopes use optical principles — reflection, refraction, and diffraction — to gather and focus light from distant objects.",
  orion:   "Orion is one of the most recognisable constellations in the night sky, visible from both hemispheres. It contains stars like Betelgeuse and Rigel, and the famous Orion Nebula (M42).",
  titan:   "Titan is Saturn's largest moon and the second-largest in the Solar System. It has a thick nitrogen atmosphere, methane lakes, and is considered a prime candidate for extraterrestrial life.",
  libra:   "Libra is a zodiacal constellation representing a set of scales. It contains Gliese 581, a red dwarf with a planetary system that once sparked debate about habitable exoplanets.",
  aster:   "Aster- is a Greek prefix meaning 'star'. It forms the root of words like asteroid, astronomy, and astrophysics — literally 'star-writing' and 'star-physics'.",
  fermi:   "The Fermi Gamma-ray Space Telescope (FGST) studies gamma-ray astrophysics. The Fermi Paradox — 'where is everybody?' — ponders the absence of detected extraterrestrial civilizations.",
  farad:   "The farad (F) is the SI unit of electrical capacitance. Capacitors play roles in radio telescopes, electronics in spacecraft, and detector circuits used in astronomy.",
  pixel:   "A pixel is the smallest discrete element of a digital image. Astronomical CCD cameras and CMOS detectors are graded by pixel size — directly affecting resolution and field of view.",
  focus:   "In optics, the focus is the point where light rays converge after passing through a lens or reflecting off a mirror. Telescope design revolves around bringing starlight to a precise focus.",
  polar:   "A polar orbit passes over both poles of a planet. Many Earth-observation and weather satellites use polar orbits to achieve full global coverage.",
  rover:   "A planetary rover is a space vehicle designed to move across the surface of a planet or other celestial body. Mars rovers include Curiosity and Perseverance.",
  helix:   "The Helix Nebula (NGC 7293) is one of the closest planetary nebulae to Earth. Its ring-like structure gave it the nickname 'Eye of God'. Helical structures also appear in astrophysical jets.",
  dwarf:   "Dwarf planets are Solar System bodies that orbit the Sun, have a nearly round shape due to gravity, but have not cleared their orbital neighbourhood. Examples include Pluto and Ceres.",
  radio:   "Radio astronomy studies celestial objects by detecting radio waves they emit. Karl Jansky discovered cosmic radio waves in 1932, opening a new window on the universe.",
  stars:   "Stars are massive, luminous spheres of plasma held together by gravity. Nuclear fusion in their cores converts hydrogen to helium, releasing the energy that makes them shine.",
  space:   "Outer space, or simply space, is the expanse that exists beyond Earth's atmosphere. It is largely a vacuum, containing dust, gas, cosmic rays, and billions of galaxies.",
};

function getWordExplanation(word) {
  return WORD_EXPLANATIONS[word.toLowerCase()] || 
    `"${word.toUpperCase()}" is a term from astrophysics. Check the article below for a detailed explanation.`;
}

function showWordPopup() {
  const entry = getTodayWordData();
  if (!entry) return;

  // Ensure the game has been completed before revealing the word (won or all rows checked)
  if (!(State?.won || (State?.checked && State.checked[5] === true))) {
    if (typeof showToast === 'function') {
      showToast('Finish the game first!', 2, null, null, 'z-index:4');
    }
    return;
  }

  const word = entry.word;

  // Word title
  const titleEl = document.getElementById('popup-word-title');
  if (titleEl) titleEl.textContent = word.toUpperCase();

  // Astrophysics explanation
  const expEl = document.getElementById('popup-explanation');
  if (expEl) expEl.textContent = getWordExplanation(word);

  // Article link
  const articleLink = document.getElementById('popup-article-link');
  if (articleLink) {
    if (entry.articleUrl && entry.articleUrl !== '#') {
      articleLink.href = entry.articleUrl;
      articleLink.style.display = 'inline-flex';
    } else {
      articleLink.style.display = 'none';
    }
  }

  // Song Clue details inside the modal
  const songTitleEl = document.getElementById('popup-song-title');
  if (songTitleEl) {
    songTitleEl.textContent = `${entry.song || '—'} by ${entry.artist || '—'}`;
  }
  const popSpotify = document.getElementById('popup-spotify');
  const popApple = document.getElementById('popup-apple');
  const popYoutube = document.getElementById('popup-youtube');
  if (popSpotify) popSpotify.href = entry.spotify || '#';
  if (popApple) popApple.href = entry.apple || '#';
  if (popYoutube) popYoutube.href = entry.youtube || '#';

  // Ensure header hint panel is also up to date
  updateHintPanel(entry);

  // Prevent double modal clash: if stats-container is open, hide it
  const statsContainer = document.getElementById('stats-container');
  if (statsContainer && statsContainer.getAttribute('aria-hidden') === 'false') {
    statsContainer.style.display = 'none';
    statsContainer.setAttribute('aria-hidden', 'true');
  }

  const overlay = document.getElementById('word-popup-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }

  // Trigger pop animation
  const popup = document.getElementById('word-popup');
  if (popup) {
    popup.style.animation = 'none';
    popup.offsetHeight; // reflow
    popup.style.animation = '';
  }
}
function closeWordPopup() {
  const overlay = document.getElementById('word-popup-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
  const h1 = document.querySelector('h1');
  const game = document.getElementById('game');
  if (h1) h1.classList.remove('blur');
  if (game) {
    game.classList.remove('blur');
    game.setAttribute('aria-hidden', 'false');
  }
}

function openStatsFromPopup() {
  closeWordPopup();
  if (typeof showStatsModal === 'function') {
    showStatsModal();
  }
}

// Close popup when clicking overlay backdrop
document.getElementById('word-popup-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeWordPopup();
});


/* ==============================================================
   6. DETECT GAME END — hook into script.js without touching it
   ============================================================== */

/**
 * We watch the toast-container for messages. When the game ends
 * (won or lost), script.js calls showToast() which appends a <toast>.
 * We also watch State.won and State.checked to detect the game-over.
 */

let gameEndHandled = false;

function checkGameEnd() {
  if (gameEndHandled) return;
  if (typeof State === 'undefined') return;

  const isWon  = State.won === true;
  const isLost = !State.won && State.checked && State.checked[5] === true;

  if (isWon || isLost) {
    gameEndHandled = true;
    // Show discovery modal shortly after toast finishes
    setTimeout(showWordPopup, 2700);
  }
}

// Disable newGame — Stardle is strictly one puzzle per day according to IST
function disableNewGame() {
  window.newGame = function() {
    if (typeof showToast === 'function') {
      showToast('Next Stardle unlocks at midnight IST!', 2.5);
    }
  };
}

// Guard keyboard when user has completed today's game
function setupDailyLockoutGuards() {
  function warnIfDone() {
    if (typeof State !== 'undefined' && (State.won || (State.checked && State.checked[5] === true))) {
      if (typeof showToast === 'function' && !document.querySelector('toast-container toast')) {
        showToast('Next Stardle unlocks at midnight IST!', 2);
      }
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Backspace' || (e.key && e.key.match(/^[a-zA-Z]$/))) {
      warnIfDone();
    }
  });

  document.querySelectorAll('keyboard-row button').forEach(btn => {
    btn.addEventListener('click', warnIfDone);
  });
}

// MutationObserver watching toast container
const toastObserver = new MutationObserver(() => {
  // Give script.js time to update State
  setTimeout(checkGameEnd, 300);
});

function startObserving() {
  const tc = document.querySelector('toast-container');
  if (tc) {
    toastObserver.observe(tc, { childList: true });
  }
}

// Also watch State directly with a debounced interval after any keydown
let gameCheckInterval = null;
document.addEventListener('keydown', () => {
  if (gameEndHandled) return;
  clearTimeout(gameCheckInterval);
  gameCheckInterval = setTimeout(checkGameEnd, 400);
});


/* ==============================================================
   7. BRIGHT TILES ENFORCEMENT — Guarantee maximum brightness & white text
   ============================================================== */
function enforceBrightTiles() {
  document.querySelectorAll('box').forEach(tile => {
    tile.style.color = '#ffffff';
    tile.style.fontWeight = '800';
    if (tile.classList.contains('rightSpot')) {
      tile.style.backgroundColor = '#22c55e';
      tile.style.borderColor = '#22c55e';
    } else if (tile.classList.contains('wrongSpot')) {
      tile.style.backgroundColor = '#eab308';
      tile.style.borderColor = '#eab308';
    } else if (tile.classList.contains('wrongLetter')) {
      tile.style.backgroundColor = '#334155';
      tile.style.borderColor = '#334155';
    }
  });

  const game = document.getElementById('game');
  if (game && game.classList.contains('blur')) {
    game.classList.remove('blur');
  }
}

// Watch board mutations to instantly enforce bright colors when rows flip
const boardObserver = new MutationObserver(enforceBrightTiles);
function startBoardObserver() {
  const gb = document.getElementById('game-board');
  if (gb) {
    boardObserver.observe(gb, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
  }
}

/* ==============================================================
   8. INIT — run everything
   ============================================================== */

(function stardleInit() {
  // Wait for DOM + script.js to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    loadStardleCSV();
    startObserving();
    startBoardObserver();
    disableNewGame();
    setupDailyLockoutGuards();
    startMidnightCountdown();
    enforceBrightTiles();
    setInterval(enforceBrightTiles, 500);

    // If game was already over on page load (persisted state), show popup after a delay
    setTimeout(() => {
      enforceBrightTiles();
      if (typeof State !== 'undefined') {
        if (State.won || (State.checked && State.checked[5] === true)) {
          gameEndHandled = true;
          // Load CSV first, then show popup once data is available
          const waitForData = setInterval(() => {
            if (stardleWordData.length > 0) {
              clearInterval(waitForData);
              showWordPopup();
            }
          }, 200);
        }
      }
    }, 1000);
  }
})();

/* ==============================================================
   HOW TO PLAY MODAL
   ============================================================== */
function showHowToPlay() {
  const overlay = document.getElementById('how-to-play-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.add('open');
  }
}

function closeHowToPlay(e) {
  // Close only if clicking the overlay backdrop or the close button
  if (e && e.target !== document.getElementById('how-to-play-overlay') && e.target.id !== 'htp-close') return;
  const overlay = document.getElementById('how-to-play-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.remove('open');
  }
}

// Show on first ever visit
(function() {
  if (!safeStorageGet('stardle_htp_seen')) {
    setTimeout(showHowToPlay, 600);
    safeStorageSet('stardle_htp_seen', '1');
  }
})();
