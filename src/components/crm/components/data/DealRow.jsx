import {
  ReadOnlyCell,
  AccordionHeaderCell,
  Badge,
} from "../../../elements/elements";
import { currency } from "../../../../utils/utils";
import { PhoneLink } from "../../../leads/components/LeadTableCells";

function formatFullAddress(deal) {
  const stateZip = [deal.state, deal.zipCode].filter(Boolean).join(" ");
  return [deal.address, deal.city, stateZip].filter(Boolean).join(", ");
}

function DealRow({ deal, index, onRowDetailClick }) {
  const isRejected =
    (deal.offerStatus || "Not Sent") === "Offer Sent" &&
    (deal.sellerAccepted || "No") === "No";
  const isWithdrawn = (deal.offerStatus || "Not Sent") === "Offer Withdrawn";

  // Expressed as a data attribute (not a className) so the row's React-controlled
  // className stays constant and never clobbers the imperatively-added
  // `is-revealed` reveal class when the deal's status changes.
  const rowStatus =
    (deal.closed || "No") === "Yes"
      ? "closed"
      : isRejected
        ? "rejected"
        : isWithdrawn
          ? "withdrawn"
          : undefined;

  const sellerName = [deal.sellerFirstName, deal.sellerLastName]
    .filter(Boolean)
    .join(" ");

  function handleTrClick(e) {
    const tag = e.target.tagName.toLowerCase();
    if (["button", "svg", "path"].includes(tag)) return;
    onRowDetailClick(deal);
  }

  return (
    <tr
      data-deal-id={deal.id}
      data-reveal
      data-status={rowStatus}
      style={{ "--reveal-delay": `${index * 35}ms` }}
      className="clickable-row"
      onClick={handleTrClick}
    >
      <AccordionHeaderCell
        id={deal.id}
        label="Address"
        value={formatFullAddress(deal)}
        valueClassName="readonly-input addr-cell"
        onHeaderClick={() => onRowDetailClick(deal)}
      />
      <ReadOnlyCell value={deal.arv ? currency(deal.arv) : "—"} label="ARV" />
      <ReadOnlyCell value={deal.mao ? currency(deal.mao) : "—"} label="MAO" />
      <ReadOnlyCell
        value={deal.rehabCost ? currency(deal.rehabCost) : "—"}
        label="Rehab"
      />
      <td data-label="Offer Sent">
        <Badge value={deal.offerStatus || "Not Sent"} />
      </td>
      <ReadOnlyCell value={sellerName || "—"} label="Seller" />
      <td
        data-label="Phone"
        className="dt-col-action"
        onClick={(e) => e.stopPropagation()}
      >
        <PhoneLink phone={deal.sellerPhone || deal.agentPhone} />
      </td>
    </tr>
  );
}

export default DealRow;
