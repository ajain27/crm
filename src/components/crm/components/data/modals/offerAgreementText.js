import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import WholesaleOfferPdfTemplate, {
  additionalClauseNumber,
} from "./WholesaleOfferPdfTemplate";
import CommercialOfferPdfTemplate, {
  COMMERCIAL_ADDITIONAL_CLAUSE_NUMBER,
} from "./CommercialOfferPdfTemplate";

// The headings, rows and paragraphs of an agreement, one per line.
const ROWS = ".oa-pdf-field-row, [role='row']";
const BLOCKS = `h1, h2, h3, p, ${ROWS}`;

// The text of the offer that would be generated with these options
// (without an added clause), and the section number an added clause
// gets, so the clause can be written to fit the agreement: it can refer
// to its sections by number and say which one controls where they differ.
export function offerAgreementText(options) {
  const commercial = !!options.commercial;
  const template = commercial
    ? CommercialOfferPdfTemplate
    : WholesaleOfferPdfTemplate;
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        createElement(template, {
          ...options,
          additionalClause: null,
          inline: true,
        }),
      ),
    );
    const blocks = [...host.querySelectorAll(BLOCKS)];
    const text = blocks
      // A block inside another (a paragraph in a row) is read with it.
      .filter((el) => !blocks.some((b) => b !== el && b.contains(el)))
      // A row's cells (a label and its value) are kept apart.
      .map((el) =>
        (el.matches(ROWS)
          ? [...el.children].map((c) => c.textContent).join(" | ")
          : el.textContent
        )
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .join("\n");
    return {
      agreement: text,
      sectionNumber: commercial
        ? COMMERCIAL_ADDITIONAL_CLAUSE_NUMBER
        : additionalClauseNumber(options.allowAssignment !== false),
    };
  } finally {
    root.unmount();
  }
}
