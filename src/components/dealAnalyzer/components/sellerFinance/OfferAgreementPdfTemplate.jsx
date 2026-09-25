import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { fmt } from "../../../../utils/utils";
import "./OfferAgreementPdfTemplate.css";

const SELLER = {
  name: "YOU WIN ESTATES",
  tagline: "REAL ESTATE INVESTMENT & ACQUISITIONS",
  email: "youwinestates@gmail.com",
  phone: "+1 206-822-8019",
};

const BUYER_NAME = "You Win Estates LLC";
const BUYER_COMPANY = "You Win Estates LLC";
const BUYER_REP = "Ankit Jain";
const EMD_AMOUNT = 2000;

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Field({ label, value }) {
  return (
    <div className="oa-pdf-field-row">
      <span className="oa-pdf-field-label">{label}</span>
      <span className={`oa-pdf-field-value${value ? " oa-pdf-filled" : ""}`}>
        {value || " "}
      </span>
    </div>
  );
}

function Section({ number, title, children, isNew }) {
  return (
    <div className={`oa-pdf-section${isNew ? " oa-pdf-section-new" : ""}`}>
      <h2>
        {number}. {title}
      </h2>
      {children}
    </div>
  );
}

// Approximation of the You Win Estates house/key/checkmark icon — a house
// roofline behind an orange key whose round bow holds a checkmark instead
// of a keyhole, with a couple of small sparkle accents. Built as inline
// SVG (no source image file was available to embed directly).
function BrandIcon() {
  return (
    <svg viewBox="0 0 100 100" className="oa-pdf-brand-icon-svg">
      <polygon
        points="50,16 86,48 72,48 72,56 60,56 60,38 40,38 40,56 28,56 28,48 14,48"
        fill="#16223f"
      />
      <rect x="60" y="22" width="8" height="14" fill="#16223f" />
      <path
        d="M78 24 L80.5 29 L86 31.5 L80.5 34 L78 39 L75.5 34 L70 31.5 L75.5 29 Z"
        fill="#8ec9ff"
      />
      <path
        d="M87 36 L88.3 38.7 L91 40 L88.3 41.3 L87 44 L85.7 41.3 L83 40 L85.7 38.7 Z"
        fill="#8ec9ff"
      />
      <rect x="52" y="60" width="34" height="12" rx="3" fill="#f5811f" />
      <rect x="70" y="72" width="6" height="9" fill="#f5811f" />
      <rect x="79" y="72" width="6" height="11" fill="#f5811f" />
      <circle
        cx="38"
        cy="66"
        r="21"
        fill="#f5811f"
        stroke="#16223f"
        strokeWidth="3"
      />
      <path
        d="M28 66 L35 73 L50 55"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SigLine({ label, value }) {
  return (
    <div className="oa-pdf-sig-line">
      <div className="oa-pdf-sig-line-rule">
        {value && <span className="oa-pdf-sig-value">{value}</span>}
      </div>
      <span className="oa-pdf-sig-line-label">{label}</span>
    </div>
  );
}

// Purchase & Sale Agreement, generated from the Seller Finance tab's
// calculated numbers once a summary exists. Modeled on the uploaded You
// Win Estates contract template — the source template's clauses are
// reproduced verbatim (minus "Successors, Assignment & Novation", dropped
// per request), with one new clause added: "2. SELLER FINANCING",
// inserted after "1. PURCHASE PRICE & FINANCIAL TERMS". Seller Name(s) is
// left blank, same as the source template, since the calculator doesn't
// collect it — Purchase Price, Property Address, the Seller-Financed
// Amount and the Effective Date (today, since that's when this offer is
// generated) are filled in; the EMD is a flat $2,000. For a hybrid note,
// the interest-only month count is stated too, but not the dollar
// payment amounts, since those can still change before closing.
const OfferAgreementPdfTemplate = forwardRef(function OfferAgreementPdfTemplate(
  { summary },
  ref,
) {
  if (!summary) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="oa-pdf-container" ref={ref}>
      <div className="oa-pdf-header">
        <div className="oa-pdf-brand">
          <div className="oa-pdf-brand-icon">
            <BrandIcon />
          </div>
          <div>
            <p className="oa-pdf-company-name">{SELLER.name}</p>
            <p className="oa-pdf-tagline">{SELLER.tagline}</p>
          </div>
        </div>
        <div className="oa-pdf-contact">
          <p>
            <strong>Email: </strong>
            {SELLER.email}
          </p>
          <p>
            <strong>Phone: </strong>
            {SELLER.phone}
          </p>
        </div>
      </div>

      <div className="oa-pdf-title-bar">
        <h1>PURCHASE AND SALE AGREEMENT</h1>
      </div>

      <div className="oa-pdf-body">
        <p className="oa-pdf-intro">
          This Purchase and Sale Agreement (<strong>"Agreement"</strong>) is
          entered into and made effective as of the date of final mutual
          acceptance execution below (<strong>"Effective Date"</strong>), by and
          between the parties specified below:
        </p>

        <div className="oa-pdf-fields">
          <Field label="Effective Date:" value={todayFormatted()} />
          <Field label="Seller Name(s):" value="" />
          <Field label="Buyer Name:" value={BUYER_NAME} />
          <Field label="Property Address:" value={summary.propertyAddress} />
        </div>

        <Section number={1} title="PURCHASE PRICE & FINANCIAL TERMS">
          <p>
            Purchase Price:{" "}
            <span className="oa-pdf-inline-field">
              {fmt(summary.purchasePrice)}
            </span>{" "}
            &nbsp;&nbsp; Earnest Money Deposit (EMD):{" "}
            <span className="oa-pdf-inline-field">{fmt(EMD_AMOUNT)}</span>
          </p>
          <p>
            The Purchase Price shall be paid at closing in immediately available
            funds. The Earnest Money Deposit (EMD) shall be held by a mutually
            acceptable escrow or title agent and is fully refundable to Buyer
            during the Inspection Period defined below.
          </p>
        </Section>

        <Section number={2} title="SELLER FINANCING" isNew>
          <p>
            <strong>Down Payment:</strong>{" "}
            {summary.isFullySellerFinanced ? (
              summary.downPaymentAmount > 0 ? (
                <>
                  Buyer shall pay a down payment of{" "}
                  <span className="oa-pdf-inline-field">
                    {fmt(summary.downPaymentAmount)}
                  </span>{" "}
                  at the time of Closing, in immediately available funds.
                </>
              ) : (
                <>
                  Buyer shall pay no down payment at the time of Closing —
                  Seller shall finance the full Purchase Price.
                </>
              )
            ) : (
              <>
                Buyer shall pay a down payment equal to seventy percent (70%) of
                the Purchase Price at the time of Closing, in immediately
                available funds.
              </>
            )}
          </p>
          <p>
            <strong>Seller-Financed Amount:</strong> The remaining balance of
            the Purchase Price, in the amount of{" "}
            <span className="oa-pdf-inline-field">
              {fmt(summary.sellerFinanceAmount)}
            </span>{" "}
            (the <strong>"Seller Financing"</strong>), shall be financed by
            Seller.
          </p>
          {summary.isHybrid && (
            <p>
              <strong>Payment Structure:</strong> The Seller Financing shall be
              structured on an interest-only basis for the first{" "}
              {summary.sellerFinanceHybridIoMonths} months following Closing,
              after which payments shall convert to a fully amortized
              principal-and-interest schedule for the remainder of the note
              term. Exact payment amounts will be set forth in the Promissory
              Note at Closing.
            </p>
          )}
          <p>
            <strong>Lien Position:</strong> The Seller Financing shall be
            secured by a promissory note and a deed of trust/mortgage against
            the Property in a second lien position, subordinate to any
            purchase-money financing obtained by Buyer to fund the down payment.
            The interest rate, monthly payment, and term of the Seller Financing
            shall be set forth in a separate Promissory Note and Deed of
            Trust/Mortgage executed by the parties at Closing.
          </p>
        </Section>

        <Section number={3} title="INSPECTION & DUE DILIGENCE">
          <p>
            Buyer shall have a feasibility and inspection period of fourteen
            (14) calendar days following the Effective Date (
            <strong>"Inspection Period"</strong>) to evaluate the Property.
            Buyer, its consultants, and invited prospective partners or
            representatives shall have reasonable access to inspect and show the
            Property. Buyer may cancel this Agreement for any reason or no
            reason during the Inspection Period by providing notice to Seller,
            upon which this Agreement will terminate and the Earnest Money
            Deposit shall be immediately refunded to Buyer in full.
          </p>
        </Section>

        <Section number={4} title="CLOSING & TARGETED TIMELINE">
          <p>Targeted Closing Date: 21 days after mutual acceptance.</p>
          <p>
            If closing cannot be completed within the specified timeframe due to
            closing administrative delays, title defects, or if the Buyer is
            unable to close, this Agreement shall automatically become null and
            void, the parties shall be released from all further obligations,
            and the Earnest Money Deposit shall be promptly returned to Buyer,
            unless extended or modified by the parties in writing.
          </p>
        </Section>

        <Section number={5} title="CONDITION & RISK OF LOSS">
          <p>
            Seller shall maintain the Property in its current condition and keep
            it fully insured against all loss, damage, or waste until the
            closing date. In the event of damage to the Property prior to
            closing, Buyer may elect to proceed with the transaction and collect
            all applicable insurance proceeds.
          </p>
        </Section>

        <Section number={6} title="DEFAULT & REMEDIES">
          <p>
            If Buyer defaults under this Agreement, Seller's sole and exclusive
            remedy shall be to retain the Earnest Money Deposit as liquidated
            damages. If Seller defaults, Buyer may pursue all remedies allowed
            by law, including specific performance.
          </p>
        </Section>

        <Section number={7} title="ENTIRE AGREEMENT">
          <p>
            This contract constitutes the final and entire agreement between the
            parties and supersedes all prior discussions, negotiations,
            representations, or oral agreements. No modification shall be
            binding unless made in writing and signed by both parties.
          </p>
        </Section>

        <Section number={8} title="OFFER EXPIRATION & ACCEPTANCE">
          <p>
            This offer is strictly conditioned upon acceptance and is valid only
            for twenty-four (24) hours after being transmitted and delivered to
            Seller. If this Agreement is not fully executed by Seller and
            returned within said twenty-four (24) hour period, this offer shall
            automatically terminate, become null and void, and be of no further
            legal effect without requirement of written notice.
          </p>
        </Section>

        <div className="oa-pdf-warning">
          THIS IS INTENDED TO BE A LEGALLY BINDING CONTRACT. IF YOU DO NOT
          UNDERSTAND THE LEGAL EFFECT OF ANY PART OF THIS AGREEMENT, SEEK
          INDEPENDENT LEGAL COUNSEL BEFORE SIGNING.
        </div>

        <div className="oa-pdf-signatures">
          <div className="oa-pdf-sig-box">
            <h3>SELLER</h3>
            <SigLine label="Signature" />
            <SigLine label="Printed Name" />
            <SigLine label="Date" />
          </div>
          <div className="oa-pdf-sig-box">
            <h3>BUYER</h3>
            <SigLine label="Company" value={BUYER_COMPANY} />
            <SigLine label="Authorized Representative" value={BUYER_REP} />
            <SigLine label="Signature" />
            <SigLine label="Date" />
            <p className="oa-pdf-sig-caption">{BUYER_NAME}</p>
          </div>
        </div>
      </div>

      <div className="oa-pdf-footer">
        YOU WIN ESTATES — PURCHASE AND SALE AGREEMENT
      </div>
    </div>,
    document.body,
  );
});

export default OfferAgreementPdfTemplate;
