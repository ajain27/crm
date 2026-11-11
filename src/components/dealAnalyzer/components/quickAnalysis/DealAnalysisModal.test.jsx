import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DealAnalysisModal from "./DealAnalysisModal";
import {
  downloadPdfBlob,
  renderElementToPdfAssets,
} from "../../../../utils/pdfExport";
import { clearPhotoCache } from "../../../elements/photos/photoCache";
import { reportContact, reportFilename } from "./leadReport";

vi.mock("../../../../utils/pdfExport", () => ({
  renderElementToPdfAssets: vi.fn(),
  downloadPdfBlob: vi.fn(),
}));

const lead = {
  id: "l1",
  address: "6212 N 45th St, Tampa, FL 33610",
  firstName: "Ann",
  lastName: "Bell",
  phone: "813-555-0100",
  source: "PPL",
  askingPrice: "120000",
  compsResult: {
    runAt: "2026-11-01T00:00:00Z",
    arvEstimate: 184672,
    valueEstimates: { zestimate: 163600, redfinEstimate: 170000 },
    property: { beds: 3, baths: 2, sqft: 1200, yearBuilt: 1958 },
    topComps: [
      {
        address: "6100 N 44th St, Tampa, FL",
        price: 210000,
        beds: 3,
        baths: 2,
        sqft: 1300,
        soldDate: "2026-09-12",
        distance: 0.21,
        condition: "renovated",
      },
    ],
    otherSales: [
      {
        address: "5810 N 31st St, Tampa, FL",
        price: 135000,
        soldDate: "2026-04-02",
        reason: "Distressed sale (foreclosure)",
      },
    ],
    summary: "Only the renovated comps set the ARV.",
  },
};

describe("DealAnalysisModal report", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearPhotoCache();
  });

  it("shows a report with the photo, comps and numbers, to download from there", async () => {
    const photoStore = {
      fetch: vi.fn().mockResolvedValue({ data: "data:image/jpeg;base64,AAA" }),
    };
    let captured;
    renderElementToPdfAssets.mockImplementation(async (el) => {
      captured = el.cloneNode(true);
      return {
        blob: new Blob(["pdf"]),
        imgDataUrl: "data:image/jpeg;base64,RPT",
      };
    });
    render(
      <DealAnalysisModal
        isOpen
        onClose={() => {}}
        item={lead}
        address={lead.address}
        photoStore={photoStore}
        ownerId="l1"
        photos={[{ id: "p1" }]}
      />,
    );
    // The ARV comes from the comps when the lead has none.
    expect(screen.getByLabelText("ARV")).toHaveValue("$184,672");
    fireEvent.click(screen.getByRole("radio", { name: /Average/ }));
    fireEvent.change(screen.getByLabelText("Repair cost"), {
      target: { value: "30000" },
    });
    fireEvent.change(screen.getByLabelText("Novation fee"), {
      target: { value: "20000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "View report" }));

    // Shown first; nothing is saved until Download PDF.
    const preview = await screen.findByAltText("Report preview");
    expect(preview).toHaveAttribute("src", "data:image/jpeg;base64,RPT");
    expect(downloadPdfBlob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(downloadPdfBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      "property-report-6212-n-45th-st",
    );
    expect(photoStore.fetch).toHaveBeenCalledWith("l1", "p1");
    expect(captured.querySelector(".lr-photo").style.backgroundImage).toContain(
      "data:image/jpeg;base64,AAA",
    );
    const text = captured.textContent;
    expect(text).toContain("6212 N 45th St, Tampa, FL 33610");
    expect(text).toContain("Ann Bell");
    expect(text).toContain("6100 N 44th St, Tampa, FL");
    expect(text).toContain("Renovated");
    expect(text).toContain("$163,600");
    // MAO: 184,672 − 30% − 30,000 − 10,000.
    expect(text).toContain("$89,270");
    // Novation: 184,672 × 90% − 30,000 − 20,000 (its own fee).
    expect(text).toContain("$116,205");
    expect(text).toContain("Offer to seller");
    expect(text).toContain("Only the renovated comps set the ARV.");
    // Every sale looked at, and why the others weren't used.
    expect(text).toContain("5810 N 31st St, Tampa, FL");
    expect(text).toContain("Distressed sale (foreclosure)");
    // Cash vs. novation, with charts.
    expect(text).toContain("Cash offer (MAO)");
    expect(captured.querySelectorAll(".lr-donut-svg")).toHaveLength(2);
    expect(captured.querySelectorAll(".lr-bar-row").length).toBeGreaterThan(4);
    // The report is only in the page while it's captured.
    expect(document.querySelector(".lr-hero")).toBeNull();
  });

  it("says when the report can't be made", async () => {
    renderElementToPdfAssets.mockRejectedValue(new Error("canvas"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(
      <DealAnalysisModal
        isOpen
        onClose={() => {}}
        item={lead}
        address={lead.address}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View report" }));
    expect(
      await screen.findByText("Couldn't make the report. Try again."),
    ).toBeInTheDocument();
    expect(downloadPdfBlob).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("leadReport", () => {
  it("lists the seller's details from a lead or a deal, phones once each", () => {
    expect(
      reportContact({
        sellerFirstName: "Sam",
        sellerLastName: "Lee",
        sellerPhone: "(313) 274-5192",
        sellerPhones: ["313-274-5192", "727-785-9729"],
        sellerEmail: "sam@x.com",
      }),
    ).toEqual([
      ["Seller", "Sam Lee"],
      ["Phone", "313-274-5192, 727-785-9729"],
      ["Email", "sam@x.com"],
    ]);
  });

  it("names the file after the street", () => {
    expect(reportFilename("4332 W Cortez St, Phoenix, AZ")).toBe(
      "property-report-4332-w-cortez-st",
    );
    expect(reportFilename("")).toBe("property-report");
  });
});
