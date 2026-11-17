import { useRef } from "react";
import { useAddressAutocomplete } from "../../hooks/useAddressAutocomplete";

// An address input with Google Places suggestions. It owns its ref, so the
// suggestions attach whenever the input appears (e.g. a tab or window that
// opens later), not only when the page first loads. Picking a suggestion
// calls `onChange` with the full formatted address.
export default function AddressAutocompleteInput({
  value,
  onChange,
  ...props
}) {
  const inputRef = useRef(null);
  useAddressAutocomplete(inputRef, ({ formatted }) => onChange(formatted));
  return (
    <input
      {...props}
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
