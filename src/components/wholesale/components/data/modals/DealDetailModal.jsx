import Modal from "../../../../modal/Modal";
import { currency } from "../../../../../utils/utils";

function val(v) {
  return v && String(v).trim() ? v : "—";
}

function currencyVal(v) {
  const n = Number(v || 0);
  return n > 0 ? currency(n) : "—";
}

function Section({ title, children }) {
  return (
    <div className="ddm-section">
      <div className="ddm-section-label">{title}</div>
      <div className="ddm-grid">{children}</div>
    </div>
  );
}

function Cell({ label, value, wide, highlight }) {
  return (
    <div
      className={`ddm-cell${wide ? " ddm-cell-wide" : ""}${highlight ? ` ${highlight}` : ""}`}
    >
      <span className="ddm-cell-label">{label}</span>
      <strong className="ddm-cell-value">{value}</strong>
    </div>
  );
}

function DealDetailModal({ isOpen, onClose, deal }) {
  if (!deal) return null;

  const grossRevenue =
    Number(deal.assignedPrice || 0) - Number(deal.contractPrice || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={deal.address}
      className="deal-detail-modal"
      actions={
        <button className="secondary-btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="ddm-body">
        <Section title="Property">
          <Cell
            label="Address"
            value={`${val(deal.address)}, ${val(deal.city)}, ${val(deal.state)} ${val(deal.zipCode)}`}
            wide
          />
          <Cell label="Type" value={val(deal.propertyType)} />
        </Section>

        <Section title="Deal Numbers">
          <Cell label="ARV" value={currencyVal(deal.arv)} />
          <Cell label="Rehab Cost" value={currencyVal(deal.rehabCost)} />
          <Cell label="MAO" value={currencyVal(deal.mao)} />
        </Section>

        {deal.onMarket === "Yes" && (
          <Section title="On Market">
            <Cell label="Listed Price" value={currencyVal(deal.listedPrice)} />
            <Cell label="Agent Name" value={val(deal.agentName)} />
            <Cell label="Agent Phone" value={val(deal.agentPhone)} />
            {deal.listingUrl ? (
              <div className="ddm-cell">
                <span className="ddm-cell-label">Listing</span>
                <a
                  href={deal.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ddm-link"
                >
                  View Listing ↗
                </a>
              </div>
            ) : (
              <Cell label="Listing" value="—" />
            )}
          </Section>
        )}

        <Section title="Offer & Contract">
          <Cell label="Offer Status" value={val(deal.offerStatus)} />
          <Cell label="Offer Date" value={val(deal.offerDate)} />
          <Cell
            label="Contract Price"
            value={currencyVal(deal.contractPrice)}
          />
          <Cell
            label="Seller Accepted"
            value={val(deal.sellerAccepted)}
            highlight={
              deal.sellerAccepted === "Yes"
                ? "ddm-positive"
                : deal.sellerAccepted === "No" &&
                    deal.offerStatus !== "Not Sent"
                  ? "ddm-negative"
                  : ""
            }
          />
        </Section>

        {deal.assigned === "Yes" && (
          <Section title="Assignment">
            <Cell
              label="Assigned Price"
              value={currencyVal(deal.assignedPrice)}
            />
            <Cell label="Buyer Name" value={val(deal.buyerName)} />
            <Cell label="Buyer Email" value={val(deal.buyerEmail)} wide />
          </Section>
        )}

        {deal.closed === "Yes" && (
          <Section title="Closing">
            <Cell label="Closed On" value={val(deal.closedDate)} />
            <Cell
              label="Gross Revenue"
              value={grossRevenue > 0 ? currency(grossRevenue) : "—"}
              highlight="ddm-positive"
            />
          </Section>
        )}

        {deal.notes && (
          <div className="ddm-section">
            <div className="ddm-section-label">Notes</div>
            <p className="ddm-notes">{deal.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DealDetailModal;
