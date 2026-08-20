XIN PRIME · Color Predictor · 24/7
====================================

FREE HOST on Render.com (step by step)

STEP 1 — Create account
  Go to: https://render.com
  Sign up with Google / GitHub / email (free)

STEP 2 — New Web Service
  Dashboard → "New +" → "Web Service"
  Connect GitHub OR choose "Public Git repository" 
  --- EASIEST without GitHub: ---
  Use the ZIP method below (STEP 2B)

STEP 2B — Deploy without GitHub (simple)
  1. On your computer, zip the whole folder "xin-prime-24x7"
     (must include: server.js, package.json, public/index.html)
  2. Go to https://render.com → New → Web Service
  3. If asked for repo: create a free GitHub account,
     create new repository, upload these 3 files:
       - server.js
       - package.json  
       - public/index.html  (create public folder, put index.html inside)
  4. Connect that repo to Render

STEP 3 — Render settings
  Name: xin-prime (anything)
  Runtime: Node
  Build Command:  npm install
  Start Command:  npm start
  Instance type: Free
  Click "Create Web Service"

STEP 4 — Wait 2–5 minutes
  When status = Live, you get a URL like:
  https://xin-prime-xxxx.onrender.com

  Open that link → website works.
  Server runs prediction every 15 seconds in the background.

STEP 5 — Keep Free plan awake (important)
  Free Render sleeps after ~15 min with no visitors.
  Fix (free):
  1. Go to https://cron-job.org  (free signup)
  2. Create cron job
  3. URL:  https://YOUR-RENDER-URL/api/ping
  4. Schedule: every 5 or 10 minutes
  5. Save

  Now the server stays awake → true 24/7 prediction.

NOTES
- History is stored in server memory. If Render restarts, history resets.
  (For permanent history you need a database later.)
- Only 30S Triple logic — same as before.
- You do NOT need to keep any browser open on your PC.
