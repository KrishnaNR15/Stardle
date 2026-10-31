# Stardle

**Stardle** is a daily astronomy word game by [Dhruva Astronomy Club](https://teamdhruva.com). Guess the five-letter astrophysics term in six tries—same rules as Wordle, with a cosmic twist.

## How to play

1. Enter a valid **5-letter** word as your guess.
2. Tile colors show how close you are:
   - **Green** — letter is in the word and in the correct spot.
   - **Yellow** — letter is in the word but in the wrong spot.
   - **Gray** — letter is not in the word.
3. You have **6 guesses** to find the answer.
4. Tap **Hint** for a song clue (Spotify, Apple Music, YouTube Music links) that nudges you toward the word.
5. A **new puzzle** unlocks every day at **midnight IST**. You cannot start another game until then.

Repeated letters follow standard Wordle rules: a letter only highlights as many times as it appears in the answer.

## Features

- Daily word rotation from a curated astrophysics word list
- Musical hint panel with streaming search links
- Animated starfield background
- Stats, share grid, and win distribution (from the base Wordle engine)
- First-visit “How to play” modal
- Post-game popup with word meaning links (from CSV)
- Local persistence of progress and stats

## Tech stack

Client-side UI with secure serverless backend:

| File / Folder | Role |
|---|---|
| `index.html` | Page structure, modals, hint UI |
| `script.js` | Core Wordle gameplay with server-side validation |
| `stardle.js` | Starfield, daily hint loader, Stardle-only hooks & popup |
| `stardle.css` | Astronomy theme and layout |
| `styles.css` | Base Wordle styles |
| `possibleWords.js` | Fast client-side 5-letter dictionary validation |
| `api/puzzle-info.js` | Public endpoint for puzzle number, date, and musical hint (never returns word) |
| `api/check-guess.js` | Secure endpoint that evaluates tile colors (reveals word only upon game completion) |
| `api/_data/words.json` | Protected server-side astrophysics word database |
| `server.js` | Standalone zero-dependency local Node.js development server |
| `vercel.json` | Vercel deployment and security routing rules |

## Run locally

Run the local server with Node.js (no external packages required):

```bash
npm start
# or: node server.js
```

Then visit [http://localhost:8000](http://localhost:8000).

## Deploy

### Vercel (Recommended)
Push to GitHub and import the repository into Vercel. Vercel automatically deploys the frontend as static files and the `/api` directory as Serverless Functions with zero configuration. All data files in `api/_data/` are automatically protected.

## Credits

- Gameplay foundation: [Wordle-Vanilla](https://github.com/doeixd/Wordle-Vanilla) by doeixd (educational Wordle clone).
- Concept, word list, and hints: Dhruva Astronomy Club.
- Wordle is owned by its respective rights holders; Stardle is a themed variant for learning and fun, not an official Wordle product.


