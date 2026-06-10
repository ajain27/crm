# Google Calendar Integration Setup

## Overview
The server handles Google Calendar OAuth token exchange and event fetching.

## Local Development

### 1. Install Server Dependencies
```bash
npm install --cache /tmp/npm-cache --save express cors axios dotenv
```

### 2. Run the Server
```bash
node server.js
```

You should see:
```
Google Calendar server running on port 5000
Health check: http://localhost:5000/health
```

### 3. Test the Server
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok"}
```

### 4. Run Frontend + Backend Together
**Terminal 1 (Backend):**
```bash
node server.js
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Then visit: http://localhost:5173 and test the calendar!

---

## Production Deployment (Railway)

### Step 1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### Step 2: Connect Your GitHub Repo
1. Click "New Project" → "GitHub Repo"
2. Select your wholesale-dashboard-vite repo
3. Railway will auto-detect `server.js` and `Procfile`

### Step 3: Set Environment Variables
In Railway dashboard:
1. Go to your project → Variables
2. Add these variables:
   ```
   GOOGLE_CLIENT_ID=your-client-id-from-google-cloud-console
   GOOGLE_CLIENT_SECRET=your-client-secret-from-google-cloud-console
   ```
   (Get these from Google Cloud Console → Credentials)

### Step 4: Get Your Railway URL
1. Go to your Railway project
2. Copy the "Public Domain" URL (looks like: `your-app-name.railway.app`)

### Step 5: Update Production Config
Update `.env.production`:
```env
VITE_CALENDAR_SERVER_URL=https://your-app-name.railway.app
```

### Step 6: Deploy
Just push to GitHub - Railway auto-deploys!
```bash
git add .
git commit -m "Add Google Calendar server"
git push origin main
```

Railway will:
- Pull your code
- Install dependencies
- Run `node server.js`
- Assign a public URL

That's it! 🚀

---

## API Endpoints

All endpoints return JSON.

### POST `/api/google/exchange-code`
Exchanges authorization code for access token.

**Request:**
```json
{
  "code": "auth-code-from-google",
  "redirectUri": "http://localhost:5173/callback.html"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "ya29...",
  "refreshToken": "1//...",
  "idToken": "eyJ...",
  "expiresIn": 3599
}
```

---

### POST `/api/google/fetch-events`
Fetches calendar events for a date range.

**Request:**
```json
{
  "accessToken": "ya29...",
  "timeMin": "2026-06-01T00:00:00Z",
  "timeMax": "2026-07-01T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "event-id",
      "summary": "Event Title",
      "start": { "dateTime": "2026-06-15T10:00:00Z" },
      "end": { "dateTime": "2026-06-15T11:00:00Z" }
    }
  ]
}
```

---

### POST `/api/google/refresh-token`
Refreshes an expired access token.

**Request:**
```json
{
  "refreshToken": "1//..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "ya29...",
  "expiresIn": 3599
}
```

---

## Troubleshooting

**Server won't start:**
```bash
# Make sure dependencies are installed
npm install --cache /tmp/npm-cache --save express cors axios dotenv

# Check port 5000 is available
lsof -i :5000
```

**CORS errors in browser:**
- Make sure server is running on `localhost:5000`
- Check frontend is calling correct URL in `VITE_CALENDAR_SERVER_URL`

**Google auth fails:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.server`
- Make sure redirect URI matches in Google Cloud Console

**Railway deployment fails:**
- Check Railway logs in dashboard
- Make sure `Procfile` exists and has `web: node server.js`
- Verify environment variables are set in Railway dashboard
