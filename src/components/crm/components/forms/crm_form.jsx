import { useRef } from "react";
import { Field, Select } from "../../../elements/elements";
import { X } from "lucide-react";
import { useAddressAutocomplete } from "../../../../hooks/useAddressAutocomplete";

const SOURCES = [
  "Driving for Dollars",
  "MLS / Zillow",
  "Facebook / Instagram",
  "Direct Mail",
  "Cold Call",
  "Referral",
  "PropStream",
  "Propwire",
  "Auction.com",
  "Other",
];
import { STATE_OPTIONS } from "../../../../constants/stateOptions";
import { REHAB_OPTIONS } from "../../../dealAnalyzer/components/fixAndFlip/fixAndFlipConfig";
import {
  getSuggestedWholesaleMao,
  getWholesaleRehabDetails,
  DEAL_TYPES,
} from "../crmConfig";

function Wholesale_form({
  addDeal,
  form,
  formError,
  handleChange,
  handleBlur,
  handleAddressBlur,
  handleContractFileChange,
  clearContractFile,
}) {
  const addressInputRef = useRef(null);
  useAddressAutocomplete(
    addressInputRef,
    ({ street, city, state, zipCode }) => {
      handleChange({ target: { name: "address", value: street } });
      if (city) handleChange({ target: { name: "city", value: city } });
      if (state) handleChange({ target: { name: "state", value: state } });
      if (zipCode)
        handleChange({ target: { name: "zipCode", value: zipCode } });
    },
  );

  const today = new Date().toISOString().slice(0, 10);
  const {
    sqft,
    autoRehabCost,
    autoRehabEstimated,
    isManualRehab,
    rehabCostReady,
  } = getWholesaleRehabDetails(form);
  const suggestedMao = getSuggestedWholesaleMao(form);
  const suggestedMaoPlaceholder =
    suggestedMao !== 0
      ? `Suggested MAO: ${suggestedMao < 0 ? "-" : ""}$${Math.abs(suggestedMao).toLocaleString()}`
      : "";
  const isRental = form.dealType === "Potential Rental";

  const isBasePropertyComplete =
    Boolean(form.address?.trim()) &&
    Boolean(form.state?.trim()) &&
    Boolean(form.propertyType?.trim());

  const isRentalComplete =
    isBasePropertyComplete &&
    Boolean(form.onMarket?.trim()) &&
    (form.onMarket !== "Yes" || Boolean(form.listedPrice?.trim())) &&
    Boolean(form.occupied?.trim()) &&
    (form.occupied !== "Yes" || Boolean(form.rent?.trim())) &&
    Boolean(form.offerStatus?.trim()) &&
    (form.offerStatus !== "Offer Sent" || Boolean(form.offerDate?.trim())) &&
    (form.offerStatus === "Not Sent" || Boolean(form.contractPrice?.trim())) &&
    (form.offerStatus === "Not Sent" || Boolean(form.sellerAccepted?.trim())) &&
    Boolean(form.notes?.trim());

  const isWholesaleComplete =
    isBasePropertyComplete &&
    Boolean(form.arv?.trim()) &&
    rehabCostReady &&
    Boolean(form.desiredProfit?.trim()) &&
    Boolean(form.mao?.trim()) &&
    Boolean(form.onMarket?.trim()) &&
    (form.onMarket !== "Yes" || Boolean(form.listedPrice?.trim())) &&
    Boolean(form.offerStatus?.trim()) &&
    (form.offerStatus !== "Offer Sent" || Boolean(form.offerDate?.trim())) &&
    (form.offerStatus === "Not Sent" || Boolean(form.contractPrice?.trim())) &&
    (form.offerStatus === "Not Sent" || Boolean(form.sellerAccepted?.trim())) &&
    (form.sellerAccepted === "No" ||
      form.sellerAccepted === "Waiting" ||
      Boolean(form.assigned?.trim())) &&
    (form.assigned !== "Yes" ||
      (Boolean(form.assignedPrice?.trim()) &&
        Boolean(form.buyerName?.trim()) &&
        Boolean(form.buyerEmail?.trim()))) &&
    (form.jvDeal !== "Yes" ||
      (Boolean(form.jvPartnerName?.trim()) &&
        Boolean(form.jvPartnerEmail?.trim()) &&
        Boolean(form.jvSplit?.trim()))) &&
    Boolean(form.notes?.trim()) &&
    (form.closed !== "Yes" || Boolean(form.closedDate?.trim()));

  const isFormComplete = isRental ? isRentalComplete : isWholesaleComplete;

  return (
    <section
      className="panel"
      id="add-property"
      data-reveal="left"
      style={{ "--reveal-delay": "120ms" }}
    >
      <div>
        <div className="panel-header">
          <div>
            <h2>Add Property Lead</h2>
          </div>
        </div>
        <form className="add-form" onSubmit={addDeal}>
          <Select
            label="Deal Type"
            name="dealType"
            value={form.dealType || "Wholesale"}
            onChange={handleChange}
            options={DEAL_TYPES}
            required
          />
          <label className="field" style={{ gridColumn: "span 2" }}>
            <span>
              Property Address <span className="required-marker">*</span>
            </span>
            {formError && (
              <span style={{ fontSize: "0.875rem", color: "#ef4444" }}>
                {formError}
              </span>
            )}
            <input
              ref={addressInputRef}
              name="address"
              value={form.address}
              onChange={handleChange}
              onBlur={handleAddressBlur}
              required
            />
          </label>
          <label className="field">
            <span>
              State
              <span className="required-marker">*</span>
            </span>
            <select
              name="state"
              value={form.state}
              onChange={handleChange}
              disabled
              required
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Select
            label="Property Type"
            name="propertyType"
            value={form.propertyType}
            onChange={handleChange}
            options={["Land", "Single Family", "Multi Family"]}
            required
          />
          {isRental ? (
            <>
              <Select
                label="On Market"
                name="onMarket"
                value={form.onMarket}
                onChange={handleChange}
                options={["No", "Yes"]}
                required
              />
              {form.onMarket === "Yes" && (
                <>
                  <Field
                    label="Listed Price"
                    name="listedPrice"
                    type="text"
                    value={form.listedPrice}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  <Field
                    label="Agent Name"
                    name="agentName"
                    value={form.agentName}
                    onChange={handleChange}
                    placeholder="e.g. Jane Smith"
                  />
                  <Field
                    label="Agent Phone"
                    name="agentPhone"
                    type="tel"
                    value={form.agentPhone}
                    onChange={handleChange}
                    placeholder="e.g. 512-555-0100"
                  />
                  <Field
                    label="Listing URL (Zillow / MLS)"
                    name="listingUrl"
                    type="url"
                    value={form.listingUrl}
                    onChange={handleChange}
                    placeholder="e.g. https://www.zillow.com/homedetails/..."
                  />
                </>
              )}
              <label className="field">
                <span>Source</span>
                <select
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                >
                  <option value="">Select source…</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <Select
                label="Occupied"
                name="occupied"
                value={form.occupied}
                onChange={handleChange}
                options={["No", "Yes"]}
                required
              />
              {form.occupied === "Yes" && (
                <Field
                  label="Rent"
                  name="rent"
                  type="text"
                  value={form.rent}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. $1,500"
                  required
                />
              )}
              <Select
                label="Offer Status"
                name="offerStatus"
                value={form.offerStatus}
                onChange={handleChange}
                options={["Not Sent", "Offer Sent"]}
                required
              />
              {form.offerStatus === "Offer Sent" && (
                <Field
                  label="Offer Date"
                  name="offerDate"
                  type="date"
                  value={form.offerDate}
                  max={today}
                  onChange={handleChange}
                  required
                />
              )}
              {form.offerStatus !== "Not Sent" && (
                <Field
                  label="Offer Price"
                  name="contractPrice"
                  type="text"
                  value={form.contractPrice}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
              )}
              {form.offerStatus !== "Not Sent" && (
                <Select
                  label="Accepted"
                  name="sellerAccepted"
                  value={form.sellerAccepted}
                  onChange={handleChange}
                  options={["No", "Waiting", "Yes"]}
                  required
                />
              )}
            </>
          ) : (
            <>
              <Field
                label="ARV"
                name="arv"
                type="text"
                value={form.arv}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <Field
                label="Square Footage"
                name="squareFootage"
                value={form.squareFootage}
                onChange={handleChange}
                placeholder="e.g. 1,800"
              />
              <label className="field">
                <span>Rehab Type</span>
                <select
                  name="rehabType"
                  value={form.rehabType}
                  onChange={handleChange}
                >
                  {REHAB_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.rehabType !== "no-rehab" &&
                (autoRehabCost !== null ? (
                  <label className="field">
                    <span>
                      Rehab Cost
                      <span className="deal-analyzer-auto-badge">
                        {autoRehabEstimated ? "est. avg sqft" : "auto"}
                      </span>
                    </span>
                    <input
                      value={`$${autoRehabCost.toLocaleString("en-US")}`}
                      readOnly
                      tabIndex={-1}
                    />
                  </label>
                ) : (
                  <Field
                    label={
                      isManualRehab && form.rehabType && sqft > 3500
                        ? "Rehab Cost (manual — sq ft > 3,500)"
                        : "Rehab Cost"
                    }
                    name="rehabCost"
                    type="text"
                    value={form.rehabCost}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={Boolean(form.rehabType !== "no-rehab")}
                  />
                ))}
              {form.rehabType !== "no-rehab" && (
                <Field
                  label="Additional Rehab Cost"
                  name="additionalRehabCost"
                  type="text"
                  value={form.additionalRehabCost}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. $5,000"
                />
              )}
              <Field
                label="Desired Profit"
                name="desiredProfit"
                type="text"
                value={form.desiredProfit}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <label className="field">
                <span>
                  MAO
                  <span className="required-marker">*</span>
                </span>
                <input
                  required
                  id="mao"
                  name="mao"
                  type="text"
                  value={form.mao}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={suggestedMaoPlaceholder}
                />
              </label>
              <Select
                label="On Market"
                name="onMarket"
                value={form.onMarket}
                onChange={handleChange}
                options={["No", "Yes"]}
                required
              />
              {form.onMarket === "Yes" && (
                <>
                  <Field
                    label="Listed Price"
                    name="listedPrice"
                    type="text"
                    value={form.listedPrice}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  <Field
                    label="Agent Name"
                    name="agentName"
                    value={form.agentName}
                    onChange={handleChange}
                    placeholder="e.g. Jane Smith"
                  />
                  <Field
                    label="Agent Phone"
                    name="agentPhone"
                    type="tel"
                    value={form.agentPhone}
                    onChange={handleChange}
                    placeholder="e.g. 512-555-0100"
                  />
                  <Field
                    label="Listing URL (Zillow / MLS)"
                    name="listingUrl"
                    type="url"
                    value={form.listingUrl}
                    onChange={handleChange}
                    placeholder="e.g. https://www.zillow.com/homedetails/..."
                  />
                </>
              )}
              <Select
                label="Offer Status"
                name="offerStatus"
                value={form.offerStatus}
                onChange={handleChange}
                options={["Not Sent", "Offer Sent"]}
                required
              />
              {form.offerStatus === "Offer Sent" && (
                <>
                  <Field
                    label="Offer Date"
                    name="offerDate"
                    type="date"
                    value={form.offerDate}
                    max={today}
                    onChange={handleChange}
                    required
                  />
                  <label className="field">
                    <span>Contract Upload</span>
                    {form.contractFileName ? (
                      <div className="file-upload-status">
                        <span
                          className="file-upload-name"
                          title={form.contractFileName}
                        >
                          {form.contractFileName}
                        </span>
                        <button
                          type="button"
                          className="file-upload-remove-btn"
                          onClick={clearContractFile}
                          title="Remove contract"
                          aria-label="Remove contract"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="file-upload-field">
                        <label
                          htmlFor="contractUpload"
                          className="secondary-btn file-upload-trigger"
                        >
                          Choose Contract
                        </label>
                        <input
                          id="contractUpload"
                          className="file-upload-input"
                          type="file"
                          accept="application/pdf,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.formula,.odt,.odf,image/*"
                          onChange={handleContractFileChange}
                        />
                      </div>
                    )}
                  </label>
                </>
              )}
              {form.offerStatus !== "Not Sent" && (
                <Field
                  label="Contract Price"
                  name="contractPrice"
                  type="text"
                  value={form.contractPrice}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
              )}
              {form.offerStatus !== "Not Sent" && (
                <Select
                  label="Offer Accepted"
                  name="sellerAccepted"
                  value={form.sellerAccepted}
                  onChange={handleChange}
                  options={["No", "Waiting", "Yes"]}
                  required
                />
              )}
              {form.sellerAccepted !== "No" &&
                form.sellerAccepted !== "Waiting" && (
                  <Select
                    label="Assigned"
                    name="assigned"
                    value={form.assigned}
                    onChange={handleChange}
                    options={["No", "Yes"]}
                  />
                )}
              {form.assigned === "Yes" && (
                <>
                  <Field
                    label="Assigned Price"
                    name="assignedPrice"
                    type="text"
                    value={form.assignedPrice}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  <Field
                    label="Buyer Name / LLC"
                    name="buyerName"
                    value={form.buyerName || ""}
                    onChange={handleChange}
                    required
                  />
                  <Field
                    label="Buyer Email"
                    name="buyerEmail"
                    type="email"
                    value={form.buyerEmail || ""}
                    onChange={handleChange}
                    required
                  />
                </>
              )}
              <Select
                label="JV Deal?"
                name="jvDeal"
                value={form.jvDeal}
                onChange={handleChange}
                options={["No", "Yes"]}
              />
              {form.jvDeal === "Yes" && (
                <>
                  <Field
                    label="JV Partner Name"
                    name="jvPartnerName"
                    value={form.jvPartnerName || ""}
                    onChange={handleChange}
                    placeholder="e.g. Jane Smith"
                    required
                  />
                  <Field
                    label="JV Partner Email"
                    name="jvPartnerEmail"
                    type="email"
                    value={form.jvPartnerEmail || ""}
                    onChange={handleChange}
                    placeholder="e.g. jane@example.com"
                    required
                  />
                  <Field
                    label="JV Split ($)"
                    name="jvSplit"
                    type="text"
                    value={form.jvSplit || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g. $5,000"
                    required
                  />
                </>
              )}
              {form.sellerAccepted === "Yes" && form.assigned === "Yes" && (
                <>
                  <Select
                    label="Closed"
                    name="closed"
                    value={form.closed}
                    onChange={handleChange}
                    options={["No", "Yes"]}
                    required
                  />
                  {form.closed === "Yes" && (
                    <Field
                      label="Closed On"
                      name="closedDate"
                      type="date"
                      value={form.closedDate}
                      onChange={handleChange}
                      required
                    />
                  )}
                </>
              )}
            </>
          )}
          <div className="form-row-break" aria-hidden="true" />
          <label className="field notes-field">
            <span>
              Notes
              <span className="required-marker">*</span>
            </span>
            <textarea
              required
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="4"
            />
          </label>
          <button
            className="primary-btn form-btn"
            type="submit"
            disabled={!isFormComplete || !!formError}
          >
            Save
          </button>
        </form>
      </div>
    </section>
  );
}

export default Wholesale_form;
