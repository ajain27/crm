import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { fmt } from "../../../../../utils/utils";
import {
  BrandIcon,
  Field,
  Section,
  SigLine,
} from "../../../../dealAnalyzer/components/sellerFinance/OfferAgreementPdfTemplate";
import "../../../../dealAnalyzer/components/sellerFinance/OfferAgreementPdfTemplate.css";

const COMPANY = {
  name: "YOU WIN ESTATES",
  tagline: "REAL ESTATE INVESTMENT & ACQUISITIONS",
  web: "https://www.uvinestates.com/",
  phone: "+1 206-822-8019",
};

const BUYER_COMPANY = "You Win Estates";
const BUYER_REP = "Ankit Jain";

// The two uploaded agreements differ only in assignment: the assignable one
// names the buyer "and/or assigns" and has the Successors, Assignment &
// Novation clause; the no-assignment one drops both and lists a different
// contact email.
const VARIANTS = {
  assignable: {
    email: "ankit.jain@youwinestates.com",
    buyerName: "You Win Estates, and/or assigns",
    sigCaption: "YouWin Estates, and/or assigns",
  },
  noAssignment: {
    email: "youwinestates@gmail.com",
    buyerName: "You Win Estates",
    sigCaption: "YouWin Estates",
  },
};

// The offer's generation date, e.g. "October 6, 2026".
function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const DEFAULT_OFFER_OPTIONS = {
  allowAssignment: true,
  emdAmount: 100,
  inspectionDays: 14,
};

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

// 14 → "fourteen", 21 → "twenty-one", 120 → "one hundred twenty", for the
// "fourteen (14) calendar days" wording.
export function numberToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100)
    return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${numberToWords(rest)}` : ""}`;
}

// Purchase & Sale Agreement generated from a dashboard deal. Reproduces the
// uploaded You Win Estates wholesale contracts clause for clause; Seller
// Name(s), Property Address and Purchase Price come from the deal, and the
// EMD, inspection period and assignment variant are chosen when generating.
const WholesaleOfferPdfTemplate = forwardRef(function WholesaleOfferPdfTemplate(
  {
    sellerName,
    propertyAddress,
    purchasePrice,
    allowAssignment = DEFAULT_OFFER_OPTIONS.allowAssignment,
    emdAmount = DEFAULT_OFFER_OPTIONS.emdAmount,
    inspectionDays = DEFAULT_OFFER_OPTIONS.inspectionDays,
  },
  ref,
) {
  const variant = allowAssignment ? VARIANTS.assignable : VARIANTS.noAssignment;
  const today = todayFormatted();
  // Clauses after Default & Remedies shift up by one without assignment.
  const afterRemedies = allowAssignment ? 7 : 6;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="oa-pdf-container" ref={ref}>
      <div className="oa-pdf-header">
        <div className="oa-pdf-brand">
          <div className="oa-pdf-brand-icon">
            <BrandIcon />
          </div>
          <div>
            <p className="oa-pdf-company-name">{COMPANY.name}</p>
            <p className="oa-pdf-tagline">{COMPANY.tagline}</p>
          </div>
        </div>
        <div className="oa-pdf-contact">
          <p>
            <strong>Web: </strong>
            {COMPANY.web}
          </p>
          <p>
            <strong>Email: </strong>
            {variant.email}
          </p>
          <p>
            <strong>Phone: </strong>
            {COMPANY.phone}
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
          <Field label="Effective Date:" value={today} />
          <Field label="Seller Name(s):" value={sellerName} />
          <Field label="Buyer Name:" value={variant.buyerName} />
          <Field label="Property Address:" value={propertyAddress} />
        </div>

        <Section number={1} title="PURCHASE PRICE & FINANCIAL TERMS">
          <p>
            Purchase Price:{" "}
            <span className="oa-pdf-inline-field">
              {purchasePrice > 0 ? fmt(purchasePrice) : "$ ________________"}
            </span>{" "}
            &nbsp;&nbsp; Earnest Money Deposit (EMD):{" "}
            <span className="oa-pdf-inline-field">{fmt(emdAmount)}</span>
          </p>
          <p>
            The Purchase Price shall be paid at closing in immediately available
            funds. The Earnest Money Deposit (EMD) shall be held by a mutually
            acceptable escrow or title agent and is fully refundable to Buyer
            during the Inspection Period defined below.
          </p>
        </Section>

        <Section number={2} title="INSPECTION & DUE DILIGENCE">
          <p>
            Buyer shall have a feasibility and inspection period of{" "}
            {numberToWords(inspectionDays)} ({inspectionDays}) calendar{" "}
            {inspectionDays === 1 ? "day" : "days"} following the Effective Date
            (<strong>"Inspection Period"</strong>) to evaluate the Property.
            Buyer, its consultants, and invited prospective partners or
            representatives shall have reasonable access to inspect and show the
            Property. Buyer may cancel this Agreement for any reason or no
            reason during the Inspection Period by providing notice to Seller,
            upon which this Agreement will terminate and the Earnest Money
            Deposit shall be immediately refunded to Buyer in full.
          </p>
        </Section>

        <Section number={3} title="CLOSING & TARGETED TIMELINE">
          <p>
            <strong>Targeted Closing Date:</strong> 21 days after mutual
            acceptance.
          </p>
          <p>
            If closing cannot be completed within the specified timeframe due to
            closing administrative delays, title defects, or if the Buyer is
            unable to close, this Agreement shall automatically become null and
            void, the parties shall be released from all further obligations,
            and the Earnest Money Deposit shall be promptly returned to Buyer,
            unless extended or modified by the parties in writing.
          </p>
        </Section>

        <Section number={4} title="CONDITION & RISK OF LOSS">
          <p>
            Seller shall maintain the Property in its current condition and keep
            it fully insured against all loss, damage, or waste until the
            closing date. In the event of damage to the Property prior to
            closing, Buyer may elect to proceed with the transaction and collect
            all applicable insurance proceeds.
          </p>
        </Section>

        <Section number={5} title="DEFAULT & REMEDIES">
          <p>
            If Buyer defaults under this Agreement, Seller's sole and exclusive
            remedy shall be to retain the Earnest Money Deposit as liquidated
            damages. If Seller defaults, Buyer may pursue all remedies allowed
            by law, including specific performance.
          </p>
        </Section>

        {allowAssignment && (
          <Section number={6} title="SUCCESSORS, ASSIGNMENT & NOVATION">
            <p>
              This Agreement shall bind and benefit the parties hereto and their
              respective heirs, successors, representatives, and designees.
              Buyer reserves the unrestricted right to assign this Agreement or
              novate its rights and obligations to any affiliate, nominee,
              partner, or third-party purchaser (
              <strong>"Assignee/New Buyer"</strong>). Upon execution of a
              novation agreement or written notice of assignment and assumption,
              the original Buyer shall be fully and unconditionally released and
              discharged from all further liability, covenants, and performance
              under this Agreement, and the Assignee/New Buyer shall assume all
              rights and obligations hereunder. Seller consents in advance to
              such assignment or novation and agrees to execute all closing and
              transfer documents necessary to complete the transaction with such
              final designee.
            </p>
          </Section>
        )}

        <Section number={afterRemedies} title="ENTIRE AGREEMENT">
          <p>
            This contract constitutes the final and entire agreement between the
            parties and supersedes all prior discussions, negotiations,
            representations, or oral agreements. No modification shall be
            binding unless made in writing and signed by both parties.
          </p>
        </Section>

        <Section
          number={afterRemedies + 1}
          title="OFFER EXPIRATION & ACCEPTANCE"
        >
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
            <SigLine label="Printed Name" value={sellerName} />
            <SigLine label="Date" value={today} />
          </div>
          <div className="oa-pdf-sig-box">
            <h3>BUYER</h3>
            <SigLine label="Company" value={BUYER_COMPANY} />
            <SigLine label="Authorized Representative" value={BUYER_REP} />
            <SigLine label="Signature" />
            <SigLine label="Date" value={today} />
            <p className="oa-pdf-sig-caption">{variant.sigCaption}</p>
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

export default WholesaleOfferPdfTemplate;
