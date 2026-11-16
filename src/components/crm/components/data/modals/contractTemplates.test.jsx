import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WholesaleOfferPdfTemplate from "./WholesaleOfferPdfTemplate";
import AssignmentPdfTemplate from "./AssignmentPdfTemplate";
import JvAgreementPdfTemplate from "./JvAgreementPdfTemplate";
import MutualReleasePdfTemplate, {
  EMD_OTHER,
  EMD_REFUND,
} from "./MutualReleasePdfTemplate";
import OfferAgreementPdfTemplate from "../../../../dealAnalyzer/components/sellerFinance/OfferAgreementPdfTemplate";

const today = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// The templates portal into document.body.
const signatures = () =>
  [...document.querySelectorAll(".oa-pdf-sig-script")].map((el) =>
    el.textContent.trim(),
  );
const dateLines = () =>
  [...document.querySelectorAll(".oa-pdf-sig-line")]
    .filter((el) => /date/i.test(el.textContent))
    .map((el) => el.querySelector(".oa-pdf-sig-value")?.textContent);

describe("contract templates", () => {
  it("purchase agreement: signed, dated today, one contact email", () => {
    const { unmount } = render(
      <WholesaleOfferPdfTemplate
        sellerName="Jane Doe"
        propertyAddress="1 Main St, Dallas, TX"
        purchasePrice={150000}
      />,
    );
    expect(signatures()).toEqual(["Ankit jain"]);
    expect(document.body).toHaveTextContent(`Effective Date:${today}`);
    expect(dateLines()).toEqual([today, today]);
    expect(document.body).toHaveTextContent("youwinestates@gmail.com");
    unmount();
  });

  it("purchase agreement with assignment: closing terms (a)–(f) with the closing timeline", () => {
    const { unmount } = render(
      <WholesaleOfferPdfTemplate
        sellerName="Jane Doe"
        propertyAddress="1 Main St, Dallas, TX"
        purchasePrice={150000}
        closingDays={30}
      />,
    );
    const text = document.body.textContent;
    expect(text).toContain(
      '(a) Closing Date. Closing shall occur on or before thirty (30) calendar days after the Effective Date (the "Closing Date").',
    );
    for (const heading of [
      "(b) Earnest Money.",
      "(c) Delays Not Caused by Either Party.",
      "(d) Seller's Failure to Close.",
      "(e) Buyer's Failure to Close.",
      "(f) Assignment and Release of EMD.",
    ]) {
      expect(text).toContain(heading);
    }
    expect(text).toContain(
      "it shall be refunded to Buyer in full under Section 3(c), Section 3(d), or Section 8.",
    );
    expect(text).toContain("extended by up to fifteen (15) calendar days");
    expect(text).toContain(
      "escrow/title agent within three (3) business days after the Effective Date.",
    );
    expect(text).toContain("Any assignment or novation under Section 6");
    expect(text).not.toContain("Targeted Closing Date");
    unmount();
  });

  it("purchase agreement without assignment: the EMD goes hard if Buyer can't close after inspection", () => {
    const { unmount } = render(
      <WholesaleOfferPdfTemplate
        sellerName="Jane Doe"
        propertyAddress="1 Main St, Dallas, TX"
        purchasePrice={150000}
        allowAssignment={false}
      />,
    );
    const text = document.body.textContent;
    expect(text).toContain(
      "due to closing administrative delays or title defects not caused by Buyer",
    );
    expect(text).toContain(
      'However, if Buyer is unable to close within the twenty-one (21) day timeframe and the Inspection Period has expired without Buyer terminating this Agreement, the Earnest Money Deposit shall be non-refundable ("hard"), Buyer shall not be entitled to any refund, and the Earnest Money Deposit shall be released to Seller.',
    );
    expect(text).not.toContain("or if the Buyer is unable to close");
    unmount();
  });

  it("assignment: names the seller, signed and dated today", () => {
    const { unmount } = render(
      <AssignmentPdfTemplate
        assigneeName="Acme Homes LLC"
        sellerName="Jane Doe"
        propertyAddress="1 Main St, Dallas, TX"
        assignedPrice={180000}
      />,
    );
    expect(document.body).toHaveTextContent("Seller Name(s):Jane Doe");
    expect(signatures()).toEqual(["Ankit jain"]);
    expect(dateLines()).toEqual([today, today]);
    unmount();
  });

  it("mutual release: fills in the deal, checks the EMD choice, buyer signs, both dated today", () => {
    const { unmount } = render(
      <MutualReleasePdfTemplate
        sellerName="Jane Doe"
        propertyAddress="1 Main St, Dallas, TX"
        agreementDate="2026-09-05"
        escrowNumber="ESC-123"
        emdHandling={EMD_REFUND}
        emdAmount={500}
      />,
    );
    const text = document.body.textContent;
    expect(text).toContain("MUTUAL RELEASE & CANCELLATION AGREEMENT");
    expect(text).toContain("Seller Name(s):Jane Doe");
    expect(text).toContain("Buyer Name:You Win Estates, and/or assigns");
    expect(text).toContain("Property Address:1 Main St, Dallas, TX");
    expect(text).toContain("Agreement Date:September 5, 2026");
    expect(text).toContain("Escrow / File No.:ESC-123");
    expect(text).toContain("The EMD of $500.00 shall be refunded");
    const checked = [...document.querySelectorAll(".mr-pdf-check-box")].map(
      (el) => el.textContent,
    );
    expect(checked).toEqual(["", "X", ""]);
    expect(text).toContain("Jane DoePrinted Name");
    expect(text).toContain("11. GENERAL PROVISIONS");
    // The Buyer signs it; both signature dates are today.
    expect(signatures()).toEqual(["Ankit jain", "AJ"]);
    expect(dateLines()).toEqual([today, today]);
    unmount();
  });

  it("mutual release: writes in an 'other' EMD arrangement", () => {
    const { unmount } = render(
      <MutualReleasePdfTemplate
        sellerName="Jane Doe"
        propertyAddress="1 Main St"
        emdHandling={EMD_OTHER}
        emdOther="Released to Seller"
      />,
    );
    expect(document.body).toHaveTextContent("Other: Released to Seller");
    expect(
      [...document.querySelectorAll(".mr-pdf-check-box")].map(
        (el) => el.textContent,
      ),
    ).toEqual(["", "", "X"]);
    unmount();
  });

  it("JV agreement: has the title / escrow company row, signed and dated", () => {
    const { unmount } = render(
      <JvAgreementPdfTemplate
        partnerName="Partner LLC"
        propertyAddress="1 Main St, Dallas, TX"
        titleCompany="First Title"
        contractPrice={150000}
        assignedPrice={170000}
        jvSplit={5000}
      />,
    );
    expect(document.body).toHaveTextContent(
      "Title / Escrow Company:First Title",
    );
    expect(signatures()).toEqual(["Ankit jain"]);
    expect(dateLines()).toEqual([today, today]);
    unmount();
  });

  it("seller-finance agreement: signed and dated today", () => {
    const { unmount } = render(<OfferAgreementPdfTemplate summary={{}} />);
    expect(signatures()).toEqual(["Ankit jain"]);
    expect(dateLines()).toEqual([today, today]);
    unmount();
  });
});
