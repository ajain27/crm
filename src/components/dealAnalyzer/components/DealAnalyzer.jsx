import { useState } from "react";
import FixAndFlipTab from "./fixAndFlip/FixAndFlipTab";
import SubToTab from "./subTo/SubToTab";
import WholesaleTab from "./wholesale/WholesaleTab";
import MultiFamilyTab from "./multiFamily/MultiFamilyTab";
import NovationTab from "./novation/NovationTab";
import RentalTab from "./rental/RentalTab";
import FindCompsTab from "./findComps/FindCompsTab";

const analyzerTabs = [
  {
    id: "wholesale",
    label: "Wholesale",
    eyebrow: "Wholesale Analysis",
    title: "MAO calculator",
    description:
      "Calculate the Maximum Allowable Offer based on ARV, rehab costs, your wholesale fee, and the buyer's target profit.",
    prompts: [
      "Confirm ARV with recent sold comps",
      "Verify rehab scope and cost estimates",
      "Align wholesale fee with your buyers list expectations",
    ],
  },
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
    id: "multi-family",
    label: "Multi-Family",
    eyebrow: "Multi-Family Analysis",
    title: "Rental income & returns",
    description:
      "Analyze NOI, cap rate, cash flow, and cash-on-cash return to evaluate a multi-family acquisition.",
    prompts: [
      "Confirm rents with local comps and current leases",
      "Account for vacancy, management, and maintenance costs",
      "Stress-test cash flow at higher vacancy rates",
    ],
  },
  {
    id: "novation",
    label: "Novation",
    eyebrow: "Novation Analysis",
    title: "List price profit check",
    description:
      "Analyze the spread between your contract price and the list price after accounting for selling costs and holding expenses.",
    prompts: [
      "Confirm list price with recent sold comps",
      "Verify agent commission and closing cost estimates",
      "Account for holding period and monthly carrying costs",
    ],
  },
  {
    id: "rental",
    label: "Rental",
    eyebrow: "Rental Analysis",
    title: "Cash flow & returns",
    description:
      "Evaluate a rental property's monthly cash flow, DSCR, cap rate, and cash-on-cash return using DSCR financing.",
    prompts: [
      "Verify rent estimate with local market comps",
      "Confirm DSCR rate and confirm the lender's qualifying ratio",
      "Account for vacancy, maintenance, and management costs",
    ],
  },
  {
    id: "find-comps",
    label: "Find Comps",
    eyebrow: "Comparable Sales",
    title: "Find property comps",
    description:
      "Search for comparable sold properties and After Repair Value estimates to validate your deal numbers before making an offer.",
    prompts: [
      "Use sold comps within 0.5 miles and last 6 months",
      "Match bed/bath count and similar square footage",
      "Adjust for condition, lot size, and location differences",
    ],
  },
];

function DealAnalyzer() {
  const [activeTab, setActiveTab] = useState("wholesale");
  const currentTab =
    analyzerTabs.find((tab) => tab.id === activeTab) || analyzerTabs[0];

  return (
    <>
      <header className="page-header" data-reveal>
        <div>
          <h1>Deal Analyzer</h1>
          <span>
            Review different deal structures and pressure-test the numbers
            before you make an offer.
          </span>
        </div>
      </header>

      <section
        className="panel deal-analyzer-panel"
        data-reveal="left"
        style={{ "--reveal-delay": "80ms" }}
      >
        <div
          className="deal-analyzer-tabs"
          role="tablist"
          aria-label="Deal types"
        >
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
          {activeTab === "wholesale" && <WholesaleTab tab={currentTab} />}
          {activeTab === "subto" && <SubToTab tab={currentTab} />}
          {activeTab === "fix-flip" && <FixAndFlipTab tab={currentTab} />}
          {activeTab === "multi-family" && <MultiFamilyTab tab={currentTab} />}
          {activeTab === "novation" && <NovationTab tab={currentTab} />}
          {activeTab === "rental" && <RentalTab tab={currentTab} />}
          {activeTab === "find-comps" && <FindCompsTab tab={currentTab} />}
        </div>
      </section>
    </>
  );
}

export default DealAnalyzer;
