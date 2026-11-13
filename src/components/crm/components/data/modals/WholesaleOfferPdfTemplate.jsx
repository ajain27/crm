import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { fmt } from "../../../../../utils/utils";
import {
  BrandIcon,
  Field,
  Section,
  SigLine,
  COMPANY_SIGNATURE,
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

const COMPANY_EMAIL = "youwinestates@gmail.com";

// The two uploaded agreements differ only in assignment: the assignable one
// names the buyer "and/or assigns" and has the Successors, Assignment &
// Novation clause; the no-assignment one drops both.
const VARIANTS = {
  assignable: {
    buyerName: "You Win Estates, and/or assigns",
    sigCaption: "YouWin Estates, and/or assigns",
  },
  noAssignment: {
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
  emdDays: 3,
  inspectionDays: 14,
  closingDays: 21,
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

// 3 → "three (3) business days", for when the EMD is due.
export function businessDays(n) {
  return `${numberToWords(n)} (${n}) business ${n === 1 ? "day" : "days"}`;
}

// Section 3 of the assignable agreement: when closing is due, when the
// EMD goes hard, and what happens when closing slips — for a title or
// agency delay, a seller who won't close, or a buyer who can't — and that
// an assignment changes none of it. `liensSection` is the Liens, Taxes &
// Encumbrances clause's number.
function AssignableClosingTerms({ closingDays, emdDays, liensSection }) {
  const liens = `Section ${liensSection}`;
  return (
    <>
      <p>
        <strong>(a) Closing Date.</strong> Closing shall occur on or before{" "}
        {numberToWords(closingDays)} ({closingDays}) calendar{" "}
        {closingDays === 1 ? "day" : "days"} after the Effective Date (the{" "}
        <strong>"Closing Date"</strong>). If the Closing Date falls on a
        Saturday, Sunday, legal holiday, or a day the escrow/title agent or
        county recording office is closed, it shall be the next business day.
      </p>
      <p>
        <strong>(b) Earnest Money.</strong> Buyer shall deliver the EMD to the
        escrow/title agent within {businessDays(emdDays)} after the Effective
        Date. If Buyer does not terminate this Agreement in writing before the
        Inspection Period expires, the EMD becomes non-refundable to Buyer,
        except that it shall be refunded to Buyer in full under Section 3(c),
        Section 3(d), or {liens}.
      </p>
      <p>
        <strong>(c) Delays Not Caused by Either Party.</strong> If closing
        cannot occur by the Closing Date because of (i) a title defect, lien, or
        encumbrance, or (ii) a delay by the escrow/title agent, the recording
        office, or a government agency that is not caused by Buyer or Seller,
        the Closing Date shall automatically be extended by up to fifteen (15)
        calendar days (the <strong>"Extension Period"</strong>). During the
        Extension Period, Seller shall diligently work to cure any title matter
        and Buyer shall remain ready to close. If closing still cannot occur by
        the end of the Extension Period for one of these reasons, either party
        may terminate this Agreement by written notice; the EMD shall then be
        refunded to Buyer in full, and both parties shall be released from
        further obligations. Buyer may instead elect in writing to accept title
        as-is, subject to {liens}, and close. The parties may agree in writing
        to any further extension.
      </p>
      <p>
        <strong>(d) Seller's Failure to Close.</strong> If closing does not
        occur because Seller fails to sign or deliver the deed or other closing
        documents, deliver possession, satisfy its obligations under {liens}, or
        otherwise perform, this Agreement shall not terminate automatically and
        Seller shall not benefit from Section 3(c). Seller shall be in default.
        Buyer shall be entitled to a full refund of the EMD and may pursue the
        remedies in Section 5, including specific performance.
      </p>
      <p>
        <strong>(e) Buyer's Failure to Close.</strong> If the Inspection Period
        has expired without Buyer terminating this Agreement and Buyer fails to
        close by the Closing Date (as extended under Section 3(c), if
        applicable) for any reason not described in Sections 3(c) or 3(d),
        Seller shall give Buyer written notice, and Buyer shall have three (3)
        business days to close. If Buyer does not close within that time, Buyer
        shall be in default, and the EMD shall be released to Seller as
        liquidated damages, which shall be Seller's sole and exclusive remedy
        under Section 5.
      </p>
      <p>
        <strong>(f) Assignment and Release of EMD.</strong> Any assignment or
        novation under Section 6 shall not extend the Closing Date or change
        Seller's rights under this Section 3. The EMD shall remain in escrow,
        and this Section 3 shall control how it is released, whether or not this
        Agreement has been assigned or novated. Buyer and Seller shall each
        sign, within three (3) business days after a written request, any
        instructions the escrow/title agent requires to release the EMD as this
        Section 3 provides.
      </p>
    </>
  );
}

// Purchase & Sale Agreement generated from a dashboard deal. Reproduces the
// uploaded You Win Estates wholesale contracts clause for clause; Seller
// Name(s), Property Address and Purchase Price come from the deal, and the
// EMD, inspection period, closing timeline and assignment variant are chosen
// when generating.
const WholesaleOfferPdfTemplate = forwardRef(function WholesaleOfferPdfTemplate(
  {
    sellerName,
    propertyAddress,
    purchasePrice,
    allowAssignment = DEFAULT_OFFER_OPTIONS.allowAssignment,
    emdAmount = DEFAULT_OFFER_OPTIONS.emdAmount,
    emdDays = DEFAULT_OFFER_OPTIONS.emdDays,
    inspectionDays = DEFAULT_OFFER_OPTIONS.inspectionDays,
    closingDays = DEFAULT_OFFER_OPTIONS.closingDays,
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
            {COMPANY_EMAIL}
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
            {!allowAssignment &&
              ` Buyer shall deliver the EMD to the escrow/title agent within ${businessDays(emdDays)} after the Effective Date.`}
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
          {allowAssignment ? (
            <AssignableClosingTerms
              closingDays={closingDays}
              emdDays={emdDays}
              liensSection={afterRemedies + 1}
            />
          ) : (
            <>
              <p>
                <strong>Targeted Closing Date:</strong> {closingDays}{" "}
                {closingDays === 1 ? "day" : "days"} after mutual acceptance.
              </p>
              <p>
                If closing cannot be completed within the specified timeframe
                due to closing administrative delays or title defects not caused
                by Buyer, this Agreement shall automatically become null and
                void, the parties shall be released from all further
                obligations, and the Earnest Money Deposit shall be promptly
                returned to Buyer, unless extended or modified by the parties in
                writing. However, if Buyer is unable to close within the{" "}
                {numberToWords(closingDays)} ({closingDays}) day timeframe and
                the Inspection Period has expired without Buyer terminating this
                Agreement, the Earnest Money Deposit shall be non-refundable
                (&quot;hard&quot;), Buyer shall not be entitled to any refund,
                and the Earnest Money Deposit shall be released to Seller.
              </p>
            </>
          )}
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

        <Section number={afterRemedies + 1} title="LIENS, TAXES & ENCUMBRANCES">
          <p>
            Seller shall convey title to the Property free and clear of all
            liens, encumbrances, and monetary obligations. Any and all
            mortgages, deeds of trust, tax liens, unpaid or delinquent property
            taxes, special assessments, HOA dues, utility charges, judgments,
            mechanic's liens, code violation fines, or any other amounts owed by
            Seller or recorded against the Property as of the closing date shall
            be paid in full at closing from Seller's proceeds and deducted from
            the total amount payable to Seller. Buyer shall not be responsible
            for paying, assuming, or satisfying any such liens, back taxes, or
            other obligations against the Property. If the total of such amounts
            exceeds Seller's proceeds, Seller shall pay the shortfall at or
            before closing; otherwise Buyer may terminate this Agreement and the
            Earnest Money Deposit shall be refunded to Buyer in full.
          </p>
        </Section>

        <Section
          number={afterRemedies + 2}
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

        <Section number={afterRemedies + 3} title="CLOSING COSTS">
          <p>
            All closing costs associated with this transaction shall be paid by
            Buyer
            {allowAssignment &&
              " or, if this Agreement is assigned or novated, by the End Buyer (Assignee/New Buyer)"}{" "}
            at the time of closing, including title insurance, escrow and
            settlement fees, recording fees, State and County transfer taxes,
            and document preparation fees. Seller shall not pay any closing
            costs, and Seller's proceeds shall not be reduced by them. Seller's
            obligations under Section {afterRemedies + 1} are unchanged.
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
            <SigLine label="Signature" signature={COMPANY_SIGNATURE} />
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
