// Runs comps for a property address:
//   1. Serper (Google search) finds the property's Zillow, Redfin and
//      Realtor.com pages — one batched call, falling back to one per site.
//   2. Firecrawl scrapes each page into JSON: beds, baths, sq ft, year
//      built, value and rent estimates, annual tax and comps.
//   3. OpenAI reconciles the three JSONs into one set of property facts,
//      an ARV and rent estimate, and the top 5 comps with links.
//
// Env: SERPER_API_KEY, FIRECRAWL_API_KEY, OPENAI_API_KEY, and optionally
// OPENAI_MODEL (default below).

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
  return data.data?.json || null;
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

export async function runComps(address, env = process.env) {
  const missing = [
    "SERPER_API_KEY",
    "FIRECRAWL_API_KEY",
    "OPENAI_API_KEY",
  ].filter((k) => !env[k]);
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

  const result = await openAiReconcile(
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
