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
import "./AssignmentPdfTemplate.css";

const COMPANY = {
  name: "YOU WIN ESTATES",
  tagline: "REAL ESTATE INVESTMENT & ACQUISITIONS",
  web: "https://www.uvinestates.com/",
  email: "youwinestates@gmail.com",
  phone: "+1 206-822-8019",
};

const ASSIGNOR_NAME = "You Win Estates LLC";
const ASSIGNOR_REP = "Ankit Jain";
const DEPOSIT_RATE = 0.1;

// A date as e.g. "October 18, 2026"; today when none is given. A
// "YYYY-MM-DD" date is read as a local date so it doesn't shift a day.
function formatDate(isoDate) {
  const [y, m, d] = String(isoDate || "")
    .split("-")
    .map(Number);
  const date = y && m && d ? new Date(y, m - 1, d) : new Date();
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// A value written into a sentence, or a dotted line to fill in by hand.
function Blank({ children }) {
  return children ? (
    <span className="oa-pdf-inline-field">{children}</span>
  ) : (
    <span className="asg-pdf-blank" />
  );
}

// Assignment of Contract generated from an assigned deal. Reproduces the
// uploaded You Win Estates assignment clause for clause; the Assignee is
// the deal's buyer, the Assignment Price its Assigned Price, and the
// Assignee Deposit 10% of that. The Original Agreement is dated the deal's
// Offer Date (today if it has none); both signature dates are today.
const AssignmentPdfTemplate = forwardRef(function AssignmentPdfTemplate(
  { assigneeName, propertyAddress, assignedPrice, originalAgreementDate },
  ref,
) {
  const deposit = Math.round(assignedPrice * DEPOSIT_RATE);
  const today = formatDate();

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
        <h1>ASSIGNMENT OF CONTRACT</h1>
      </div>

      <div className="oa-pdf-body">
        <p className="oa-pdf-intro">
          This Assignment of Contract (<strong>"Assignment"</strong>) is entered
          into and made effective as of the date of final mutual acceptance
          execution below (<strong>"Effective Date"</strong>), by and between
          the parties specified below:
        </p>

        <div className="oa-pdf-fields">
          <Field label="Assignor Name:" value={ASSIGNOR_NAME} />
          <Field label="Assignee Name(s):" value={assigneeName} />
          <Field label="Property Address:" value={propertyAddress} />
        </div>

        <Section number={1} title="RECITALS & ORIGINAL AGREEMENT">
          <p>
            Assignor, as Buyer, entered into that certain Purchase and Sale
            Agreement (the <strong>"Original Agreement"</strong>) with Seller,
            dated <Blank>{formatDate(originalAgreementDate)}</Blank>, for the
            purchase of the Property identified above. Pursuant to Section 6
            (Successors, Assignment & Novation) of the Original Agreement,
            Assignor reserved the unrestricted right to assign the Original
            Agreement, and Seller consented in advance to such assignment.
            Assignor now desires to assign, and Assignee desires to accept, all
            of Assignor's rights, title, and interest in and to the Original
            Agreement upon the terms set forth herein.
          </p>
        </Section>

        <Section number={2} title="ASSIGNMENT PRICE & FINANCIAL TERMS">
          <p>
            <strong>Assignment Price: </strong>
            <Blank>{assignedPrice > 0 ? fmt(assignedPrice) : null}</Blank>
            &nbsp;&nbsp;&nbsp; <strong>Assignee Deposit: </strong>
            <Blank>{deposit > 0 ? fmt(deposit) : null}</Blank>
          </p>
          <p>
            The Assignment Price is the total purchase price at which the
            Original Agreement is assigned to Assignee, and shall be paid by
            Assignee at closing in immediately available funds through the
            escrow or title agent. The Assignee Deposit shall be delivered to
            the escrow or title agent upon execution of this Assignment and
            shall be credited toward the Assignment Price at closing.
          </p>
        </Section>

        <Section
          number={3}
          title="ASSIGNMENT OF RIGHTS & ASSUMPTION OF OBLIGATIONS"
        >
          <p>
            Assignor hereby assigns, transfers, and conveys to Assignee all of
            Assignor's rights, title, and interest in and to the Original
            Agreement, including the right to purchase the Property and any
            earnest money credits thereunder. Assignee hereby accepts such
            assignment and assumes and agrees to perform all of the covenants,
            duties, and obligations of the Buyer under the Original Agreement,
            including payment of all sums due and completion of closing within
            the timeline set forth in the Original Agreement.
          </p>
        </Section>

        <Section number={4} title="RELEASE OF ASSIGNOR">
          <p>
            Upon execution of this Assignment and delivery of written notice to
            Seller, Assignor shall be fully and unconditionally released and
            discharged from all further liability, covenants, and performance
            under the Original Agreement, and Assignee shall stand in the place
            of Assignor as the Buyer for all purposes thereunder, in accordance
            with Section 6 of the Original Agreement.
          </p>
        </Section>

        <Section number={5} title="CLOSING">
          <p>
            Closing shall occur through the escrow or title agent designated
            under the Original Agreement, on or before the closing date set
            forth therein, unless extended or modified by the parties in
            writing. Assignee shall execute all documents and deposit all funds
            required to complete the transaction.
          </p>
        </Section>

        <Section number={6} title="REPRESENTATIONS & CONDITION OF PROPERTY">
          <p>
            Assignee acknowledges that it has received a complete copy of the
            Original Agreement, has had the opportunity to inspect the Property,
            and accepts the Property in its present "AS-IS, WHERE-IS" condition,
            subject to the terms of the Original Agreement. Assignor makes no
            representations or warranties regarding the Property except as
            expressly stated in the Original Agreement.
          </p>
        </Section>

        <Section number={7} title="DEFAULT & REMEDIES">
          <p>
            If Assignee defaults under this Assignment, Assignor's sole and
            exclusive remedy shall be to retain the Assignee Deposit as
            liquidated damages and this Assignment shall terminate, with all
            rights under the Original Agreement reverting to Assignor. If
            Assignor defaults, Assignee may pursue all remedies allowed by law.
          </p>
        </Section>

        <Section number={8} title="ENTIRE AGREEMENT">
          <p>
            This Assignment, together with the Original Agreement, constitutes
            the final and entire agreement between the parties regarding the
            subject matter hereof and supersedes all prior discussions,
            negotiations, representations, or oral agreements. No modification
            shall be binding unless made in writing and signed by both parties.
          </p>
        </Section>

        <div className="oa-pdf-warning">
          THIS IS INTENDED TO BE A LEGALLY BINDING CONTRACT. IF YOU DO NOT
          UNDERSTAND THE LEGAL EFFECT OF ANY PART OF THIS AGREEMENT, SEEK
          INDEPENDENT LEGAL COUNSEL BEFORE SIGNING.
        </div>

        <div className="oa-pdf-signatures">
          <div className="oa-pdf-sig-box">
            <h3>ASSIGNOR</h3>
            <SigLine label="Company" value={ASSIGNOR_NAME} />
            <SigLine label="Authorized Representative" value={ASSIGNOR_REP} />
            <SigLine label="Signature" />
            <SigLine label="Date" value={today} />
          </div>
          <div className="oa-pdf-sig-box">
            <h3>ASSIGNEE</h3>
            <SigLine label="Printed Name / Company" value={assigneeName} />
            <SigLine label="Authorized Representative" />
            <SigLine label="Signature" />
            <SigLine label="Date" value={today} />
          </div>
        </div>
      </div>

      <div className="oa-pdf-footer">
        YOU WIN ESTATES — ASSIGNMENT OF CONTRACT
      </div>
    </div>,
    document.body,
  );
});

export default AssignmentPdfTemplate;
