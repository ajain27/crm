import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WholesaleOfferPdfTemplate from "./WholesaleOfferPdfTemplate";
import AssignmentPdfTemplate from "./AssignmentPdfTemplate";
import JvAgreementPdfTemplate from "./JvAgreementPdfTemplate";
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
