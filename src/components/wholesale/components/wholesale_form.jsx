import { Field, Select } from "../../elements/elements";

function Wholesale_form({
  addDeal,
  form,
  handleChange,
  handleBlur,
  checkDuplicateAddress,
}) {
  const today = new Date().toISOString().slice(0, 10);

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
          <Field
            label="Property Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            onBlur={(e) => checkDuplicateAddress(e.target.value)}
            required
          />
          <Field
            label="City"
            name="city"
            value={form.city}
            onChange={handleChange}
            required
          />
          <Field
            label="Zip Code"
            name="zipCode"
            value={form.zipCode}
            onChange={handleChange}
            maxLength="5"
            required
          />
          <Field
            label="State"
            name="state"
            value={form.state}
            onChange={handleChange}
            maxLength="2"
            required
          />
          <Select
            label="Property Type"
            name="propertyType"
            value={form.propertyType}
            onChange={handleChange}
            options={["Land", "Single Family", "Multi Family"]}
            required
          />
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
            label="Rehab Cost"
            name="rehabCost"
            type="text"
            value={form.rehabCost}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
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
              name="mao"
              type="text"
              value={form.mao}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={(() => {
                const parseNumber = (val) =>
                  Number(String(val).replace(/[^0-9]/g, ""));
                const arv = parseNumber(form.arv);
                const rehab = parseNumber(form.rehabCost);
                const profit = parseNumber(form.desiredProfit);
                const calculated = arv * 0.7 - rehab - profit;
                return calculated > 0
                  ? `Suggested MAO: $${calculated.toLocaleString()}`
                  : "";
              })()}
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
            <Field
              label="Listed Price"
              name="listedPrice"
              type="text"
              value={form.listedPrice}
              onChange={handleChange}
              onBlur={handleBlur}
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
          <button className="primary-btn form-btn" type="submit">
            Save
          </button>
        </form>
      </div>
    </section>
  );
}

export default Wholesale_form;
