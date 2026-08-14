import { useEffect, useRef } from "react";
import { loadGooglePlaces, parsePlaceAddress } from "../utils/googleMapsLoader";

// Attaches Google Places autocomplete to the input `inputRef` points at.
// Calls `onSelect({ street, city, state, zipCode, formatted })` when the
// user picks a suggestion.
export function useAddressAutocomplete(inputRef, onSelect) {
  const autocompleteRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let listener;
    let cancelled = false;

    loadGooglePlaces()
      .then((places) => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new places.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["address_components", "formatted_address", "name"],
        });
        autocompleteRef.current = autocomplete;
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place?.address_components) return;
          onSelectRef.current?.(parsePlaceAddress(place));
        });
      })
      .catch((err) => {
        console.warn("[Places autocomplete] failed to load", err);
      });

    return () => {
      cancelled = true;
      if (listener) window.google?.maps?.event?.removeListener(listener);
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          autocompleteRef.current,
        );
      }
    };
  }, [inputRef]);
}
