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
import "./JvAgreementPdfTemplate.css";

const COMPANY = {
  name: "YOU WIN ESTATES",
  tagline: "REAL ESTATE INVESTMENT & ACQUISITIONS",
  web: "https://www.uvinestates.com/",
  email: "youwinestates@gmail.com",
  phone: "+1 206-822-8019",
};

const PARTY_A_NAME = "You Win Estates LLC";
const PARTY_A_REP = "Ankit Jain";

// The assignment fee (Assigned Price minus Contract Price) is the JV's
// proceeds: Party B gets the JV Split and Party A the rest. An amount that
// can't be worked out yet (no assigned price, or a split bigger than the
// fee) is left blank to fill in by hand.
export function getJvAmounts({ contractPrice, assignedPrice, jvSplit }) {
  const fee =
    assignedPrice > 0 && contractPrice > 0 ? assignedPrice - contractPrice : 0;
  const total = fee > 0 ? fee : null;
  const partyB = jvSplit > 0 ? jvSplit : null;
  const partyA =
    total != null && (partyB ?? 0) <= total ? total - (partyB ?? 0) : null;
  return { total, partyA, partyB };
}

// The agreement's generation date, e.g. "October 18, 2026".
function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Amount({ value }) {
  return value != null ? fmt(value) : "$";
}

// Joint Venture Agreement generated from a JV deal. Reproduces the uploaded
// You Win Estates JV agreement clause for clause; Party B and the Property
// Address come from the deal, and the disbursement table splits the
// assignment fee. The Effective Date and both signature dates are today;
// Title / Escrow stays blank, as in the source.
const JvAgreementPdfTemplate = forwardRef(function JvAgreementPdfTemplate(
  { partnerName, propertyAddress, contractPrice, assignedPrice, jvSplit },
  ref,
) {
  const amounts = getJvAmounts({ contractPrice, assignedPrice, jvSplit });
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
            {COMPANY.email}
          </p>
          <p>
            <strong>Phone: </strong>
            {COMPANY.phone}
          </p>
        </div>
      </div>

      <div className="oa-pdf-title-bar">
        <h1>JOINT VENTURE AGREEMENT</h1>
      </div>

      <div className="oa-pdf-body">
        <p className="oa-pdf-intro">
          This Joint Venture Agreement (<strong>"Agreement"</strong>) is entered
          into and made effective as of the date of final mutual execution below
          (<strong>"Effective Date"</strong>), by and between the parties
          specified below (each a <strong>"Party"</strong> and together the{" "}
          <strong>"Parties"</strong>), for the limited purpose of the real
          estate transaction described herein:
        </p>

        <div className="oa-pdf-fields">
          <Field label="Party A Name:" value={PARTY_A_NAME} />
          <Field label="Party B Name(s):" value={partnerName} />
          <Field label="Property Address:" value={propertyAddress} />
          <Field label="Title / Escrow Company:" value="" />
          <Field label="Effective Date:" value={today} />
        </div>

        <Section number={1} title="PURPOSE & SCOPE OF JOINT VENTURE">
          <p>
            The Parties hereby form a limited joint venture (the{" "}
            <strong>"Joint Venture"</strong>) solely for the purpose of
            acquiring, assigning, marketing, and/or closing the sale of the
            Property identified above (the <strong>"Transaction"</strong>). This
            Joint Venture is limited to this single Transaction and shall not be
            construed to create a general partnership, corporation, or any
            continuing business relationship between the Parties beyond the
            Transaction.
          </p>
        </Section>

        <Section number={2} title="ROLES & CONTRIBUTIONS">
          <p>
            Unless otherwise agreed in writing, Party A shall control the
            purchase and sale agreement with the seller of the Property (the{" "}
            <strong>"Purchase Agreement"</strong>) and shall coordinate the
            Transaction with the Title / Escrow Company. Party B shall market
            the Property and/or source a qualified end buyer, and shall provide
            such other services or resources as the Parties mutually agree. Each
            Party shall act in good faith and cooperate to complete the
            Transaction by the closing date set forth in the Purchase Agreement.
          </p>
        </Section>

        <Section number={3} title="COMPENSATION & DISBURSEMENT AT CLOSING">
          <p>
            In consideration of their respective contributions, the Parties
            agree that the proceeds of the Transaction payable to the Joint
            Venture (including any assignment fee or resale profit) shall be
            divided and disbursed at closing as follows:
          </p>
          {/* Divs, not a <table>: the app's global table styles use
              color-mix(), which html2canvas can't render. */}
          <div className="jv-pdf-payees">
            <div className="jv-pdf-payees-row jv-pdf-payees-head">
              <span>Payee</span>
              <span>Payee Name</span>
              <span>Amount to be Disbursed</span>
            </div>
            <div className="jv-pdf-payees-row">
              <span>Party A</span>
              <span>{PARTY_A_NAME}</span>
              <span>
                <Amount value={amounts.partyA} />
              </span>
            </div>
            <div className="jv-pdf-payees-row">
              <span>Party B</span>
              <span>{partnerName}</span>
              <span>
                <Amount value={amounts.partyB} />
              </span>
            </div>
            <div className="jv-pdf-payees-row">
              <span>Total JV Proceeds</span>
              <span />
              <span>
                <Amount value={amounts.total} />
              </span>
            </div>
          </div>
          <p>
            The Parties hereby jointly authorize and irrevocably instruct the
            Title / Escrow Company named above to disburse the amounts set forth
            in this Section directly to each Party at closing, as separate line
            items on the final settlement statement, from the proceeds of the
            Transaction. A fully executed copy of this Agreement shall serve as
            the Parties' written disbursement instruction, and each Party shall
            sign any additional escrow instructions and provide a completed IRS
            Form W-9 and wiring instructions as reasonably required by the Title
            / Escrow Company. Each Party shall be solely responsible for its own
            taxes arising from amounts disbursed to it.
          </p>
        </Section>

        <Section number={4} title="EXPENSES">
          <p>
            Unless otherwise agreed in writing, each Party shall bear its own
            costs and expenses incurred in connection with the Transaction. Any
            shared expense approved in writing by both Parties shall be
            reimbursed to the Party that advanced it at closing, before the
            disbursement of the amounts set forth in Section 3.
          </p>
        </Section>

        <Section number={5} title="NO CLOSING, NO COMPENSATION">
          <p>
            Compensation under this Agreement is earned and payable only upon
            the successful closing of the Transaction and the funding of
            proceeds through the Title / Escrow Company. If the Transaction does
            not close for any reason, neither Party shall owe any compensation
            to the other, and any earnest money shall be returned to the Party
            that deposited it, subject to the terms of the Purchase Agreement.
          </p>
        </Section>

        <Section number={6} title="NON-CIRCUMVENTION & CONFIDENTIALITY">
          <p>
            Neither Party shall, directly or indirectly, circumvent the other
            Party by contacting or contracting with the seller, end buyer, or
            any other party introduced through this Joint Venture in connection
            with the Property without the prior written consent of the other
            Party. The Parties shall keep the terms of this Agreement and the
            Transaction confidential, except as required to close the
            Transaction or as required by law.
          </p>
        </Section>

        <Section number={7} title="INDEPENDENT PARTIES & AUTHORITY">
          <p>
            Each Party is an independent contractor, and nothing in this
            Agreement makes either Party the employee, agent, or legal
            representative of the other. Neither Party may bind the other to any
            obligation without its prior written consent. Each Party shall
            indemnify and hold the other harmless from claims arising out of its
            own negligence, misrepresentation, or breach of this Agreement.
          </p>
        </Section>

        <Section number={8} title="TERM & TERMINATION">
          <p>
            This Agreement shall terminate automatically upon the closing of the
            Transaction and the full disbursement of the amounts set forth in
            Section 3, or upon the cancellation or expiration of the Purchase
            Agreement, whichever occurs first. Sections 6 and 7 shall survive
            termination.
          </p>
        </Section>

        <Section number={9} title="GOVERNING LAW & DISPUTES">
          <p>
            This Agreement shall be governed by the laws of the State in which
            the Property is located. The Parties shall first attempt to resolve
            any dispute in good faith; if unresolved within fifteen (15) days,
            either Party may pursue any remedy available at law or in equity.
            The prevailing Party shall be entitled to recover reasonable
            attorneys' fees.
          </p>
        </Section>

        <Section number={10} title="ENTIRE AGREEMENT">
          <p>
            This Agreement constitutes the final and entire agreement between
            the Parties regarding the subject matter hereof and supersedes all
            prior discussions, negotiations, representations, or oral
            agreements. No modification shall be binding unless made in writing
            and signed by both Parties. This Agreement may be executed in
            counterparts and by electronic signature, each of which shall be
            deemed an original.
          </p>
        </Section>

        <div className="oa-pdf-warning">
          THIS IS INTENDED TO BE A LEGALLY BINDING CONTRACT. IF YOU DO NOT
          UNDERSTAND THE LEGAL EFFECT OF ANY PART OF THIS AGREEMENT, SEEK
          INDEPENDENT LEGAL COUNSEL BEFORE SIGNING.
        </div>

        <div className="oa-pdf-signatures">
          <div className="oa-pdf-sig-box">
            <h3>PARTY A</h3>
            <SigLine label="Company" value={PARTY_A_NAME} />
            <SigLine label="Authorized Representative" value={PARTY_A_REP} />
            <SigLine label="Signature" />
            <SigLine label="Date" value={today} />
          </div>
          <div className="oa-pdf-sig-box">
            <h3>PARTY B</h3>
            <SigLine label="Company" value={partnerName} />
            <SigLine label="Authorized Representative" />
            <SigLine label="Signature" />
            <SigLine label="Date" value={today} />
          </div>
        </div>
      </div>

      <div className="oa-pdf-footer">
        YOU WIN ESTATES — JOINT VENTURE AGREEMENT
      </div>
    </div>,
    document.body,
  );
});

export default JvAgreementPdfTemplate;
