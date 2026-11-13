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
import { numberToWords } from "./WholesaleOfferPdfTemplate";
import "../../../../dealAnalyzer/components/sellerFinance/OfferAgreementPdfTemplate.css";
import "./CommercialOfferPdfTemplate.css";

const BUYER_NAME = "You Win Estates, and/or assigns";

export const DEFAULT_COMMERCIAL_OPTIONS = {
  inspectionDays: 30,
  closingDays: 60,
};

const ACCEPTANCE = "Mutual acceptance (Seller & Buyer signed)";

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 30 → "Thirty (30)".
function spelled(n) {
  const words = numberToWords(n);
  return `${words[0].toUpperCase()}${words.slice(1)} (${n})`;
}

function days(n) {
  return `${spelled(n)} calendar ${n === 1 ? "day" : "days"}`;
}

// The Key Terms rows: the inspection period and closing timeline come from
// the offer options (removal is due by closing); the rest are fixed.
export function commercialKeyTerms({ inspectionDays, closingDays }) {
  return [
    ["Inspection Period", days(inspectionDays), ACCEPTANCE],
    [
      "Closing Date",
      `On or before ${days(closingDays).replace(/^\w/, (c) => c.toLowerCase())}`,
      ACCEPTANCE,
    ],
    [
      "Automatic Extension Period",
      "Up to thirty (30) calendar days",
      "Scheduled Closing Date",
    ],
    [
      "Removal Deadline",
      `${days(closingDays)}, and before closing`,
      ACCEPTANCE,
    ],
    ["Earnest Money Delivery", "Three (3) business days", ACCEPTANCE],
    [
      "Offer Expiration",
      "Twenty-four (24) hours",
      "Delivery of offer to Seller",
    ],
  ];
}

// Commercial Purchase and Sale Agreement: the uploaded You Win Estates
// commercial contract, clause for clause. Lot and building only; the
// seller removes equipment, tools and inventory. Seller Name(s), Property
// Address and Purchase Price come from the deal; the EMD, inspection period
// and closing timeline are chosen when generating.
const CommercialOfferPdfTemplate = forwardRef(
  function CommercialOfferPdfTemplate(
    {
      sellerName,
      propertyAddress,
      purchasePrice,
      emdAmount = 100,
      inspectionDays = DEFAULT_COMMERCIAL_OPTIONS.inspectionDays,
      closingDays = DEFAULT_COMMERCIAL_OPTIONS.closingDays,
    },
    ref,
  ) {
    const today = todayFormatted();
    if (typeof document === "undefined") return null;

    return createPortal(
      <div className="oa-pdf-container" ref={ref}>
        <div className="oa-pdf-header">
          <div className="oa-pdf-brand">
            <div className="oa-pdf-brand-icon">
              <BrandIcon />
            </div>
            <div>
              <p className="oa-pdf-company-name">YOU WIN ESTATES</p>
              <p className="oa-pdf-tagline">
                REAL ESTATE INVESTMENT &amp; ACQUISITIONS
              </p>
            </div>
          </div>
          <div className="oa-pdf-contact">
            <p>
              <strong>Web: </strong>https://www.uvinestates.com/
            </p>
            <p>
              <strong>Email: </strong>youwinestates@gmail.com
            </p>
            <p>
              <strong>Phone: </strong>+1 206-822-8019
            </p>
          </div>
        </div>

        <div className="oa-pdf-title-bar">
          <h1>COMMERCIAL PURCHASE AND SALE AGREEMENT</h1>
        </div>

        <div className="oa-pdf-body">
          <p className="oa-pdf-intro">
            This Commercial Purchase and Sale Agreement (
            <strong>"Agreement"</strong>) is entered into and made effective as
            of the date of final mutual acceptance and execution below (
            <strong>"Effective Date"</strong>), by and between the parties
            specified below:
          </p>

          <div className="oa-pdf-fields">
            <Field label="Seller Name(s):" value={sellerName} />
            <Field label="Buyer Name:" value={BUYER_NAME} />
            <Field label="Property Address:" value={propertyAddress} />
          </div>

          <div className="oa-pdf-section oa-pdf-key-terms">
            <h2>KEY TERMS</h2>
            <p>
              The periods below control wherever this Agreement refers to them.
              All periods are calendar days unless stated otherwise.
            </p>
            <table>
              <thead>
                <tr>
                  <th>TERM</th>
                  <th>PERIOD</th>
                  <th>COUNTED FROM</th>
                </tr>
              </thead>
              <tbody>
                {commercialKeyTerms({ inspectionDays, closingDays }).map(
                  ([term, period, from]) => (
                    <tr key={term}>
                      <td>{term}</td>
                      <td className="oa-pdf-key-period">{period}</td>
                      <td>{from}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
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
              The Purchase Price is paid for the lot and building only, as
              defined in Section 2, and no part of it is allocated to any
              equipment, inventory or other personal property. The Purchase
              Price shall be paid at closing in immediately available funds. The
              Earnest Money Deposit (EMD) shall be held by a mutually acceptable
              escrow or title agent and is fully refundable to Buyer during the
              Inspection Period.
            </p>
          </Section>

          <Section number={2} title="PROPERTY INCLUDED & EXCLUDED">
            <p>
              <strong>(a) Lot and Building Only.</strong> This sale covers only
              the land (lot) at the Property Address and the building and
              permanent improvements on it, including building systems
              permanently attached to the building such as HVAC, electrical,
              plumbing and lighting (together, the <strong>"Property"</strong>).
              Nothing else is sold under this Agreement.
            </p>
            <p>
              <strong>(b) Excluded Items.</strong> The following are excluded
              from the sale and remain Seller's property: all equipment,
              machinery, tools, trade fixtures, furniture, complete inventory,
              supplies, vehicles, business signage, and any other personal
              property, together with Seller's business, goodwill, trade names,
              licenses, accounts and contracts (the{" "}
              <strong>"Excluded Items"</strong>). Buyer does not assume any of
              Seller's business operations, contracts, employees or liabilities.
              Seller shall deliver possession of the Property at closing vacant
              and free of all tenants and occupants, unless Buyer agrees
              otherwise in writing.
            </p>
            <p>
              <strong>(c) Removal of Equipment, Tools and Inventory.</strong>{" "}
              Seller shall, at Seller's sole expense, remove all equipment,
              tools and complete inventory, and all other Excluded Items, from
              the Property by the Removal Deadline stated in the Key Terms, and
              in all cases before closing. Seller shall leave the Property
              broom-clean and free of trash, debris, and any chemicals, fluids
              or waste from Seller's business. Seller shall not remove or damage
              any part of the building or its permanently attached systems while
              removing Excluded Items, and Seller is responsible for any damage
              caused by the removal. Any Excluded Items remaining on the
              Property after the Removal Deadline or closing, whichever is
              earlier, shall be deemed abandoned; Buyer may keep or dispose of
              them, and Buyer's reasonable disposal costs may be deducted from
              Seller's proceeds at closing or charged to Seller.
            </p>
          </Section>

          <Section number={3} title="INSPECTION & DUE DILIGENCE">
            <p>
              Buyer shall have a feasibility and inspection period following the
              Effective Date for the period stated in the Key Terms (
              <strong>"Inspection Period"</strong>) to evaluate the Property.
              This may include physical inspections, environmental site
              assessments, surveys, and zoning, permit and title review. Buyer,
              its consultants, and invited prospective partners or
              representatives shall have reasonable access to inspect and show
              the Property. Buyer may cancel this Agreement for any reason or no
              reason during the Inspection Period by providing notice to Seller,
              upon which this Agreement will terminate and the Earnest Money
              Deposit shall be immediately refunded to Buyer in full.
            </p>
          </Section>

          <Section number={4} title="CLOSING & TARGETED TIMELINE">
            <p>
              <strong>(a) Closing Date.</strong> Closing shall occur within the
              period after the Effective Date stated for the Closing Date in the
              Key Terms (the <strong>"Closing Date"</strong>). If the Closing
              Date falls on a Saturday, Sunday, legal holiday, or a day the
              escrow/title agent or county recording office is closed, it shall
              be the next business day.
            </p>
            <p>
              <strong>(b) Earnest Money.</strong> Buyer shall deliver the EMD to
              the escrow/title agent within the Earnest Money delivery period
              stated in the Key Terms. If Buyer does not terminate this
              Agreement in writing before the Inspection Period expires, the EMD
              becomes non-refundable to Buyer, except that it shall be refunded
              to Buyer in full under Section 4(c), Section 4(d), Section 5(c),
              or Section 9.
            </p>
            <p>
              <strong>(c) Delays Not Caused by Either Party.</strong> If closing
              cannot occur by the Closing Date because of (i) a title defect,
              lien, or encumbrance, or (ii) a delay by the escrow/title agent,
              the recording office, or a government agency that is not caused by
              Buyer or Seller, the Closing Date shall automatically be extended
              by the Automatic Extension Period stated in the Key Terms (the{" "}
              <strong>"Extension Period"</strong>). During the Extension Period,
              Seller shall diligently work to cure any title matter and Buyer
              shall remain ready to close. If closing still cannot occur by the
              end of the Extension Period for one of these reasons, either party
              may terminate this Agreement by written notice; the EMD shall then
              be refunded to Buyer in full, and both parties shall be released
              from further obligations. Buyer may instead elect in writing to
              accept title as-is, subject to Section 9, and close. The parties
              may agree in writing to any further extension.
            </p>
            <p>
              <strong>(d) Seller's Failure to Close.</strong> If closing does
              not occur because Seller fails to sign or deliver the deed or
              other closing documents, deliver possession, satisfy its
              obligations under Section 9, or otherwise perform, this Agreement
              shall not terminate automatically and Seller shall not benefit
              from Section 4(c). Seller shall be in default. Buyer shall be
              entitled to a full refund of the EMD and may pursue the remedies
              in Section 6, including specific performance.
            </p>
            <p>
              <strong>(e) Buyer's Failure to Close.</strong> If the Inspection
              Period has expired without Buyer terminating this Agreement and
              Buyer fails to close by the Closing Date (as extended under
              Section 4(c), if applicable) for any reason not described in
              Sections 4(c), 4(d) or 5(c), Seller shall give Buyer written
              notice, and Buyer shall have three (3) business days to close. If
              Buyer does not close within that time, Buyer shall be in default,
              and the EMD shall be released to Seller as liquidated damages,
              which shall be Seller's sole and exclusive remedy under Section 6.
            </p>
            <p>
              <strong>(f) Assignment and Release of EMD.</strong> Any assignment
              or novation under Section 7 shall not extend the Closing Date or
              change Seller's rights under this Section 4. The EMD shall remain
              in escrow, and this Section 4 shall control how it is released,
              whether or not this Agreement has been assigned or novated. Buyer
              and Seller shall each sign, within three (3) business days after a
              written request, any instructions the escrow/title agent requires
              to release the EMD as this Section 4 provides.
            </p>
          </Section>

          <Section number={5} title="CONDITION, AS-IS SALE & INSURANCE">
            <p>
              <strong>(a) As-Is Sale; No Repairs or Modifications.</strong> The
              building and Property are sold <strong>"AS IS, WHERE IS,"</strong>{" "}
              with all faults. Seller will not perform any repairs,
              improvements, or modifications to the building or Property before
              closing, and Buyer will not require any as a condition of closing.
              Buyer relies solely on its own inspections during the Inspection
              Period. Seller shall not alter, demolish, or remove any part of
              the building or its permanently attached systems before closing,
              except for removing Excluded Items under Section 2(c). This
              Section does not limit Seller's obligations under Section 2(c),
              Section 5(b) and (c), or Section 9.
            </p>
            <p>
              <strong>(b) Insurance — Lot and Building Only.</strong> Until the
              day of closing, Seller shall keep the lot and building insured
              against fire, casualty, and liability at no less than its current
              coverage. For purposes of this Agreement, insurance covers the lot
              and building only. Seller's equipment, tools, inventory, and other
              Excluded Items are not covered for Buyer's benefit and remain
              entirely at Seller's risk and expense. Risk of loss to the lot and
              building remains with Seller until closing. Buyer is responsible
              for its own insurance from the day of closing.
            </p>
            <p>
              <strong>(c) Damage Before Closing.</strong> If the lot or building
              is damaged before closing, Buyer may elect either to (i) proceed
              with the transaction and receive all insurance proceeds payable
              for the damage to the lot and building, plus a credit for any
              deductible, or (ii) terminate this Agreement by written notice, in
              which case the EMD shall be refunded to Buyer in full.
            </p>
          </Section>

          <Section number={6} title="DEFAULT & REMEDIES">
            <p>
              If Buyer defaults under this Agreement, Seller's sole and
              exclusive remedy shall be to retain the Earnest Money Deposit as
              liquidated damages. If Seller defaults, Buyer may pursue all
              remedies allowed by law, including specific performance.
            </p>
          </Section>

          <Section number={7} title="SUCCESSORS, ASSIGNMENT & NOVATION">
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

          <Section number={8} title="ENTIRE AGREEMENT">
            <p>
              This contract constitutes the final and entire agreement between
              the parties and supersedes all prior discussions, negotiations,
              representations, or oral agreements. No modification shall be
              binding unless made in writing and signed by both parties.
            </p>
          </Section>

          <Section number={9} title="LIENS, TAXES & ENCUMBRANCES">
            <p>
              Seller shall convey title to the Property free and clear of all
              liens, encumbrances, and monetary obligations. Any and all
              mortgages, deeds of trust, tax liens, unpaid or delinquent
              property taxes, special assessments, association or owners' dues,
              utility charges, judgments, mechanic's liens, code violation
              fines, or any other amounts owed by Seller or recorded against the
              Property as of the closing date shall be paid in full at closing
              from Seller's proceeds and deducted from the total amount payable
              to Seller. Buyer shall not be responsible for paying, assuming, or
              satisfying any such liens, back taxes, or other obligations
              against the Property. If the total of such amounts exceeds
              Seller's proceeds, Seller shall pay the shortfall at or before
              closing; otherwise Buyer may terminate this Agreement and the
              Earnest Money Deposit shall be refunded to Buyer in full.
            </p>
          </Section>

          <Section number={10} title="OFFER EXPIRATION & ACCEPTANCE">
            <p>
              This offer is strictly conditioned upon acceptance and is valid
              only for the Offer Expiration period stated in the Key Terms after
              being transmitted and delivered to Seller. If this Agreement is
              not fully executed by Seller and returned within that period, this
              offer shall automatically terminate, become null and void, and be
              of no further legal effect without requirement of written notice.
            </p>
          </Section>

          <Section number={11} title="CLOSING COSTS">
            <p>
              All closing costs associated with this transaction shall be paid
              by Buyer or, if this Agreement is assigned or novated, by the End
              Buyer (Assignee/New Buyer) at the time of closing, including title
              insurance, escrow and settlement fees, recording fees, State and
              County transfer taxes, and document preparation fees. Seller shall
              not pay any closing costs, and Seller's proceeds shall not be
              reduced by them. Seller's obligations under Section 2(c) and
              Section 9 are unchanged.
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
              <SigLine label="Company" value="You Win Estates" />
              <SigLine label="Authorized Representative" value="Ankit Jain" />
              <SigLine label="Signature" signature={COMPANY_SIGNATURE} />
              <SigLine label="Date" value={today} />
              <p className="oa-pdf-sig-caption">{BUYER_NAME}</p>
            </div>
          </div>
        </div>

        <div className="oa-pdf-footer">
          YOU WIN ESTATES — COMMERCIAL PURCHASE AND SALE AGREEMENT
        </div>
      </div>,
      document.body,
    );
  },
);

export default CommercialOfferPdfTemplate;
