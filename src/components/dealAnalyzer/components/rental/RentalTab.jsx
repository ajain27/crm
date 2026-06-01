import { useState } from "react";
import RentalCashTab from "./RentalCashTab";
import RentalDSCRTab from "./RentalDSCRTab";
import RentalHELOCTab from "./RentalHELOCTab";

function RentalTab({ tab }) {
  const [financeType, setFinanceType] = useState("cash");

  function switchFinanceType(type) {
    setFinanceType(type);
  }

  return (
    <>
      <div className="deal-analyzer-hero">
        <span className="deal-analyzer-eyebrow">{tab.eyebrow}</span>
        <h2>{tab.title}</h2>
        <p>{tab.description}</p>
      </div>

      <div
        className="deal-analyzer-cards"
        data-reveal-group
        style={{ "--reveal-delay": "120ms" }}
      >
        {tab.prompts.map((prompt) => (
          <article key={prompt} className="deal-analyzer-card">
            <strong>Review Focus</strong>
            <p>{prompt}</p>
          </article>
        ))}
      </div>

      <div
        className="deal-analyzer-section-label"
        style={{ textAlign: "center" }}
      >
        Purchase Type
      </div>
      <div
        className="deal-tab-bar"
        style={{
          padding: "0 0 1rem 0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          className={`deal-tab-btn${financeType === "cash" ? " deal-tab-btn--active" : ""}`}
          onClick={() => switchFinanceType("cash")}
        >
          Cash
        </button>
        <button
          type="button"
          className={`deal-tab-btn${financeType === "loan" ? " deal-tab-btn--active" : ""}`}
          onClick={() => switchFinanceType("loan")}
        >
          Loan (DSCR)
        </button>
        <button
          type="button"
          className={`deal-tab-btn${financeType === "heloc" ? " deal-tab-btn--active" : ""}`}
          onClick={() => switchFinanceType("heloc")}
        >
          HELOC
        </button>
      </div>

      {financeType === "cash" && <RentalCashTab />}
      {financeType === "loan" && <RentalDSCRTab />}
      {financeType === "heloc" && <RentalHELOCTab />}
    </>
  );
}

export default RentalTab;
