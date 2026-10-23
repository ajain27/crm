import ResizableTable from "../elements/ResizableTable";
import "./PropertyHistory.css";

// A property's history as comps and /api/property-history return it
// ({ timeline, sales, taxes }), shown two ways: the price history (every
// listing, price change and sale) and the property history (its sales and
// tax years). Used by Find Comps and the lead windows.

const EVENT_COLORS = {
  sold: "#2563eb",
  listed: "#16a34a",
  pending: "#d97706",
  priceChange: "var(--orange)",
  delisted: "var(--muted)",
  rental: "#7c3aed",
  other: "var(--muted)",
};

const money = (n) =>
  typeof n === "number" && Number.isFinite(n) && n > 0
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "—";

// "2022-09-16" → "Sep 16, 2022".
const longDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const change = (n) =>
  n == null ? "—" : `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;

// Every listing, price change and sale, newest first.
export function PriceHistory({ history }) {
  const timeline = history?.timeline || [];
  if (!timeline.length) {
    return (
      <p className="ph-empty">
        Zillow, Redfin and Realtor.com show no price history for this property.
      </p>
    );
  }
  return (
    <div className="ph-section">
      <span className="ph-label">Price History ({timeline.length})</span>
      <div className="table-wrap">
        <ResizableTable resizeKey="price-history" className="compact-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Price</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((e) => (
              <tr key={`${e.date}-${e.kind}`}>
                <td>{longDate(e.date)}</td>
                <td>
                  <span
                    className="ph-event"
                    style={{ color: EVENT_COLORS[e.kind] }}
                  >
                    {e.event}
                  </span>
                </td>
                <td>{money(e.price)}</td>
                <td className="ph-muted">{e.sources.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </ResizableTable>
      </div>
    </div>
  );
}

// The property's sales (with the change and years from the sale before)
// and its tax years.
export function PropertyHistory({ history }) {
  const sales = history?.sales || [];
  const taxes = history?.taxes || [];
  if (!sales.length && !taxes.length) {
    return (
      <p className="ph-empty">
        Zillow, Redfin and Realtor.com show no sales or tax history for this
        property.
      </p>
    );
  }
  return (
    <>
      <div className="ph-section">
        <span className="ph-label">Sales ({sales.length})</span>
        {sales.length ? (
          <div className="table-wrap">
            <ResizableTable
              resizeKey="property-history-sales"
              className="compact-table"
            >
              <thead>
                <tr>
                  <th>Sold</th>
                  <th>Price</th>
                  <th>Change From Prior Sale</th>
                  <th>Years Since Prior Sale</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.date}>
                    <td>{longDate(s.date)}</td>
                    <td>
                      <strong>{money(s.price)}</strong>
                    </td>
                    <td
                      className={
                        s.change > 0
                          ? "ph-up"
                          : s.change < 0
                            ? "ph-down"
                            : undefined
                      }
                    >
                      {change(s.change)}
                    </td>
                    <td>{s.heldYears ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </ResizableTable>
          </div>
        ) : (
          <p className="ph-muted">No recorded sales.</p>
        )}
      </div>
      {taxes.length > 0 && (
        <div className="ph-section">
          <span className="ph-label">Tax History</span>
          <div className="table-wrap">
            <ResizableTable
              resizeKey="property-history-taxes"
              className="compact-table"
            >
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Property Tax</th>
                  <th>Assessed Value</th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((t) => (
                  <tr key={t.year}>
                    <td>{t.year}</td>
                    <td>{money(t.tax)}</td>
                    <td>{money(t.assessedValue)}</td>
                  </tr>
                ))}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      )}
    </>
  );
}
