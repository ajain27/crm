// Local dev server that mirrors Vercel API functions for npm run dev
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Dynamically import the Vercel handler and adapt it to Express
app.post("/api/send-invoice", async (req, res) => {
  const { default: handler } = await import("./api/send-invoice.js");
  await handler(req, res);
});

app.post("/api/send-email", async (req, res) => {
  const { default: handler } = await import("./api/send-email.js");
  await handler(req, res);
});

app.get("/api/fetch-wp-leads", async (req, res) => {
  const { default: handler } = await import("./api/fetch-wp-leads.js");
  await handler(req, res);
});

app.post("/api/delete-wp-lead", async (req, res) => {
  const { default: handler } = await import("./api/delete-wp-lead.js");
  await handler(req, res);
});

app.get("/api/send-scheduled-invoices", async (req, res) => {
  const { default: handler } = await import("./api/send-scheduled-invoices.js");
  await handler(req, res);
});

const PORT = 3001;
app.listen(PORT, () =>
  console.log(`Dev API server running at http://localhost:${PORT}`),
);
