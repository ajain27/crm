// Runs comps for a property address:
//   1. Serper (Google search) finds the property's Zillow, Redfin and
//      Realtor.com pages — one batched call, falling back to one per site.
//   2. Firecrawl scrapes each page into JSON: beds, baths, sq ft, year
//      built, value and rent estimates, annual tax and comps.
//   3. The three JSONs are reconciled into one set of property facts, an
//      ARV and rent estimate, and the top 5 comps with links — by OpenAI
//      when it's set up and working, otherwise by the rules below
//      (rankCompsByRules), so OpenAI billing never blocks comps.
//
// Env: SERPER_API_KEY and FIRECRAWL_API_KEY (required); OPENAI_API_KEY and
// OPENAI_MODEL (optional).

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
// Pages are scraped in parallel; this leaves time for OpenAI inside the
// function's 60s limit (vercel.json).
const FIRECRAWL_TIMEOUT_MS = 35000;

export const SITES = [
  {
    key: "zillow",
    label: "Zillow",
    domain: "zillow.com",
    // Property pages, not search or agent pages.
    propertyPath: /\/homedetails\//i,
  },
  {
    key: "redfin",
    label: "Redfin",
    domain: "redfin.com",
    propertyPath: /\/home\/\d+/i,
  },
  {
    key: "realtor",
    label: "Realtor.com",
    domain: "realtor.com",
    propertyPath: /\/realestateandhomes-detail\//i,
  },
];

const nullable = (type) => ({ type: [type, "null"] });

// What Firecrawl extracts from each listing page.
export const PAGE_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string" },
    beds: { type: "number" },
    baths: { type: "number" },
    sqft: { type: "number" },
    yearBuilt: { type: "number" },
    valueEstimate: {
      type: "number",
      description:
        "The site's estimated market value (Zestimate, Redfin Estimate, etc.)",
    },
    rentEstimate: { type: "number", description: "Estimated monthly rent" },
    annualTax: {
      type: "number",
      description: "Most recent annual property tax",
    },
    lastSoldPrice: { type: "number" },
    lastSoldDate: { type: "string" },
    comps: {
      type: "array",
      description:
        "Comparable or nearby recently sold homes listed on the page, up to 10",
      items: {
        type: "object",
        properties: {
          address: { type: "string" },
          price: { type: "number" },
          beds: { type: "number" },
          baths: { type: "number" },
          sqft: { type: "number" },
          soldDate: { type: "string" },
          url: { type: "string" },
        },
      },
    },
  },
};

const COMP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "address",
    "price",
    "beds",
    "baths",
    "sqft",
    "soldDate",
    "url",
    "source",
    "reason",
  ],
  properties: {
    address: { type: "string" },
    price: nullable("number"),
    beds: nullable("number"),
    baths: nullable("number"),
    sqft: nullable("number"),
    soldDate: nullable("string"),
    url: nullable("string"),
    source: { type: "string", enum: ["Zillow", "Redfin", "Realtor.com"] },
    reason: { type: "string" },
  },
};

// What OpenAI returns (strict structured output: every field required,
// "null" when unknown).
export const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["property", "arvEstimate", "rentEstimate", "topComps", "summary"],
  properties: {
    property: {
      type: "object",
      additionalProperties: false,
      required: [
        "beds",
        "baths",
        "sqft",
        "yearBuilt",
        "valueEstimate",
        "rentEstimate",
        "annualTax",
      ],
      properties: {
        beds: nullable("number"),
        baths: nullable("number"),
        sqft: nullable("number"),
        yearBuilt: nullable("number"),
        valueEstimate: nullable("number"),
        rentEstimate: nullable("number"),
        annualTax: nullable("number"),
      },
    },
    arvEstimate: nullable("number"),
    rentEstimate: nullable("number"),
    topComps: { type: "array", items: COMP_SCHEMA },
    summary: { type: "string" },
  },
};

const SYSTEM_PROMPT = `You are a real estate analyst helping a wholesaler run comps.
You get JSON scraped from the subject property's Zillow, Redfin and Realtor.com pages (some may be missing or empty).
1. Reconcile the subject property's facts. When sources disagree, prefer the value most sources agree on, else Zillow, then Redfin, then Realtor.com.
2. From all comps across the sources (drop duplicates of the same address), choose up to 5 that best match the subject: similar beds, baths and square footage, sold recently (prefer the last 6 months), and close by. Never include the subject property itself.
3. Estimate the after-repair value (ARV) from those comps, and a monthly rent estimate from the sources.
4. Give each comp a one-sentence reason it was chosen, and write a 2-3 sentence summary of the ARV reasoning.
Use only numbers present in the data; use null when something is unknown. Prices are whole US dollars.`;

function siteForUrl(url) {
  return SITES.find((s) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "").endsWith(s.domain);
    } catch {
      return false;
    }
  });
}

// The best result for each site: a property page if there is one, else
// the site's first result.
export function pickListingUrls(organicResultsBySite) {
  const urls = {};
  SITES.forEach((site, i) => {
    const links = (organicResultsBySite[i] || [])
      .map((r) => r.link)
      .filter((link) => siteForUrl(link)?.key === site.key);
    urls[site.key] =
      links.find((link) => site.propertyPath.test(link)) || links[0] || null;
  });
  return urls;
}

async function serperSearch(queries, apiKey) {
  const search = async (body) => {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Serper search failed (${res.status})`);
    return res.json();
  };

  // One batched call; if Serper doesn't return one result per query, ask
  // for each site separately.
  try {
    const batch = await search(queries.map((q) => ({ q, num: 10 })));
    if (Array.isArray(batch) && batch.length === queries.length) {
      return batch.map((r) => r.organic || []);
    }
  } catch {
    // fall through to single searches
  }
  const single = await Promise.all(
    queries.map((q) => search({ q, num: 10 }).catch(() => ({}))),
  );
  return single.map((r) => r.organic || []);
}

// Scraped pages often fill unknown fields with "N/A", "—", "unknown" or
// 0; treat those as missing so they don't show up as values.
const PLACEHOLDER = /^(n\/?a|none|unknown|not available|-+|—|–)$/i;

export function cleanScraped(value) {
  if (Array.isArray(value)) return value.map(cleanScraped);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([k, v]) => [k, cleanScraped(v)])
        .filter(([, v]) => v !== null),
    );
  }
  if (typeof value === "string") {
    const text = value.trim();
    return text && !PLACEHOLDER.test(text) ? text : null;
  }
  if (typeof value === "number")
    return Number.isFinite(value) && value !== 0 ? value : null;
  return value ?? null;
}

async function firecrawlExtract(url, apiKey) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [
        {
          type: "json",
          schema: PAGE_SCHEMA,
          prompt:
            "Extract the subject property's details, its value and rent estimates, annual property tax, and any comparable or nearby recently sold homes shown on the page.",
        },
      ],
      onlyMainContent: true,
      timeout: FIRECRAWL_TIMEOUT_MS,
      proxy: "auto",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Firecrawl failed (${res.status})`);
  }
  const extracted = data.data?.json;
  return extracted ? cleanScraped(extracted) : null;
}

async function openAiReconcile(address, sources, apiKey, model) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ subjectAddress: address, sources }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "comps_result",
          strict: true,
          schema: RESULT_SCHEMA,
        },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI failed (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no result.");
  return JSON.parse(content);
}

// ── Rules-based reconcile (no AI) ────────────────────────────────────────

const SOURCE_LABELS = {
  zillow: "Zillow",
  redfin: "Redfin",
  realtor: "Realtor.com",
};
const SOURCE_PRIORITY = ["zillow", "redfin", "realtor"];
const PROPERTY_FIELDS = [
  "beds",
  "baths",
  "sqft",
  "yearBuilt",
  "valueEstimate",
  "rentEstimate",
  "annualTax",
];

const isNum = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;

// "164 Auburn St., Russellville, AL" → "164 auburn st" — for spotting the
// same house listed on two sites, or the subject itself among its comps.
function addressKey(address) {
  return String(address || "")
    .split(",")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// The value most sites agree on; when they all differ, Zillow's, then
// Redfin's, then Realtor.com's.
function agreedValue(values) {
  const present = values.filter(isNum);
  if (present.length === 0) return null;
  const counts = new Map();
  present.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const [top, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return count > 1 ? top : present[0];
}

function monthsAgo(dateText, now) {
  const time = Date.parse(String(dateText || "").replace(/^sold\s*/i, ""));
  if (Number.isNaN(time)) return null;
  return Math.max(0, (now - time) / (1000 * 60 * 60 * 24 * 30.4));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const fmtMoney = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

function compReason(comp, subject, months) {
  const parts = [];
  if (isNum(comp.beds) && isNum(comp.baths)) {
    parts.push(
      comp.beds === subject.beds && comp.baths === subject.baths
        ? "Same beds/baths"
        : `${comp.beds} bd/${comp.baths} ba`,
    );
  }
  if (isNum(comp.sqft) && isNum(subject.sqft)) {
    const diff = Math.round(((comp.sqft - subject.sqft) / subject.sqft) * 100);
    parts.push(
      diff === 0
        ? "same size"
        : `${Math.abs(diff)}% ${diff > 0 ? "larger" : "smaller"}`,
    );
  }
  if (months !== null) {
    parts.push(
      months < 1
        ? "sold this month"
        : `sold ${Math.round(months)} month${Math.round(months) === 1 ? "" : "s"} ago`,
    );
  }
  return parts.length ? `${parts.join(", ")}.` : "Nearby sale.";
}

// Picks the top comps without AI: every comp from every site, duplicates
// and the subject removed, scored by how closely beds, baths and size
// match and how recently it sold. ARV = median price per sq ft of the top
// comps × the subject's sq ft (or their median price if size is unknown).
export function rankCompsByRules(address, sources, now = Date.now()) {
  const property = Object.fromEntries(
    PROPERTY_FIELDS.map((field) => [
      field,
      agreedValue(SOURCE_PRIORITY.map((key) => sources[key]?.data?.[field])),
    ]),
  );

  const subjectKey = addressKey(address);
  const byAddress = new Map();
  SOURCE_PRIORITY.forEach((key) => {
    (sources[key]?.data?.comps || []).forEach((comp) => {
      const compKey = addressKey(comp?.address);
      if (!compKey || compKey === subjectKey || !isNum(comp.price)) return;
      const candidate = { ...comp, source: SOURCE_LABELS[key] };
      const filled = (c) =>
        ["beds", "baths", "sqft", "soldDate", "url"].filter((f) => c[f]).length;
      const existing = byAddress.get(compKey);
      if (!existing || filled(candidate) > filled(existing)) {
        byAddress.set(compKey, candidate);
      }
    });
  });

  const scored = [...byAddress.values()].map((comp) => {
    const months = monthsAgo(comp.soldDate, now);
    let score = 0;
    score +=
      isNum(comp.beds) && isNum(property.beds)
        ? Math.abs(comp.beds - property.beds)
        : 1;
    score +=
      isNum(comp.baths) && isNum(property.baths)
        ? Math.abs(comp.baths - property.baths) * 0.75
        : 0.75;
    score +=
      isNum(comp.sqft) && isNum(property.sqft)
        ? (Math.abs(comp.sqft - property.sqft) / property.sqft) * 5
        : 1.5;
    score += months === null ? 1 : Math.min(months, 24) * 0.15;
    return { comp, months, score };
  });
  scored.sort((a, b) => a.score - b.score);
  const top = scored.slice(0, 5);

  const topComps = top.map(({ comp, months }) => ({
    address: comp.address,
    price: comp.price,
    beds: isNum(comp.beds) ? comp.beds : null,
    baths: isNum(comp.baths) ? comp.baths : null,
    sqft: isNum(comp.sqft) ? comp.sqft : null,
    soldDate: comp.soldDate || null,
    url: comp.url || null,
    source: comp.source,
    reason: compReason(comp, property, months),
  }));

  const pricesPerSqft = topComps
    .filter((c) => isNum(c.sqft))
    .map((c) => c.price / c.sqft);
  let arvEstimate = null;
  let summary;
  if (topComps.length === 0) {
    summary = "No comparable sales were found on these pages.";
  } else if (isNum(property.sqft) && pricesPerSqft.length > 0) {
    const ppsf = median(pricesPerSqft);
    arvEstimate = Math.round(ppsf * property.sqft);
    summary = `ARV = median ${fmtMoney(ppsf)}/sq ft across ${pricesPerSqft.length} comp${pricesPerSqft.length === 1 ? "" : "s"} × ${property.sqft.toLocaleString("en-US")} sq ft.`;
  } else {
    arvEstimate = Math.round(median(topComps.map((c) => c.price)));
    summary = `ARV = median sale price of ${topComps.length} comp${topComps.length === 1 ? "" : "s"} (the property's size wasn't available).`;
  }

  return {
    property,
    arvEstimate,
    rentEstimate: property.rentEstimate,
    topComps,
    summary,
  };
}

export async function runComps(address, env = process.env) {
  const missing = ["SERPER_API_KEY", "FIRECRAWL_API_KEY"].filter(
    (k) => !env[k],
  );
  if (missing.length) {
    const error = new Error(
      `Comps aren't set up yet: missing ${missing.join(", ")}.`,
    );
    error.status = 500;
    throw error;
  }

  const queries = SITES.map((s) => `${address} site:${s.domain}`);
  const listingUrls = pickListingUrls(
    await serperSearch(queries, env.SERPER_API_KEY),
  );

  // Scrape the three pages in parallel; one failing doesn't stop the rest.
  const scraped = await Promise.all(
    SITES.map(async (site) => {
      const url = listingUrls[site.key];
      if (!url)
        return [site.key, { url: null, data: null, error: "No page found" }];
      try {
        return [
          site.key,
          {
            url,
            data: await firecrawlExtract(url, env.FIRECRAWL_API_KEY),
            error: null,
          },
        ];
      } catch (err) {
        return [site.key, { url, data: null, error: err.message }];
      }
    }),
  );
  const sources = Object.fromEntries(scraped);

  if (!Object.values(sources).some((s) => s.data)) {
    const error = new Error(
      "Couldn't read this property from Zillow, Redfin or Realtor.com. Check the address and try again.",
    );
    error.status = 404;
    error.sources = sources;
    throw error;
  }

  // OpenAI when it's set up; if it isn't, or the call fails (e.g. no
  // credit), the rules pick the comps instead.
  let result = null;
  let method = "rules";
  let aiError = null;
  if (env.OPENAI_API_KEY) {
    try {
      result = await openAiReconcile(
        address,
        Object.fromEntries(
          Object.entries(sources).map(([key, s]) => [
            key,
            { url: s.url, data: s.data },
          ]),
        ),
        env.OPENAI_API_KEY,
        env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      );
      method = "openai";
    } catch (err) {
      aiError = err.message;
      console.warn("run-comps: OpenAI unavailable, using rules:", err.message);
    }
  }
  if (!result) result = rankCompsByRules(address, sources);

  return {
    address,
    listingUrls,
    sourceErrors: Object.fromEntries(
      Object.entries(sources)
        .filter(([, s]) => s.error)
        .map(([key, s]) => [key, s.error]),
    ),
    ...result,
    topComps: (result.topComps || []).slice(0, 5),
    method,
    ...(aiError ? { aiError } : {}),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const address = String(req.body?.address || "").trim();
  if (address.length < 8 || address.length > 200) {
    return res
      .status(400)
      .json({ error: "Enter the property's full address." });
  }

  try {
    return res.status(200).json(await runComps(address));
  } catch (err) {
    console.error("run-comps error:", err);
    return res.status(err.status || 502).json({
      error: err.message || "Running comps failed.",
    });
  }
}
