import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import Modal from "../../../modal/Modal";
import ModalActions, { ActionButton } from "../../../elements/ModalActions";
import { leadComps } from "../../../leads/comps/leadComps";
import {
  downloadPdfBlob,
  renderElementToPdfAssets,
} from "../../../../utils/pdfExport";
import LeadReportPdf from "./LeadReportPdf";
import PdfReportPreviewModal from "../pdfExport/PdfReportPreviewModal";
import { loadFrontImage, reportContact, reportFilename } from "./leadReport";
import CurrencyInput from "../../../elements/CurrencyInput";
import { parseCurrency } from "../../../../utils/utils";
import {
  analysisDefaults,
  estimateRepairs,
  novationNumbers,
  NOVATION_RESERVE,
  wholesaleNumbers,
} from "./quickAnalysis";
import "./DealAnalysisModal.css";

// The work a property can need, as the Analyze window asks it.
const WORK_OPTIONS = [
  { value: "no-rehab", label: "None", hint: "Move-in ready" },
  { value: "light", label: "Light", hint: "Carpet and paint" },
  { value: "average", label: "Average", hint: "Plus kitchen and baths" },
  { value: "heavy", label: "Heavy", hint: "Gut job: roof, siding, windows" },
];

function money(n) {
  const rounded = Math.round(n);
  return `${rounded < 0 ? "−" : ""}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

// One line of a breakdown: "− Repairs   $40,000".
function Line({ label, value, sign, total }) {
  return (
    <div className={`qa-line${total ? " qa-line--total" : ""}`}>
      <span>
        {sign && <span className="qa-sign">{sign}</span>}
        {label}
      </span>
      <strong>{money(value)}</strong>
    </div>
  );
}

// Where the ARV goes, as a bar: the seller's share, then each cost.
function SplitBar({ arv, parts }) {
  if (!(arv > 0)) return null;
  return (
    <div className="qa-bar" aria-hidden="true">
      {parts
        .filter((part) => part.value > 0)
        .map((part) => (
          <span
            key={part.label}
            className={`qa-bar-part qa-bar-part--${part.tone}`}
            style={{ width: `${(part.value / arv) * 100}%` }}
            title={`${part.label}: ${money(part.value)}`}
          />
        ))}
    </div>
  );
}

// How the offer compares with what the seller is asking.
function AskingNote({ offer, askingPrice }) {
  if (!(askingPrice > 0)) return null;
  const gap = offer - askingPrice;
  return (
    <p
      className={`qa-asking ${gap >= 0 ? "qa-asking--ok" : "qa-asking--short"}`}
    >
      Seller asks {money(askingPrice)}:{" "}
      {gap >= 0
        ? `${money(gap)} of room under this offer.`
        : `${money(-gap)} more than this offer.`}
    </p>
  );
}

function ResultCard({
  title,
  offerLabel,
  offer,
  lines,
  bar,
  askingPrice,
  footer,
}) {
  return (
    <section className="qa-card" aria-label={title}>
      <header className="qa-card-head">
        <span className="qa-card-title">{title}</span>
        <span className="qa-card-offer-label">{offerLabel}</span>
        <strong className={`qa-card-offer${offer < 0 ? " qa-negative" : ""}`}>
          {money(offer)}
        </strong>
      </header>
      {bar}
      <div className="qa-lines">{lines}</div>
      {offer < 0 && (
        <p className="qa-asking qa-asking--short">
          The numbers don&apos;t work at this ARV.
        </p>
      )}
      {offer >= 0 && <AskingNote offer={offer} askingPrice={askingPrice} />}
      {footer}
    </section>
  );
}

// Analyze a deal or lead from its window: asks how much work the property
// needs and what it'll cost, then lays out the wholesale and novation
// numbers from its ARV. `item` is the deal or lead (its draft).
// View report shows a PDF report of the property with its comps and these
// numbers, to download from there; its front picture is the item's main photo (`photos[0]` from
// `photoStore`, owned by `ownerId`), else Street View.
export default function DealAnalysisModal({
  isOpen,
  onClose,
  item,
  address,
  photoStore,
  ownerId,
  photos,
}) {
  const [defaults] = useState(() => analysisDefaults(item));
  const [arv, setArv] = useState(defaults.arv ? String(defaults.arv) : "");
  const [rehabType, setRehabType] = useState(defaults.rehabType);
  const [repairCost, setRepairCost] = useState(
    defaults.repairCost === "" ? "" : String(defaults.repairCost),
  );
  // Each strategy has its own fee: what you'd make on a cash offer
  // (assigned to a buyer) and on a novation.
  const [cashFee, setCashFee] = useState(String(defaults.wholesaleFee));
  const [novationFee, setNovationFee] = useState(String(defaults.novationFee));
  const [buyersProfit, setBuyersProfit] = useState(
    String(defaults.buyersProfitPct),
  );

  const estimate = rehabType
    ? estimateRepairs(rehabType, defaults.sqft, defaults.state)
    : null;
  // The cost typed in, else the estimate for the work picked.
  const repairs =
    repairCost.trim() !== ""
      ? parseCurrency(repairCost)
      : rehabType === "no-rehab"
        ? 0
        : (estimate ?? 0);
  const answered =
    rehabType !== "" && (repairCost.trim() !== "" || estimate !== null);

  const inputs = {
    arv: parseCurrency(arv),
    repairs,
    cashFee: parseCurrency(cashFee),
    novationFee: parseCurrency(novationFee),
    buyersProfitPct: Math.min(99, Number(buyersProfit) || 0),
  };
  const wholesale = wholesaleNumbers({
    ...inputs,
    wholesaleFee: inputs.cashFee,
  });
  const novation = novationNumbers({
    ...inputs,
    wholesaleFee: inputs.novationFee,
  });
  const showNumbers = inputs.arv > 0 && answered;

  // The report, mounted off-screen only while it's being captured.
  const reportRef = useRef(null);
  const [report, setReport] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  // The finished report: { image } to show, { blob } to download.
  const [preview, setPreview] = useState(null);

  async function viewReport() {
    setReportBusy(true);
    setReportError("");
    try {
      const frontImage = await loadFrontImage({
        photoStore,
        ownerId,
        photos,
        address,
      });
      setReport({ frontImage });
      // Let the report render before it's captured.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const assets = await renderElementToPdfAssets(reportRef.current);
      if (!assets) throw new Error("Nothing to capture");
      setPreview({ image: assets.imgDataUrl, blob: assets.blob });
    } catch (err) {
      console.error("Property report failed", err);
      setReportError("Couldn't make the report. Try again.");
    } finally {
      setReport(null);
      setReportBusy(false);
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span className="qa-title">
            <span>Analyze Deal</span>
            {address && <span className="qa-title-address">{address}</span>}
          </span>
        }
        className="deal-analysis-modal"
        style={{ width: "min(1040px, 96vw)", maxWidth: "min(1040px, 96vw)" }}
        actions={
          <ModalActions
            start={
              reportError && (
                <span className="qa-report-error">{reportError}</span>
              )
            }
            end={
              <>
                <ActionButton label="Close" onClick={onClose} />
                <ActionButton
                  icon={FileText}
                  tone="primary"
                  label={reportBusy ? "Making report…" : "View report"}
                  onClick={viewReport}
                  disabled={reportBusy}
                  title="A PDF report of the property with its photo, comps and these numbers"
                />
              </>
            }
          />
        }
      >
        <div className="qa-body">
          <div className="qa-questions">
            <div className="qa-question">
              <span className="qa-question-label">
                How much work does the property need?
              </span>
              <div
                className="qa-work"
                role="radiogroup"
                aria-label="Work needed"
              >
                {WORK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={rehabType === option.value}
                    className={`qa-work-option${rehabType === option.value ? " is-active" : ""}`}
                    onClick={() => setRehabType(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="qa-question">
              <span className="qa-question-label">
                What will the work cost?
              </span>
              <CurrencyInput
                value={repairCost}
                onValueChange={setRepairCost}
                placeholder={estimate !== null ? money(estimate) : "$0"}
                aria-label="Repair cost"
              />
              <span className="qa-hint">
                {estimate !== null && rehabType !== "no-rehab"
                  ? `Estimate ${money(estimate)}${defaults.sqft ? ` for ${defaults.sqft.toLocaleString("en-US")} sq ft` : ""}; used when this is empty.`
                  : rehabType && rehabType !== "no-rehab"
                    ? "No estimate for this property; enter the cost."
                    : ""}
              </span>
            </label>

            <div className="qa-assumptions">
              <label className="qa-field">
                <span>ARV</span>
                <CurrencyInput
                  value={arv}
                  onValueChange={setArv}
                  aria-label="ARV"
                />
              </label>
              <label className="qa-field">
                <span>Cash offer fee</span>
                <CurrencyInput
                  value={cashFee}
                  onValueChange={setCashFee}
                  aria-label="Cash offer fee"
                />
              </label>
              <label className="qa-field">
                <span>Novation fee</span>
                <CurrencyInput
                  value={novationFee}
                  onValueChange={setNovationFee}
                  aria-label="Novation fee"
                />
              </label>
              <label className="qa-field">
                <span>Buyer&apos;s profit</span>
                <span className="qa-pct">
                  <input
                    inputMode="decimal"
                    value={buyersProfit}
                    onChange={(e) =>
                      setBuyersProfit(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    aria-label="Buyer's profit %"
                  />
                  <span>%</span>
                </span>
              </label>
            </div>
          </div>

          {report && (
            <LeadReportPdf
              ref={reportRef}
              address={address}
              frontImage={report.frontImage}
              contact={reportContact(item)}
              comps={leadComps(item)}
              askingPrice={defaults.askingPrice}
              analysis={
                showNumbers
                  ? {
                      inputs,
                      wholesale,
                      novation,
                      workLabel:
                        WORK_OPTIONS.find((o) => o.value === rehabType)
                          ?.label || "—",
                    }
                  : null
              }
            />
          )}
          {!(inputs.arv > 0) ? (
            <p className="qa-empty">Enter the ARV to see the numbers.</p>
          ) : !answered ? (
            <p className="qa-empty">
              Pick the work needed (and its cost) to see the wholesale and
              novation numbers.
            </p>
          ) : (
            <div className="qa-results">
              <ResultCard
                title="Wholesale"
                offerLabel="Max offer to the seller (MAO)"
                offer={wholesale.mao}
                askingPrice={defaults.askingPrice}
                bar={
                  <SplitBar
                    arv={wholesale.arv}
                    parts={[
                      { label: "Seller", value: wholesale.mao, tone: "offer" },
                      {
                        label: "Repairs",
                        value: wholesale.repairs,
                        tone: "repairs",
                      },
                      {
                        label: "Your fee",
                        value: wholesale.wholesaleFee,
                        tone: "fee",
                      },
                      {
                        label: "Buyer's profit",
                        value: wholesale.buyersProfit,
                        tone: "reserve",
                      },
                    ]}
                  />
                }
                lines={
                  <>
                    <Line label="ARV" value={wholesale.arv} />
                    <Line
                      sign="−"
                      label={`Buyer's profit (${inputs.buyersProfitPct}%)`}
                      value={wholesale.buyersProfit}
                    />
                    <Line sign="−" label="Repairs" value={wholesale.repairs} />
                    <Line
                      sign="−"
                      label="Your wholesale fee"
                      value={wholesale.wholesaleFee}
                    />
                    <Line total label="Max offer (MAO)" value={wholesale.mao} />
                  </>
                }
                footer={
                  <div className="qa-footer">
                    <span>Assign to your buyer at</span>
                    <strong>{money(wholesale.buyerPrice)}</strong>
                  </div>
                }
              />
              <ResultCard
                title="Novation"
                offerLabel="Offer to the seller"
                offer={novation.offer}
                askingPrice={defaults.askingPrice}
                bar={
                  <SplitBar
                    arv={novation.arv}
                    parts={[
                      { label: "Seller", value: novation.offer, tone: "offer" },
                      {
                        label: "Repairs",
                        value: novation.repairs,
                        tone: "repairs",
                      },
                      {
                        label: "Your fee",
                        value: novation.wholesaleFee,
                        tone: "fee",
                      },
                      {
                        label: "Selling costs",
                        value: novation.arv * 0.1,
                        tone: "reserve",
                      },
                    ]}
                  />
                }
                lines={
                  <>
                    <Line
                      label="ARV (sold on the market)"
                      value={novation.arv}
                    />
                    {NOVATION_RESERVE.map(({ key, label, pct }) => (
                      <Line
                        key={key}
                        sign="−"
                        label={`${label} (${pct}%)`}
                        value={novation[key]}
                      />
                    ))}
                    <Line sign="−" label="Repairs" value={novation.repairs} />
                    <Line
                      sign="−"
                      label="Your fee"
                      value={novation.wholesaleFee}
                    />
                    <Line
                      total
                      label="Offer to seller"
                      value={novation.offer}
                    />
                  </>
                }
                footer={
                  <div className="qa-footer">
                    <span>Your profit at closing</span>
                    <strong>{money(novation.wholesaleFee)}</strong>
                  </div>
                }
              />
              <div className="qa-legend" aria-hidden="true">
                <span className="qa-legend-item qa-bar-part--offer">
                  Seller
                </span>
                <span className="qa-legend-item qa-bar-part--repairs">
                  Repairs
                </span>
                <span className="qa-legend-item qa-bar-part--fee">
                  Your fee
                </span>
                <span className="qa-legend-item qa-bar-part--reserve">
                  Buyer&apos;s profit / selling costs
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
      <PdfReportPreviewModal
        title="Property Report"
        scroll
        previewImage={preview?.image}
        onClose={() => setPreview(null)}
        onDownload={() =>
          downloadPdfBlob(preview.blob, reportFilename(address))
        }
      />
    </>
  );
}
