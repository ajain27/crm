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
import { AdditionalClause, businessDays } from "./WholesaleOfferPdfTemplate";
import {
  ACCEPTANCE,
  DEFAULT_COMMERCIAL_OPTIONS,
  KeyTerms,
  days,
  todayFormatted,
} from "./CommercialOfferPdfTemplate";
import "../../../../dealAnalyzer/components/sellerFinance/OfferAgreementPdfTemplate.css";
import "./CommercialOfferPdfTemplate.css";

const BUYER_NAME = "You Win Estates, and/or assigns";

// A clause added when generating the offer follows Closing Costs.
export const MULTIFAMILY_ADDITIONAL_CLAUSE_NUMBER = 15;

const capitalize = (text) => text.replace(/^\w/, (c) => c.toUpperCase());

// The Key Terms rows: the inspection period, closing timeline and when the
// EMD is due come from the offer options; the rest are fixed.
export function multifamilyKeyTerms({
  inspectionDays,
  closingDays,
  emdDays = DEFAULT_COMMERCIAL_OPTIONS.emdDays,
}) {
  return [
    ["Inspection Period", days(inspectionDays), ACCEPTANCE],
    [
      "Closing Date",
      `On or before ${days(closingDays).replace(/^\w/, (c) => c.toLowerCase())}`,
      ACCEPTANCE,
    ],
    ["Document Delivery", "Five (5) business days", ACCEPTANCE],
    ["Earnest Money Delivery", capitalize(businessDays(emdDays)), ACCEPTANCE],
    [
      "Offer Expiration",
      "Twenty-four (24) hours",
      "Delivery of offer to Seller",
    ],
  ];
}

// Paragraphs headed "(a) Title." like the PDF's lettered subsections.
function Sub({ label, children }) {
  return (
    <p>
      <strong>{label}</strong> {children}
    </p>
  );
}

// Multifamily Purchase and Sale Agreement: the uploaded You Win Estates
// multifamily contract, clause for clause. Sold subject to the leases, with
// the seller's rent roll and records, rent and deposit prorations, and
// limits on operating the property before closing. Seller Name(s),
// Property Address and Purchase Price come from the deal; the EMD,
// inspection period and closing timeline are chosen when generating.
const MultifamilyOfferPdfTemplate = forwardRef(
  function MultifamilyOfferPdfTemplate(
    {
      sellerName,
      propertyAddress,
      purchasePrice,
      emdAmount = 100,
      inspectionDays = DEFAULT_COMMERCIAL_OPTIONS.inspectionDays,
      closingDays = DEFAULT_COMMERCIAL_OPTIONS.closingDays,
      emdDays = DEFAULT_COMMERCIAL_OPTIONS.emdDays,
      additionalClause = null,
      inline = false,
    },
    ref,
  ) {
    const today = todayFormatted();
    if (typeof document === "undefined") return null;

    const page = (
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
          <h1>MULTIFAMILY PURCHASE AND SALE AGREEMENT</h1>
        </div>

        <div className="oa-pdf-body">
          <p className="oa-pdf-intro">
            This Multifamily Purchase and Sale Agreement (
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

          <KeyTerms
            rows={multifamilyKeyTerms({ inspectionDays, closingDays, emdDays })}
          />

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
              The Purchase Price is paid for the Property as defined in Section
              2, including the Leases and the Seller-owned personal property
              used in operating the Property. The Purchase Price shall be paid
              at closing in immediately available funds, subject to the credits
              and prorations in Section 6. The Earnest Money Deposit (EMD) shall
              be held by a mutually acceptable escrow or title agent and is
              fully refundable to Buyer during the Inspection Period.
            </p>
          </Section>

          <Section number={2} title="PROPERTY INCLUDED & EXCLUDED">
            <Sub label="(a) Property.">
              This sale covers the land at the Property Address; all residential
              buildings, units, parking areas, common areas and other permanent
              improvements on it, including building systems such as HVAC,
              electrical, plumbing, water heaters and lighting; all appliances,
              fixtures and equipment owned by Seller and located in the units or
              common areas, such as ranges, refrigerators, dishwashers, window
              coverings, Seller-owned laundry machines, and maintenance and
              landscaping equipment; and all of Seller's rights in the Leases,
              tenant security deposits, transferable warranties and guaranties,
              permits, plans, and the Property's name, if any (together, the{" "}
              <strong>"Property"</strong>).
            </Sub>
            <Sub label="(b) Excluded Items.">
              The following are excluded from the sale and remain Seller's
              property: Seller's cash, bank accounts and reserves; rent and
              other income for periods before closing, except as provided in
              Section 6; Seller's insurance policies; Seller's personal
              belongings that are not used in operating the Property; and any
              equipment owned by tenants or by third-party vendors, such as
              leased laundry machines or rented water heaters (the{" "}
              <strong>"Excluded Items"</strong>). Buyer does not assume Seller's
              employees, management agreement, or service contracts, except any
              contract Buyer elects in writing to assume under Section 7(c).
            </Sub>
            <Sub label="(c) Sale Subject to Leases.">
              The Property is sold subject to the rights of tenants in
              possession under the written leases listed on the Rent Roll (the{" "}
              <strong>"Leases"</strong>). Any unit that is vacant on the
              Effective Date or becomes vacant before closing shall be delivered
              at closing vacant, broom-clean, and free of the prior occupant's
              belongings and debris.
            </Sub>
          </Section>

          <Section number={3} title="SELLER DOCUMENT DELIVERY">
            <p>
              Within the Document Delivery period stated in the Key Terms,
              Seller shall deliver to Buyer copies of the following, to the
              extent in Seller's possession or control: (i) a current rent roll,
              certified by Seller, showing for each unit the tenant name, lease
              start and end dates, monthly rent, security deposit, any
              concessions, and any delinquency (the <strong>"Rent Roll"</strong>
              ); (ii) all Leases, amendments, and tenant applications; (iii)
              operating statements for the trailing twelve (12) months and the
              current year to date; (iv) utility bills for the past twelve (12)
              months; (v) all management, service, laundry, and other contracts
              affecting the Property; (vi) property tax bills, insurance
              policies, and insurance claims history for the past three (3)
              years; (vii) a security deposit ledger; (viii) a list of the
              Seller-owned personal property included in the sale; and (ix) any
              notices of code violations, pending evictions, litigation, or
              government orders affecting the Property. Seller represents that
              the Rent Roll and other documents it delivers are true, correct,
              and complete to Seller's knowledge, and shall certify at closing
              that the Rent Roll remains accurate as of the closing date. If
              Seller does not deliver these documents within the Document
              Delivery period, Buyer may terminate this Agreement by written
              notice at any time before they are delivered, and the EMD shall be
              refunded to Buyer in full.
            </p>
          </Section>

          <Section number={4} title="INSPECTION & DUE DILIGENCE">
            <p>
              Buyer shall have a feasibility and inspection period following the
              Effective Date for the period stated in the Key Terms (
              <strong>"Inspection Period"</strong>) to evaluate the Property.
              This may include inspection of the units, common areas and
              building systems, review of the Leases, Rent Roll and operating
              records, environmental site assessments, surveys, and zoning,
              permit and title review. Buyer, its consultants, and invited
              prospective partners or representatives shall have reasonable
              access to inspect and show the Property, including occupied units.
              Seller shall give tenants any notice of entry required by law or
              the Leases, and Buyer shall coordinate entry into occupied units
              with Seller. Buyer may cancel this Agreement for any reason or no
              reason during the Inspection Period by providing notice to Seller,
              upon which this Agreement will terminate and the Earnest Money
              Deposit shall be immediately refunded to Buyer in full.
            </p>
          </Section>

          <Section number={5} title="CLOSING & TARGETED TIMELINE">
            <Sub label="(a) Closing Date.">
              Closing shall occur within the period after the Effective Date
              stated for the Closing Date in the Key Terms (the{" "}
              <strong>"Closing Date"</strong>). If the Closing Date falls on a
              Saturday, Sunday, legal holiday, or a day the escrow/title agent
              or county recording office is closed, it shall be the next
              business day.
            </Sub>
            <Sub label="(b) Earnest Money.">
              Buyer shall deliver the EMD to the escrow/title agent within the
              Earnest Money delivery period stated in the Key Terms. If Buyer
              does not terminate this Agreement in writing before the Inspection
              Period expires, the EMD becomes non-refundable to Buyer, except
              that it shall be refunded to Buyer in full under Section 5(c),
              Section 5(d), Section 8(c), or Section 12.
            </Sub>
            <Sub label="(c) Delays Not Caused by Either Party.">
              If closing cannot occur by the Closing Date because of (i) a title
              defect, lien, or encumbrance, or (ii) a delay by the escrow/title
              agent, the recording office, or a government agency that is not
              caused by Buyer or Seller, the Closing Date shall not be extended
              automatically. Seller shall diligently work to cure any title
              matter before the Closing Date, and Buyer shall remain ready to
              close. If closing cannot occur by the Closing Date for one of
              these reasons, either party may terminate this Agreement by
              written notice; the EMD shall then be refunded to Buyer in full,
              and both parties shall be released from further obligations. Buyer
              may instead elect in writing to accept title as-is, subject to
              Section 12, and close. The Closing Date may be extended only by a
              written agreement signed by both parties.
            </Sub>
            <Sub label="(d) Seller's Failure to Close.">
              If closing does not occur because Seller fails to sign or deliver
              the deed or other closing documents, deliver possession, satisfy
              its obligations under Section 12, or otherwise perform, this
              Agreement shall not terminate automatically and Seller shall not
              benefit from Section 5(c). Seller shall be in default. Buyer shall
              be entitled to a full refund of the EMD and may pursue the
              remedies in Section 9, including specific performance.
            </Sub>
            <Sub label="(e) Buyer's Failure to Close.">
              If the Inspection Period has expired without Buyer terminating
              this Agreement and Buyer fails to close by the Closing Date (as
              extended by written agreement of the parties, if any) for any
              reason not described in Sections 5(c), 5(d) or 8(c), Seller shall
              give Buyer written notice, and Buyer shall have three (3) business
              days to close. If Buyer does not close within that time, Buyer
              shall be in default, and the EMD shall be released to Seller as
              liquidated damages, which shall be Seller's sole and exclusive
              remedy under Section 9.
            </Sub>
            <Sub label="(f) Assignment and Release of EMD.">
              Any assignment or novation under Section 10 shall not extend the
              Closing Date or change Seller's rights under this Section 5. The
              EMD shall remain in escrow, and this Section 5 shall control how
              it is released, whether or not this Agreement has been assigned or
              novated. Buyer and Seller shall each sign, within three (3)
              business days after a written request, any instructions the
              escrow/title agent requires to release the EMD as this Section 5
              provides.
            </Sub>
          </Section>

          <Section number={6} title="RENTS, DEPOSITS & PRORATIONS">
            <Sub label="(a) Rents.">
              Rent actually collected for the month in which closing occurs
              shall be prorated as of the closing date, with Buyer entitled to
              rent for the closing date and after. Delinquent rent is not
              prorated, and Buyer has no obligation to collect it. Any rent
              Buyer collects after closing from a tenant who owed rent at
              closing shall be applied first to rent owed to Buyer and then
              remitted to Seller for periods before closing.
            </Sub>
            <Sub label="(b) Security Deposits and Prepaid Rent.">
              At closing, Buyer shall receive a credit for all tenant security
              deposits, any interest on them required by law, and all rent paid
              in advance for periods after the closing date. Buyer shall hold
              and return security deposits as the law and the Leases require.
            </Sub>
            <Sub label="(c) Expenses.">
              Current-period property taxes, utilities paid by Seller, and
              charges under any service contract Buyer elects to assume shall be
              prorated as of the closing date. Seller remains responsible for
              all amounts described in Section 12.
            </Sub>
            <Sub label="(d) Not Closing Costs.">
              The credits and prorations in this Section 6 are not closing costs
              under Section 14 and shall be shown on the settlement statement.
            </Sub>
          </Section>

          <Section number={7} title="OPERATION OF PROPERTY BEFORE CLOSING">
            <Sub label="(a) Ordinary Course.">
              From the Effective Date until closing, Seller shall operate,
              manage, and maintain the Property in the ordinary course,
              consistent with past practice; shall not apply any security
              deposit except against a tenant who has vacated, as the law
              allows; and shall promptly notify Buyer in writing of any notice
              of violation, eviction, litigation, casualty, or tenant dispute
              affecting the Property.
            </Sub>
            <Sub label="(b) Leasing.">
              Seller shall not enter into, renew, amend, or terminate any Lease,
              or grant any rent concession, without Buyer's written consent,
              except that Seller may lease a vacant unit at market rent on
              Seller's standard lease form for a term of no more than twelve
              (12) months, with written notice to Buyer and a copy of the new
              Lease.
            </Sub>
            <Sub label="(c) Service Contracts.">
              Seller shall not enter into any service contract that cannot be
              terminated on thirty (30) days' notice without penalty. Before the
              Inspection Period expires, Buyer may elect in writing which
              service contracts it will assume. At closing, Seller shall
              terminate, at Seller's cost, any management agreement and every
              service contract Buyer has not elected to assume.
            </Sub>
            <Sub label="(d) Closing Deliveries.">
              At closing, Seller shall deliver an assignment of the Leases and
              security deposits, the certified Rent Roll, the original Leases
              and tenant files, all keys, codes, and remotes, and a signed
              notice to each tenant directing that future rent be paid to Buyer.
            </Sub>
          </Section>

          <Section number={8} title="CONDITION, AS-IS SALE & INSURANCE">
            <Sub label="(a) As-Is Sale; No Repairs or Modifications.">
              The buildings and Property are sold{" "}
              <strong>"AS IS, WHERE IS,"</strong> with all faults. Seller will
              not perform any repairs, improvements, or modifications to the
              Property before closing, other than ordinary maintenance and
              repairs needed to keep units habitable, and Buyer will not require
              any as a condition of closing. Buyer relies solely on its own
              inspections during the Inspection Period. Seller shall not alter,
              demolish, or remove any part of the buildings, their systems, or
              the Seller-owned personal property included in the sale before
              closing. This Section does not limit Seller's obligations under
              Sections 3, 6, 7, 8(b) and (c), or 12.
            </Sub>
            <Sub label="(b) Insurance.">
              Until the day of closing, Seller shall keep the land and buildings
              insured against fire, casualty, and liability at no less than its
              current coverage. Tenants' belongings are not covered for Buyer's
              benefit. Risk of loss to the Property remains with Seller until
              closing. Buyer is responsible for its own insurance from the day
              of closing.
            </Sub>
            <Sub label="(c) Damage Before Closing.">
              If the Property is damaged before closing, Buyer may elect either
              to (i) proceed with the transaction and receive all insurance
              proceeds payable for the damage, including any loss-of-rent
              proceeds for periods after closing, plus a credit for any
              deductible, or (ii) terminate this Agreement by written notice, in
              which case the EMD shall be refunded to Buyer in full.
            </Sub>
          </Section>

          <Section number={9} title="DEFAULT & REMEDIES">
            <p>
              If Buyer defaults under this Agreement, Seller's sole and
              exclusive remedy shall be to retain the Earnest Money Deposit as
              liquidated damages. If Seller defaults, Buyer may pursue all
              remedies allowed by law, including specific performance.
            </p>
          </Section>

          <Section number={10} title="SUCCESSORS, ASSIGNMENT & NOVATION">
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

          <Section number={11} title="ENTIRE AGREEMENT">
            <p>
              This contract constitutes the final and entire agreement between
              the parties and supersedes all prior discussions, negotiations,
              representations, or oral agreements. No modification shall be
              binding unless made in writing and signed by both parties.
            </p>
          </Section>

          <Section number={12} title="LIENS, TAXES & ENCUMBRANCES">
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

          <Section number={13} title="OFFER EXPIRATION & ACCEPTANCE">
            <p>
              This offer is strictly conditioned upon acceptance and is valid
              only for the Offer Expiration period stated in the Key Terms after
              being transmitted and delivered to Seller. If this Agreement is
              not fully executed by Seller and returned within that period, this
              offer shall automatically terminate, become null and void, and be
              of no further legal effect without requirement of written notice.
            </p>
          </Section>

          <Section number={14} title="CLOSING COSTS">
            <p>
              All closing costs associated with this transaction shall be paid
              by Buyer or, if this Agreement is assigned or novated, by the End
              Buyer (Assignee/New Buyer) at the time of closing, including title
              insurance, escrow and settlement fees, recording fees, State and
              County transfer taxes, and document preparation fees. Seller shall
              not pay any closing costs, and Seller's proceeds shall not be
              reduced by them. The credits and prorations under Section 6 and
              Seller's obligations under Section 12 are unchanged.
            </p>
          </Section>

          <AdditionalClause
            clause={additionalClause}
            number={MULTIFAMILY_ADDITIONAL_CLAUSE_NUMBER}
          />

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
          YOU WIN ESTATES — MULTIFAMILY PURCHASE AND SALE AGREEMENT
        </div>
      </div>
    );
    // `inline` renders it in place, to read its text (see
    // offerAgreementText).
    return inline ? page : createPortal(page, document.body);
  },
);

export default MultifamilyOfferPdfTemplate;
