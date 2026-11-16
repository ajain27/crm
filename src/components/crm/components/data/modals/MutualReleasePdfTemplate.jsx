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
import "./AssignmentPdfTemplate.css";
import "./MutualReleasePdfTemplate.css";

const COMPANY = {
  name: "YOU WIN ESTATES",
  tagline: "REAL ESTATE INVESTMENT & ACQUISITIONS",
  web: "https://www.uvinestates.com/",
  email: "youwinestates@gmail.com",
  phone: "+1 206-822-8019",
};

const BUYER_NAME = "You Win Estates, and/or assigns";
const BUYER_COMPANY = "You Win Estates";
const BUYER_REP = "Ankit Jain";
const BUYER_INITIALS = "AJ";

// How the EMD is handled, as chosen in the Cancel Deal window.
export const EMD_NONE = "none";
export const EMD_REFUND = "refund";
export const EMD_OTHER = "other";

// A date as e.g. "October 18, 2026"; today when none is given. A
// "YYYY-MM-DD" date is read as a local date so it doesn't shift a day.
export function formatReleaseDate(isoDate) {
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
function Blank({ children, wide }) {
  return children ? (
    <span className="oa-pdf-inline-field">{children}</span>
  ) : (
    <span className={`asg-pdf-blank${wide ? " mr-pdf-blank-wide" : ""}`} />
  );
}

// One "check one" option in the EMD section, marked when it's the one
// chosen.
function CheckOption({ checked, children }) {
  return (
    <p className="mr-pdf-check-row">
      <span className="mr-pdf-check-box">{checked ? "X" : ""}</span>
      <span>{children}</span>
    </p>
  );
}

// Mutual Release & Cancellation Agreement, generated from a deal to cancel
// it. Reproduces the uploaded You Win Estates release clause for clause.
// Seller Name(s), Property Address and the Agreement Date (the deal's Offer
// Date) are filled in from the deal; the Escrow / File No. and how the EMD
// is handled come from the Cancel Deal window. Buyer signs and dates today;
// the Seller's lines are left to fill in by hand, with their printed name.
const MutualReleasePdfTemplate = forwardRef(function MutualReleasePdfTemplate(
  {
    sellerName,
    propertyAddress,
    agreementDate,
    escrowNumber,
    emdHandling = EMD_NONE,
    emdAmount = 0,
    emdOther = "",
  },
  ref,
) {
  const today = formatReleaseDate();

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
        <h1>MUTUAL RELEASE &amp; CANCELLATION AGREEMENT</h1>
      </div>

      <div className="oa-pdf-body">
        <p className="oa-pdf-intro">
          This Mutual Release and Cancellation Agreement (
          <strong>"Release"</strong>) is entered into and made effective as of
          the date of the last signature below (<strong>"Release Date"</strong>)
          by and between the parties specified below, who are parties to the
          Purchase and Sale Agreement for the Property described below, together
          with any addenda, amendments, assignments, or novations (collectively,
          the <strong>"Agreement"</strong>).
        </p>

        <div className="oa-pdf-fields">
          <Field label="Seller Name(s):" value={sellerName} />
          <Field label="Buyer Name:" value={BUYER_NAME} />
          <Field label="Property Address:" value={propertyAddress} />
          <Field
            label="Agreement Date:"
            value={agreementDate ? formatReleaseDate(agreementDate) : ""}
          />
          <Field label="Escrow / File No.:" value={escrowNumber} />
        </div>

        <Section number={1} title="CANCELLATION OF AGREEMENT">
          <p>
            Buyer and Seller mutually agree that the Agreement is cancelled and
            terminated in its entirety as of the Release Date. From the Release
            Date, the Agreement is null and void and of no further force or
            effect, and neither party shall have any further rights, duties, or
            obligations under it, except as expressly stated in this Release.
            This cancellation is by mutual consent and is not a default by
            either party.
          </p>
        </Section>

        <Section number={2} title="EARNEST MONEY DEPOSIT (EMD)">
          <p>
            The parties agree the EMD shall be handled as follows (check one):
          </p>
          <div className="mr-pdf-checks">
            <CheckOption checked={emdHandling === EMD_NONE}>
              No EMD was deposited with any escrow/title agent under the
              Agreement.
            </CheckOption>
            <CheckOption checked={emdHandling === EMD_REFUND}>
              The EMD of{" "}
              <Blank>
                {emdHandling === EMD_REFUND && emdAmount > 0
                  ? fmt(emdAmount)
                  : null}
              </Blank>{" "}
              shall be refunded <strong>in full to Buyer</strong>.
            </CheckOption>
            <CheckOption checked={emdHandling === EMD_OTHER}>
              Other:{" "}
              <Blank wide>
                {emdHandling === EMD_OTHER ? emdOther.trim() : null}
              </Blank>
            </CheckOption>
          </div>
          <p>
            Each party shall sign, within three (3) business days after a
            written request, any cancellation or release instructions the
            escrow/title agent requires to carry out this Section. Any escrow or
            title cancellation fees shall be paid by Buyer, consistent with
            Section 10 of the Agreement, and shall not be charged to Seller.
            Neither party shall make any other claim to the EMD.
          </p>
        </Section>

        <Section number={3} title="MUTUAL RELEASE">
          <p>
            Each party, for itself and its heirs, successors, assigns,
            affiliates, members, managers, officers, agents, and
            representatives, fully and forever releases and discharges the other
            party and all of the same persons from any and all claims, demands,
            causes of action, damages, liabilities, costs, and obligations of
            every kind, whether known or unknown, suspected or unsuspected,
            arising out of or relating to the Agreement, the Property, or the
            proposed sale, including any claim for specific performance, breach,
            default, liquidated damages, or the EMD (except as provided in
            Section 2). Each party waives the benefit of any law that would
            otherwise limit this release to claims known or suspected at the
            time of signing.
          </p>
        </Section>

        <Section number={4} title="SELLER FREE TO MARKET & SELL THE PROPERTY">
          <p>
            Seller is free to market, list, show, sell, lease, finance, or
            otherwise transfer the Property to any other buyer, investor, or
            third party, at any price and on any terms, without notice to,
            consent of, or payment of any fee or compensation to Buyer. Buyer
            waives and releases any right, title, interest, or claim in or to
            the Property, including any equitable interest, option, right of
            first refusal, right to purchase, or assignment fee arising under
            the Agreement.
          </p>
        </Section>

        <Section number={5} title="ASSIGNEES, PARTNERS & THIRD PARTIES">
          <p>
            Buyer represents that it has not assigned or novated the Agreement
            to any party, or, if it has, that every assignment, novation, or
            agreement with any Assignee/New Buyer, end buyer, partner, or
            investor relating to the Property is terminated by this Release.
            Buyer shall be solely responsible for, and shall hold Seller
            harmless from, any claim by any person claiming rights in the
            Property through Buyer, including any claim to purchase the Property
            or for any assignment fee, deposit, or marketing cost.
          </p>
        </Section>

        <Section number={6} title="RECORDED DOCUMENTS, MARKETING & ACCESS">
          <p>
            Buyer represents that it has not recorded any memorandum, affidavit,
            lis pendens, or other document against the Property. If any such
            document was recorded by or for Buyer, Buyer shall record a release
            of it within five (5) business days after the Release Date at
            Buyer's sole cost. Within two (2) business days after the Release
            Date, Buyer shall remove all advertising, listings, and online or
            social media marketing of the Property made by or for Buyer, shall
            have no further right of access to the Property, and shall return
            any keys, codes, or access devices. Seller shall have no obligation
            to Buyer for any inspection, report, or due diligence cost, and
            Buyer shall have no obligation to Seller for the Property's
            condition.
          </p>
        </Section>

        <Section number={7} title="MUTUAL INDEMNIFICATION & HOLD HARMLESS">
          <p>
            Each party (the <strong>"Indemnifying Party"</strong>) shall
            indemnify, defend, and hold harmless the other party from and
            against any claim, demand, loss, liability, or expense, including
            reasonable attorney fees, brought by any third party that arises
            from the Indemnifying Party's own acts, omissions, representations,
            or agreements relating to the Property or the Agreement. For Buyer,
            this includes claims of any assignee, end buyer, partner, investor,
            contractor, or broker engaged by Buyer. For Seller, this includes
            claims of any lender, tenant, occupant, other buyer, or broker
            engaged by Seller. This Section survives the Release.
          </p>
        </Section>

        <Section number={8} title="NO BROKER FEES OR COMMISSIONS">
          <p>
            Each party represents that no real estate commission, finder's fee,
            or other compensation is owed to any broker, agent, or finder
            through that party as a result of the Agreement or this Release, and
            shall hold the other party harmless from any such claim made through
            it.
          </p>
        </Section>

        <Section number={9} title="NO ADMISSION OF LIABILITY">
          <p>
            This Release is a compromise and mutual accommodation. Nothing in it
            is an admission by either party of any breach, default, fault, or
            liability.
          </p>
        </Section>

        <Section number={10} title="AUTHORITY & VOLUNTARY AGREEMENT">
          <p>
            Each person signing this Release represents that he or she is
            authorized to sign it on behalf of the party for whom he or she
            signs; that all owners of the Property and all parties to the
            Agreement have signed or consented; and that he or she has read and
            understands this Release, has had the opportunity to consult
            independent legal counsel, and signs it voluntarily.
          </p>
        </Section>

        <Section number={11} title="GENERAL PROVISIONS">
          <p>
            This Release is the entire agreement of the parties regarding the
            cancellation of the Agreement and supersedes all prior discussions
            on that subject. It may be changed only in a writing signed by both
            parties. It shall bind and benefit the parties and their respective
            heirs, successors, and assigns, and shall be governed by the laws of
            the state in which the Property is located. If any provision is held
            unenforceable, the remaining provisions shall remain in full effect.
            This Release may be signed in counterparts and by electronic
            signature, and copies, scans, and electronic signatures shall be
            treated as originals.
          </p>
        </Section>

        <div className="oa-pdf-warning">
          THIS IS INTENDED TO BE A LEGALLY BINDING CONTRACT. IF YOU DO NOT
          UNDERSTAND THE LEGAL EFFECT OF ANY PART OF THIS RELEASE, SEEK
          INDEPENDENT LEGAL COUNSEL BEFORE SIGNING.
        </div>

        <div className="oa-pdf-signatures">
          <div className="oa-pdf-sig-box">
            <h3>SELLER</h3>
            <SigLine label="Signature" />
            <SigLine label="Printed Name" value={sellerName} />
            <SigLine label="Date" />
          </div>
          <div className="oa-pdf-sig-box">
            <h3>BUYER</h3>
            <SigLine label="Company" value={BUYER_COMPANY} />
            <SigLine label="Authorized Representative" value={BUYER_REP} />
            <SigLine label="Signature" signature={COMPANY_SIGNATURE} />
            <SigLine label="Date" value={today} />
            <p className="oa-pdf-sig-caption">{BUYER_NAME}</p>
          </div>
        </div>
      </div>

      <div className="oa-pdf-footer mr-pdf-footer">
        <span>YOU WIN ESTATES — MUTUAL RELEASE &amp; CANCELLATION</span>
        <span>
          Seller Initials: <span className="mr-pdf-initials" /> Buyer Initials:{" "}
          <span className="mr-pdf-initials oa-pdf-sig-script">
            {BUYER_INITIALS}
          </span>
        </span>
      </div>
    </div>,
    document.body,
  );
});

export default MutualReleasePdfTemplate;
