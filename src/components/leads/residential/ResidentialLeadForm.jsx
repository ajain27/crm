import { useRef } from "react";
import { Link2, Mail, Plus } from "lucide-react";
import { useAddressAutocomplete } from "../../../hooks/useAddressAutocomplete";
import { DEAL_TYPES } from "../../crm/components/crmConfig";
import {
  AddressField,
  FormError,
  LeadField,
  LeadSelectField,
  PhoneField,
  SourceSelectField,
  TextField,
} from "../components/LeadFormFields";
import { todayStr } from "../leadUtils";

const YES_NO = ["No", "Yes"];

// `leadForm` is the useLeadForm() state for residential leads.
export default function ResidentialLeadForm({ leadForm }) {
  const {
    form,
    saving,
    error,
    setField,
    handleChange,
    handleTrimBlur,
    handlePhoneChange,
    handleNameChange,
    handleAddressBlur,
    handleSubmit,
  } = leadForm;

  const addressInputRef = useRef(null);
  useAddressAutocomplete(addressInputRef, ({ formatted }) => {
    setField("address", formatted);
  });

  const isRental = form.dealType === "Potential Rental";

  const agentNameField = (
    <TextField
      label="Agent Name"
      name="agentName"
      value={form.agentName}
      onChange={handleNameChange}
      onBlur={handleTrimBlur}
      placeholder="Listing agent's name"
    />
  );
  const agentPhoneField = (
    <PhoneField
      label="Agent Phone"
      name="agentPhone"
      value={form.agentPhone}
      onChange={handlePhoneChange}
    />
  );
  const sellerNameField = (
    <TextField
      label="Seller Name"
      name="sellerName"
      value={form.sellerName}
      onChange={handleNameChange}
      onBlur={handleTrimBlur}
      placeholder="Seller's name"
    />
  );
  const listingUrlField = (
    <TextField
      label="Listing URL"
      icon={Link2}
      type="url"
      name="url"
      value={form.url}
      onChange={handleChange}
      onBlur={handleTrimBlur}
      placeholder="https://zillow.com/…"
    />
  );
  const sourceField = (
    <SourceSelectField value={form.source} onChange={handleChange} />
  );

  return (
    <section
      className="panel"
      data-reveal="left"
      style={{ "--reveal-delay": "80ms" }}
    >
      <div className="panel-header">
        <div>
          <h2>Add Residential Lead</h2>
          <p>Log a property you want to follow up on.</p>
        </div>
      </div>

      <form className="add-form leads-add-form" onSubmit={handleSubmit}>
        <LeadSelectField
          label="Deal Type"
          name="dealType"
          value={form.dealType || "Wholesale"}
          onChange={handleChange}
          options={DEAL_TYPES}
        />

        <AddressField
          ref={addressInputRef}
          value={form.address}
          onChange={handleChange}
          onBlur={handleAddressBlur}
          placeholder="e.g. 123 Main St, Dallas, TX 75201"
        />

        {isRental ? (
          <>
            <LeadSelectField
              label="On Market"
              name="onMarket"
              value={form.onMarket || "No"}
              onChange={handleChange}
              options={YES_NO}
            />

            {form.onMarket === "Yes" ? (
              <>
                <TextField
                  label="Listed Price"
                  name="listedPrice"
                  value={form.listedPrice}
                  onChange={handleChange}
                  placeholder="$0"
                />
                {agentNameField}
                {agentPhoneField}
                {listingUrlField}
              </>
            ) : (
              sellerNameField
            )}

            {sourceField}

            <TextField
              label="Rent"
              name="rent"
              value={form.rent}
              onChange={handleChange}
              placeholder="$0"
            />
            <LeadSelectField
              label="Occupied"
              name="occupied"
              value={form.occupied || "No"}
              onChange={handleChange}
              options={YES_NO}
            />
            <LeadSelectField
              label="Offer Status"
              name="offerStatus"
              value={form.offerStatus || "Not Sent"}
              onChange={handleChange}
              options={["Not Sent", "Offer Sent"]}
            />

            {form.offerStatus !== "Not Sent" && (
              <>
                <TextField
                  label="Offer Price"
                  name="offerPrice"
                  value={form.offerPrice}
                  onChange={handleChange}
                  placeholder="$0"
                />
                <LeadSelectField
                  label="Accepted"
                  name="sellerAccepted"
                  value={form.sellerAccepted || "No"}
                  onChange={handleChange}
                  options={["No", "Waiting", "Yes"]}
                />
              </>
            )}
          </>
        ) : (
          <>
            {sourceField}

            {form.source === "MLS / Zillow" && (
              <>
                {agentNameField}
                {agentPhoneField}
              </>
            )}

            {form.source === "Cold Call" ? sellerNameField : listingUrlField}

            <LeadField label="Follow-Up Date" required>
              <input
                type="date"
                name="followUpDate"
                value={form.followUpDate}
                onChange={handleChange}
                min={todayStr()}
                required
              />
            </LeadField>

            {form.source !== "MLS / Zillow" && (
              <>
                <TextField
                  label="Email"
                  icon={Mail}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleTrimBlur}
                  placeholder="seller@email.com"
                />
                <PhoneField
                  name="phone"
                  value={form.phone}
                  onChange={handlePhoneChange}
                />
              </>
            )}
          </>
        )}

        <LeadField label="Notes" className="leads-notes-field">
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Any initial notes about this lead…"
            rows={3}
          />
        </LeadField>

        <FormError message={error} />

        <button
          className="primary-btn form-btn"
          type="submit"
          disabled={
            !form.address.trim() ||
            (!isRental && !form.followUpDate) ||
            !!error ||
            saving
          }
        >
          <Plus size={15} />
          {saving ? "Saving…" : "Add Lead"}
        </button>
      </form>
    </section>
  );
}
