// Reads listing pages through a paid scraper (the sites block plain
// requests). Firecrawl first; once it says it's out of credits, Crawl4AI,
// then (for a page's HTML) Jina. A scraper that's out of credits is
// skipped for a while, so later pages don't ask it again. Firecrawl is
// always asked first while it has credits; a page Crawl4AI can't get
// (blocked, busy) goes on to Jina.
//
//   - scrapeHtml(url): the page's full HTML (Firecrawl → Crawl4AI → Jina).
//   - extractJson(url, { schema, prompt }): data read from the page to
//     match `schema` (Firecrawl → Crawl4AI; Jina can't).
//
// Env: FIRECRAWL_API_KEY, CRAWL4AI_API_KEY, JINA_API_KEY (any of them).

import { errorWithStatus } from "./comps/rules.js";

const HTML_TIMEOUT_MS = 45000;
const EXTRACT_TIMEOUT_MS = 30000;
// How long a scraper that ran out of credits is skipped.
const OUT_OF_CREDITS_MS = 10 * 60 * 1000;

const NAMES = { firecrawl: "Firecrawl", crawl4ai: "Crawl4AI", jina: "Jina" };
const KEYS = {
  firecrawl: "FIRECRAWL_API_KEY",
  crawl4ai: "CRAWL4AI_API_KEY",
  jina: "JINA_API_KEY",
};

const outUntil = {};

// For tests: forget which scrapers ran out.
export function resetScraperState() {
  Object.keys(outUntil).forEach((name) => delete outUntil[name]);
}

function outOfCredits(name) {
  const error = new Error(`${NAMES[name]} is out of credits.`);
  error.outOfCredits = true;
  return error;
}

function rateLimited(name, seconds) {
  const error = errorWithStatus(
    `${NAMES[name]} is getting pages faster than its plan allows.`,
    429,
  );
  error.retryAfter = seconds > 0 ? seconds : 30;
  return error;
}

// "missing …" for a feature's error message when no scraper it can use is
// set up (`kind` is "html" or "extract").
export function missingScraperKey(env, kind) {
  const names = kind === "html" ? Object.keys(KEYS) : ["firecrawl", "crawl4ai"];
  return names.some((name) => env[KEYS[name]])
    ? null
    : names.map((name) => KEYS[name]).join(" or ");
}

// "A", "A and B", "A, B and C".
const listNames = (names) =>
  names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
    : names[0];

// Runs the first scraper that's set up and has credits; on running out,
// the next one. A backup scraper that couldn't get the page (`passOn`:
// blocked, busy, rate limited) also hands it to the next one, if any.
async function firstWithCredits(env, names, run) {
  const now = Date.now();
  let passedOn = null;
  for (const name of names) {
    const key = env[KEYS[name]];
    if (!key || outUntil[name] > now) continue;
    try {
      return await run[name](key);
    } catch (err) {
      if (err.passOn) {
        passedOn = err;
        continue;
      }
      // Pages read at the same time: once one finds this scraper out of
      // credits, the others' errors from it (often "rate limited") mean
      // the same.
      if (outUntil[name] > Date.now()) continue;
      if (!err.outOfCredits) throw err;
      outUntil[name] = Date.now() + OUT_OF_CREDITS_MS;
    }
  }
  if (passedOn) throw passedOn;
  const setUp = names.filter((name) => env[KEYS[name]]).map((n) => NAMES[n]);
  if (setUp.length) {
    throw errorWithStatus(
      `${listNames(setUp)} ${setUp.length > 1 ? "are" : "is"} out of credits. Add credits or wait for the plan to renew.`,
      503,
    );
  }
  throw errorWithStatus(
    `No scraper is set up: missing ${names.map((n) => KEYS[n]).join(" or ")}.`,
    500,
  );
}

// ---- Firecrawl -------------------------------------------------------

async function firecrawl(key, body) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const message = data.error || "";
  if (res.status === 402 || /insufficient credits/i.test(message)) {
    throw outOfCredits("firecrawl");
  }
  if (res.status === 429 || /rate limit/i.test(message)) {
    throw rateLimited(
      "firecrawl",
      Number(/retry after (\d+)s/i.exec(message)?.[1]),
    );
  }
  if (!res.ok || !data.success) {
    throw new Error(message || `Firecrawl failed (${res.status})`);
  }
  return data.data || {};
}

// ---- Crawl4AI --------------------------------------------------------

// Its plan runs one page at a time, so this instance's requests queue.
let crawl4aiQueue = Promise.resolve();
function oneAtATime(task) {
  const run = crawl4aiQueue.then(task, task);
  crawl4aiQueue = run.catch(() => {});
  return run;
}

// Anything but running out of credits passes the page on to the next
// scraper ("busy" already means it tried for a while).
async function crawl4ai(key, path, body, timeoutMs) {
  const res = await oneAtATime(() =>
    fetch(`https://api.crawl4ai.com/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    }),
  ).catch((err) => {
    err.passOn = true;
    throw err;
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 402) throw outOfCredits("crawl4ai");
  const error =
    res.status === 429
      ? rateLimited("crawl4ai", 30)
      : !res.ok || data.ok === false
        ? new Error(
            `Crawl4AI failed (${data.reason || data.error || data.message || res.status})`,
          )
        : null;
  if (error) {
    error.passOn = true;
    throw error;
  }
  return data;
}

// ---- Jina ------------------------------------------------------------

async function jina(key, url) {
  const res = await fetch("https://r.jina.ai/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Return-Format": "html",
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(HTML_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 402) throw outOfCredits("jina");
  if (res.status === 429) throw rateLimited("jina", 30);
  if (!res.ok) {
    throw new Error(`Jina failed (${data.message || res.status})`);
  }
  return data.data?.html || "";
}

// ---- What callers use --------------------------------------------------

export function scrapeHtml(url, env, { waitFor = 0 } = {}) {
  return firstWithCredits(env, ["firecrawl", "crawl4ai", "jina"], {
    firecrawl: async (key) =>
      (
        await firecrawl(key, {
          url,
          formats: ["rawHtml"],
          onlyMainContent: false,
          proxy: "auto",
          ...(waitFor ? { waitFor } : {}),
          timeout: HTML_TIMEOUT_MS,
        })
      ).rawHtml || "",
    crawl4ai: async (key) =>
      (await crawl4ai(key, "scrape", { url, format: "html" }, HTML_TIMEOUT_MS))
        .html || "",
    jina: (key) => jina(key, url),
  });
}

// `{ data, metadata }`: the extracted data (null if none) and, from
// Firecrawl, the page's metadata (og:image…); null from Crawl4AI.
export function extractJson(url, env, { schema, prompt }) {
  return firstWithCredits(env, ["firecrawl", "crawl4ai"], {
    firecrawl: async (key) => {
      const page = await firecrawl(key, {
        url,
        formats: [{ type: "json", schema, prompt }],
        onlyMainContent: true,
        timeout: EXTRACT_TIMEOUT_MS,
        proxy: "auto",
      });
      return { data: page.json || null, metadata: page.metadata || {} };
    },
    crawl4ai: async (key) => {
      const result = await crawl4ai(
        key,
        "extract",
        { url, instruction: prompt, schema },
        EXTRACT_TIMEOUT_MS,
      );
      const records = Array.isArray(result.data) ? result.data : [result.data];
      return { data: records[0] || null, metadata: null };
    },
  });
}

// The page's share image (og:image) from its HTML.
export function ogImageFromHtml(html) {
  const tag = String(html || "").match(
    /<meta[^>]+(?:property|name)=["']og:image["'][^>]*>/i,
  )?.[0];
  const url = tag?.match(/content=["']([^"']+)["']/i)?.[1];
  return url ? url.replace(/&amp;/g, "&") : null;
}
