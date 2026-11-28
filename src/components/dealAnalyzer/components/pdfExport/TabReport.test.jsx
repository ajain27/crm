import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderElementToPdfAssets } from "../../../../utils/pdfExport";
import NovationTab from "../novation/NovationTab";
import { visibleSections } from "./TabReport";
import { rentalReportProps } from "../rental/rentalReport";
import { compsReportProps } from "../findComps/FindCompsTab";

vi.mock("../../../../utils/pdfExport", () => ({
  renderElementToPdfAssets: vi.fn(),
  downloadPdfBlob: vi.fn(),
}));

const TAB = { eyebrow: "", title: "Novation", description: "", prompts: [] };

describe("TabReport", () => {
  let reportText = "";
  beforeEach(() => {
    reportText = "";
    renderElementToPdfAssets.mockImplementation(async (el) => {
      reportText = el?.textContent || "";
      return {
        blob: new Blob(["pdf"]),
        imgDataUrl: "data:image/jpeg;base64,x",
      };
    });
  });

  it("turns a tab's results into a report and previews it", async () => {
    render(<NovationTab tab={TAB} />);
    const type = (label, value) =>
      fireEvent.change(screen.getByLabelText(label, { exact: false }), {
        target: { value },
      });
    type("ARV", "200000");
    type("Repairs", "20000");
    type("Assignment Fee", "10000");
    fireEvent.click(
      screen.getByRole("button", { name: "Calculate Offer Price" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Generate Report/ }));

    await waitFor(() => expect(renderElementToPdfAssets).toHaveBeenCalled());
    expect(reportText).toContain("Novation Deal Summary");
    expect(reportText).toContain("Offer Price$150,000");
    expect(reportText).toContain("Agent Commissions (6%)$12,000");
    expect(await screen.findByAltText(/report preview/i)).toBeInTheDocument();
  });

  it("leaves out empty rows and sections", () => {
    expect(
      visibleSections([
        { title: "A", rows: [{ label: "x", value: null }, false] },
        { title: "B", rows: [{ label: "y", value: "$1" }] },
      ]),
    ).toEqual([{ title: "B", rows: [{ label: "y", value: "$1" }] }]);
  });

  it("builds a rental report, HELOC rows only for HELOC", () => {
    const summary = {
      monthlyRent: 1500,
      propMgmtFee: 150,
      monthlyInsurance: 100,
      monthlyTaxes: 0,
      annualMiscExpense: 0,
      monthlyMiscExpense: 0,
      monthlyHomeWarranty: 0,
      monthlyHoa: 0,
      totalMonthlyExpenses: 650,
      helocPayment: 400,
      helocInterestRatePct: 8,
      helocTermYears: 10,
      purchasePrice: 100000,
      closingCosts: 2000,
      agentCommissionAmt: 0,
      inspectionCost: 375,
      sellerCarryback: 0,
      totalFundsNeeded: 2375,
      monthlyCashFlow: 850,
      annualCashFlow: 10200,
      cashOnCash: 12.3,
      capRate: 9.1,
      dscr: 1.5,
    };
    const labels = (props) =>
      visibleSections(props.sections).flatMap((s) =>
        s.rows.map((r) => r.label),
      );
    const heloc = labels(
      rentalReportProps(summary, { heloc: true, propMgmtPct: 10 }),
    );
    const cash = labels(rentalReportProps(summary, { propMgmtPct: 10 }));
    expect(heloc).toContain("HELOC Payment (8%, 10 yr)");
    expect(heloc).toContain("DSCR");
    expect(cash).not.toContain("DSCR");
    expect(cash).not.toContain("Property Taxes");
  });

  it("lists every comp in the comps report, not just one page", () => {
    const comps = Array.from({ length: 7 }, (_, i) => ({
      id: i,
      formattedAddress: `${i} Main St`,
      price: 100000 + i,
      status: "Sold",
      bedrooms: 3,
    }));
    const props = compsReportProps(
      { price: 150000, comparables: comps },
      { formattedAddress: "1 Subject Rd", bedrooms: 3, bathrooms: 2 },
      "",
    );
    const [property, compSection] = visibleSections(props.sections);
    expect(property.rows[1]).toEqual({ label: "Facts", value: "3 bd · 2 ba" });
    expect(compSection.title).toBe("Comparable Sales (7)");
    expect(compSection.rows[0]).toEqual({
      label: "1. 0 Main St",
      value: "$100,000 · Sold · 3 bd",
    });
  });
});
