// One-off local dev helper: since Vercel Cron doesn't run locally, this
// polls the dev-api's send-scheduled-lead-emails route every N seconds
// (LOCAL_TEST_INTERVAL_SECONDS in .env.local, default 15) so you can watch
// the drip sequence advance without waiting on the real daily schedule.
//
// Requires `npm run dev` (or `npm run dev:api`) already running on :3001.
// Usage: node scripts/watch-lead-automation.mjs
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const intervalSeconds = Number(process.env.LOCAL_TEST_INTERVAL_SECONDS) || 15;
const url = "http://localhost:3001/api/send-scheduled-lead-emails";

console.log(`Polling ${url} every ${intervalSeconds}s (Ctrl+C to stop)...`);

async function tick() {
  const stamp = new Date().toLocaleTimeString();
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    console.log(`[${stamp}] ${res.status}`, data);
  } catch (err) {
    console.log(`[${stamp}] request failed:`, err.message);
  }
}

await tick();
setInterval(tick, intervalSeconds * 1000);
