import { useState } from "react";
import FixAndFlipTab from "./fixAndFlip/FixAndFlipTab";
import SellerFinanceTab from "./sellerFinance/SellerFinanceTab";
import SubToTab from "./subTo/SubToTab";

const analyzerTabs = [
  {
    id: "subto",
    label: "Sub-To",
    eyebrow: "Creative Finance",
    title: "Subject-to deal review",
    description:
      "Break down takeover terms, seller pain points, and the financing structure you need to validate before moving forward.",
    prompts: [
      "Existing loan balance, interest rate, and monthly payment",
      "Seller cash needed at closing and arrears to cure",
      "Exit path: hold, wrap, or novation strategy",
    ],
  },
  {
    id: "fix-flip",
    label: "Fix N Flip",
    eyebrow: "Rehab Analysis",
    title: "Renovation profit check",
    description:
      "Pressure-test your acquisition, construction, and resale assumptions before committing to the project.",
    prompts: [
      "ARV support from nearby sold comps",
      "Rehab scope, timeline, and contingency budget",
      "Holding costs, closing costs, and target margin",
    ],
  },
  {
    id: "seller-finance",
    label: "Seller Finance",
    eyebrow: "Structured Terms",
    title: "Owner-finance offer builder",
    description:
      "Map the terms package that keeps the seller comfortable while preserving your monthly spread and long-term equity position.",
    prompts: [
      "Down payment, interest rate, balloon, and amortization",
      "Monthly payment target versus rent or resale strategy",
      "Risk review: taxes, insurance, and servicing structure",
    ],
  },
];

function DealAnalyzer() {
  const [activeTab, setActiveTab] = useState("subto");
  const currentTab =
    analyzerTabs.find((tab) => tab.id === activeTab) || analyzerTabs[0];

  return (
    <>
      <header className="page-header" data-reveal>
        <div>
          <h1>Deal Analyzer</h1>
          <span>
            Review different deal structures and pressure-test the numbers before
            you make an offer.
          </span>
        </div>
      </header>

      <section
        className="panel deal-analyzer-panel"
        data-reveal="left"
        style={{ "--reveal-delay": "80ms" }}
      >
        <div className="deal-analyzer-tabs" role="tablist" aria-label="Deal types">
          {analyzerTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`deal-analyzer-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="deal-analyzer-content">
          {activeTab === "subto" && <SubToTab tab={currentTab} />}
          {activeTab === "fix-flip" && <FixAndFlipTab tab={currentTab} />}
          {activeTab === "seller-finance" && (
            <SellerFinanceTab tab={currentTab} />
          )}
        </div>
      </section>
    </>
  );
}

export default DealAnalyzer;
