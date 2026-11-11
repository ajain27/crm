import { CopyButton, TextLink } from "../components/LeadTableCells";
import { displayPhone } from "../../../utils/utils";
import { PHONE_NUMBER } from "./countyRecordDeal";

// Phone text as tap-to-call links, each with a text link. Every number in
// it is linked (some exports put several in one cell); other text stays as
// is. `textBody` prefills the text message, as on deals and leads.
export default function PhoneLinks({ value, textBody }) {
  const text = String(value || "");
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(PHONE_NUMBER)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <span key={match.index} className="leads-phone">
        <a
          href={`tel:${match[0].replace(/[^\d+]/g, "")}`}
          className="leads-contact-link"
          onClick={(e) => e.stopPropagation()}
        >
          {displayPhone(match[0])}
        </a>
        <TextLink phone={match[0]} body={textBody} />
        <CopyButton text={displayPhone(match[0])} label={`Copy ${match[0]}`} />
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
