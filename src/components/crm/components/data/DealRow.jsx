import {
  ReadOnlyCell,
  AccordionHeaderCell,
  Badge,
} from "../../../elements/elements";
import { currency } from "../../../../utils/utils";
import {
  EmailCell,
  NotesCell,
  PhoneCell,
} from "../../../leads/components/LeadTableCells";
import { dealLeadDetail, isDealRejected, isDealWithdrawn } from "../crmConfig";

function formatFullAddress(deal) {
  const stateZip = [deal.state, deal.zipCode].filter(Boolean).join(" ");
  return [deal.address, deal.city, stateZip].filter(Boolean).join(", ");
}

function DealRow({ deal, index, onRowDetailClick }) {
  const isRejected = isDealRejected(deal);
  // Made inactive by hand: greyed out like a withdrawn offer.
  const isWithdrawn = isDealWithdrawn(deal) || deal.inactive === true;

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

  // On smaller screens the address heads a card that opens to show the
  // rest; a click anywhere else (or on the table row) opens the deal.
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
        card={{ title: sellerName, subtitle: formatFullAddress(deal) }}
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
      {/* The seller heads the card, so only the table shows this. */}
      <td className="acc-col-hide-mobile" data-label="Seller">
        <span className="readonly-input">{sellerName || "—"}</span>
      </td>
      {/* Card-only, like the address and notes below. */}
      <EmailCell
        className="acc-col-card-only dt-card-contact"
        email={dealLeadDetail(deal, "sellerEmail")}
      />
      <PhoneCell
        className="dt-card-contact"
        phones={[
          deal.sellerPhone || deal.agentPhone,
          ...(deal.sellerPhones || []),
        ]}
      />
      {/* Card-only (an open card reads like a lead's): the address and the
          full notes. */}
      <td className="acc-col-card-only dt-card-contact" data-label="Address">
        {formatFullAddress(deal) || "—"}
      </td>
      <NotesCell className="acc-col-card-only" notes={deal.notes} />
    </tr>
  );
}

export default DealRow;
