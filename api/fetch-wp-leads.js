import { createHash } from "crypto";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeDate(value) {
  if (!value) return todayStr();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10) || todayStr();
  }
  return date.toISOString().slice(0, 10);
}

function getField(source, ...keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function parseLeadList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.leads)) return payload.leads;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function yesNo(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "No";
  return ["yes", "true", "1", "listed"].includes(normalized) ? "Yes" : "No";
}

function stableLeadId({
  wpLeadId,
  sellerName,
  email,
  phone,
  address,
  dateAdded,
}) {
  if (wpLeadId) {
    return `wp-lead-${String(wpLeadId).replace(/[^A-Za-z0-9_-]/g, "-")}`;
  }

  const fingerprint = [sellerName, email, phone, address, dateAdded]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .join("|");

  return `wp-lead-${createHash("sha1").update(fingerprint).digest("hex")}`;
}

function normalizeWpLead(raw) {
  const wpLeadId = getField(raw, "wp_lead_id", "wpLeadId", "id", "ID");
  const source =
    getField(raw, "source", "utm_source", "lead_source", "campaign_source") ||
    "Website";
  const address = getField(
    raw,
    "address",
    "property_address",
    "propertyAddress",
    "property",
    "Property Address",
  );
  const sellerName = getField(
    raw,
    "Name",
    "seller-name",
    "seller_name",
    "sellerName",
    "full_name",
    "fullName",
    "your-name",
    "name",
  );
  const email = getField(raw, "Email", "email", "seller_email", "sellerEmail");
  const phone = getField(raw, "Phone", "phone", "seller_phone", "sellerPhone");
  const dateAdded = normalizeDate(
    getField(
      raw,
      "Date",
      "date",
      "dateAdded",
      "date_added",
      "created_at",
      "createdAt",
    ),
  );

  return {
    id: stableLeadId({
      wpLeadId,
      sellerName,
      email,
      phone,
      address,
      dateAdded,
    }),
    leadType: "residential",
    source,
    ppcSource: true,
    dealType: getField(raw, "deal_type", "dealType") || "Wholesale",
    address,
    sellerName,
    email,
    phone,
    agentName: getField(raw, "agent_name", "agentName"),
    agentPhone: getField(raw, "agent_phone", "agentPhone"),
    url: getField(raw, "url", "listing_url", "listingUrl", "mls_url"),
    followUpDate: getField(raw, "follow_up_date", "followUpDate"),
    notes: [
      getField(raw, "notes", "message", "comments"),
      getField(raw, "condition", "Condition")
        ? `Condition: ${getField(raw, "condition", "Condition")}`
        : "",
      getField(raw, "timeline", "Timeline")
        ? `Timeline: ${getField(raw, "timeline", "Timeline")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    onMarket: yesNo(
      getField(raw, "on_market", "onMarket", "mls_listed", "MLS Listed"),
    ),
    listedPrice: getField(
      raw,
      "listed_price",
      "listedPrice",
      "asking_price",
      "estimated_value",
      "estimatedValue",
      "Estimated Value",
    ),
    rent: getField(raw, "rent", "monthly_rent"),
    occupied: getField(raw, "occupied") || "No",
    offerStatus: "Not Sent",
    sellerAccepted: "No",
    offerPrice: "",
    dateAdded,
    wpLeadId: wpLeadId ? Number(wpLeadId) || wpLeadId : null,
  };
}

function withPaginationParams(baseUrl, page, perPage) {
  const url = new URL(baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("paged", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("limit", String(perPage));
  url.searchParams.set("number", String(perPage));
  url.searchParams.set("posts_per_page", String(perPage));
  url.searchParams.set("all", "1");
  return url;
}

function withOffsetParams(baseUrl, offset, limit) {
  const url = new URL(baseUrl);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("start", String(offset));
  url.searchParams.set("skip", String(offset));
  url.searchParams.set("per_page", String(limit));
  url.searchParams.set("perPage", String(limit));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("number", String(limit));
  url.searchParams.set("posts_per_page", String(limit));
  url.searchParams.set("all", "1");
  return url;
}

function rawLeadKey(row) {
  const id = getField(row, "wp_lead_id", "wpLeadId", "id", "ID");
  if (id) return `wp:${id}`;
  return JSON.stringify(row);
}

async function fetchLeadRows(url, headers, method = "GET") {
  const response = await fetch(url, {
    method,
    headers,
    ...(method === "POST" ? { body: JSON.stringify({}) } : {}),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: data.message || data.error || "WordPress fetch failed",
      rows: [],
      totalPages: 0,
    };
  }

  return {
    ok: true,
    rows: parseLeadList(data),
    totalPages: Number(response.headers.get("x-wp-totalpages") || 0),
  };
}

function appendNewRows({ rows, allRows, seen }) {
  let newRows = 0;
  for (const row of rows) {
    const key = rawLeadKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    allRows.push(row);
    newRows += 1;
  }
  return newRows;
}

async function fetchAllWordPressLeads({ wpUrl, path, headers }) {
  const perPage = Number(process.env.WORDPRESS_LEADS_PER_PAGE || 100);
  const maxPages = Number(process.env.WORDPRESS_LEADS_MAX_PAGES || 50);
  const allRows = [];
  const seen = new Set();
  const pageSizes = [];
  const baseUrl = `${wpUrl}${path}`;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageUrl = withPaginationParams(baseUrl, page, perPage);
    const result = await fetchLeadRows(pageUrl, headers);

    if (!result.ok) {
      if (page > 1 && allRows.length > 0) break;
      return {
        ok: false,
        status: result.status,
        error: result.error,
      };
    }

    const rows = result.rows;
    pageSizes.push(rows.length);
    if (rows.length === 0) break;

    const newRows = appendNewRows({ rows, allRows, seen });

    if (result.totalPages && page >= result.totalPages) break;
    if (!result.totalPages && newRows === 0) break;
  }

  const offsetStep = pageSizes.find((size) => size > 0 && size < perPage) || 5;
  for (
    let offset = offsetStep;
    offset <= offsetStep * maxPages;
    offset += offsetStep
  ) {
    const offsetUrl = withOffsetParams(baseUrl, offset, offsetStep);
    const result = await fetchLeadRows(offsetUrl, headers);
    if (!result.ok || result.rows.length === 0) break;

    pageSizes.push(result.rows.length);
    const newRows = appendNewRows({ rows: result.rows, allRows, seen });
    if (newRows === 0) break;
  }

  return { ok: true, rows: allRows, pageSizes };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function candidateLeadPaths() {
  return uniqueValues([
    process.env.WORDPRESS_LEADS_PATH,
    "/wp-json/ywe/v1/leads",
    "/wp-json/ywe/v1/lead",
    "/wp-json/ywe/v1/leads/all",
    "/wp-json/ywe/v1/all-leads",
    "/wp-json/ywe/v1/get-leads",
    "/wp-json/ywe/v1/list-leads",
  ]).map((path) => (path.startsWith("/") ? path : `/${path}`));
}

async function fetchAllWordPressLeadsFromAnyRoute({ wpUrl, headers }) {
  const attempts = [];

  for (const path of candidateLeadPaths()) {
    const result = await fetchAllWordPressLeads({ wpUrl, path, headers });
    attempts.push({
      path,
      method: "GET",
      ok: result.ok,
      count: result.rows?.length || 0,
      error: result.error,
      status: result.status,
    });
    if (result.ok && result.rows.length > 0) {
      return { ...result, path, method: "GET", attempts };
    }
  }

  for (const path of candidateLeadPaths()) {
    const baseUrl = `${wpUrl}${path}`;
    const result = await fetchLeadRows(
      withPaginationParams(
        baseUrl,
        1,
        Number(process.env.WORDPRESS_LEADS_PER_PAGE || 100),
      ),
      headers,
      "POST",
    );
    attempts.push({
      path,
      method: "POST",
      ok: result.ok,
      count: result.rows?.length || 0,
      error: result.error,
      status: result.status,
    });
    if (result.ok && result.rows.length > 0) {
      return {
        ok: true,
        rows: result.rows,
        pageSizes: [result.rows.length],
        path,
        method: "POST",
        attempts,
      };
    }
  }

  return {
    ok: false,
    status: attempts.find((attempt) => attempt.status)?.status || 404,
    error: `No WordPress lead list route returned leads. Tried: ${attempts
      .map(
        (attempt) =>
          `${attempt.method} ${attempt.path}${attempt.status ? ` (${attempt.status})` : ""}`,
      )
      .join(", ")}`,
    attempts,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const wpUrl = (process.env.WORDPRESS_SITE_URL || "").replace(/\/+$/, "");
  if (!wpUrl) {
    return res.status(500).json({ error: "WORDPRESS_SITE_URL not configured" });
  }

  const headers = {
    "Content-Type": "application/json",
    "x-webhook-secret": process.env.WEBHOOK_SECRET || "",
  };

  try {
    const result = await fetchAllWordPressLeadsFromAnyRoute({
      wpUrl,
      headers,
    });

    if (!result.ok) {
      return res
        .status(result.status)
        .json({ error: result.error, attempts: result.attempts });
    }

    const leads = result.rows
      .map(normalizeWpLead)
      .filter(
        (lead) => lead.address || lead.sellerName || lead.email || lead.phone,
      );

    return res.status(200).json({
      leads,
      totalFetched: result.rows.length,
      pageSizes: result.pageSizes,
      sourcePath: result.path,
      sourceMethod: result.method,
    });
  } catch (err) {
    console.error("fetch-wp-leads error:", err);
    return res.status(500).json({ error: "Failed to fetch WordPress leads" });
  }
}
