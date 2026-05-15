# Daily Options Plays — Local Setup

Real pre-market and live data via Yahoo Finance + AI-generated option plays via Claude.

## What you need

1. **Node.js 18+** — [nodejs.org](https://nodejs.org) (LTS version)
2. **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com) (~$5 credit is plenty for daily use)

## Setup (5 minutes)

### 1. Create the Vite app

Open Terminal and run:

```bash
npm create vite@latest options-app -- --template react
cd options-app
npm install
```

### 2. Set up the backend

```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv node-fetch
```

Then add `"type": "module"` to `server/package.json`.

### 3. Copy the files

- Copy `server.js` into `options-app/server/`
- Copy `App.jsx` into `options-app/src/` (replace the existing one)

### 4. Add your API key

Inside `options-app/server/`, create a file called `.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
PORT=3001
```

⚠️ Never commit `.env` to git. Add `.env` to your `.gitignore`.

### 5. Run it (two terminal windows)

**Terminal 1 — backend:**
```bash
cd options-app/server
node server.js
```
You should see: `✅ Server running on http://localhost:3001`

**Terminal 2 — frontend:**
```bash
cd options-app
npm run dev
```
Open the URL it prints (usually `http://localhost:5173`).

## How it works

- **Backend** (`server.js`):
  - `GET /api/market-data` → Fetches Yahoo Finance quotes for all 11 tickers (pre-market price, prev close, % change, volume)
  - `POST /api/generate-plays` → Sends real prices to Claude, gets back option plays grounded in actual market data
- **Frontend** (`App.jsx`):
  - On load, calls both endpoints in sequence
  - Renders the dashboard with live data + AI plays
  - Hit ↻ Refresh anytime

## Troubleshooting

- **"Backend not responding"** → Make sure `node server.js` is running in Terminal 1
- **"Anthropic API error"** → Check that `.env` has your real key, no quotes around it
- **No pre-market price** → Yahoo only shows pre-market between ~4 AM and 9:30 AM ET. Outside that window you'll see "Last" price instead

## Pricing context

Each refresh uses ~$0.01 of Anthropic API credits. Even running it 10x/day costs about $0.10.
