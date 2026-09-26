import { useRef } from "react";
import { Globe, Plus } from "lucide-react";
import { useAddressAutocomplete } from "../../../hooks/useAddressAutocomplete";
import { STATE_OPTIONS } from "../../../constants/stateOptions";
import {
  AddressField,
  FormError,
  LeadField,
  LeadSelectField,
  PhoneField,
  SourceSelectField,
  TextField,
} from "../components/LeadFormFields";
import { COMMERCIAL_PROPERTY_TYPES } from "../leadsConfig";

// `leadForm` is the useLeadForm() state for commercial leads.
export default function CommercialLeadForm({ leadForm }) {
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

  return (
    <section
      className="panel"
      data-reveal="left"
      style={{ "--reveal-delay": "80ms" }}
    >
      <div className="panel-header">
        <div>
          <h2>Add Commercial Lead</h2>
          <p>Log a commercial property you want to track.</p>
        </div>
      </div>

      <form className="add-form leads-add-form" onSubmit={handleSubmit}>
        <TextField
          label="Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          onBlur={handleTrimBlur}
          placeholder="e.g. Office Building, Retail Strip…"
        />

        <AddressField
          ref={addressInputRef}
          value={form.address}
          onChange={handleChange}
          onBlur={handleAddressBlur}
          placeholder="e.g. 500 Commerce St, Dallas, TX 75201"
        />

        <LeadSelectField
          label="Property Type"
          name="propertyType"
          value={form.propertyType}
          onChange={handleChange}
          options={COMMERCIAL_PROPERTY_TYPES}
          placeholder="Select type…"
        />

        <SourceSelectField value={form.source} onChange={handleChange} />

        {form.source === "Cold Call" && (
          <>
            <TextField
              label="Seller Name"
              name="sellerName"
              value={form.sellerName}
              onChange={handleNameChange}
              onBlur={handleTrimBlur}
              placeholder="Seller's name"
            />
            <TextField
              label="Seller Email"
              type="email"
              name="sellerEmail"
              value={form.sellerEmail}
              onChange={handleChange}
              onBlur={handleTrimBlur}
              placeholder="seller@email.com"
            />
          </>
        )}

        <LeadSelectField
          label="State"
          name="state"
          value={form.state}
          onChange={handleChange}
          options={STATE_OPTIONS}
          placeholder="Select state…"
        />

        <TextField
          label="Website"
          icon={Globe}
          type="url"
          name="website"
          value={form.website}
          onChange={handleChange}
          onBlur={handleTrimBlur}
          placeholder="https://loopnet.com/…"
        />

        <PhoneField
          name="phone"
          value={form.phone}
          onChange={handlePhoneChange}
        />

        <LeadField label="Notes" style={{ gridColumn: "1 / -1" }}>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Add notes about this lead…"
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
        </LeadField>

        <FormError message={error} />

        <button
          className="primary-btn form-btn"
          type="submit"
          disabled={!form.address.trim() || saving}
        >
          <Plus size={15} />
          {saving ? "Saving…" : "Add Lead"}
        </button>
      </form>
    </section>
  );
}
