import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AddressAutocompleteInput from "./AddressAutocompleteInput";

let placeChanged;
const place = {
  formatted_address: "420 Peete St, Covington, TN 38019, USA",
  address_components: [],
};

vi.mock("../../utils/googleMapsLoader", () => ({
  loadGooglePlaces: vi.fn(async () => ({
    Autocomplete: class {
      addListener(_event, fn) {
        placeChanged = fn;
        return {};
      }
      getPlace() {
        return place;
      }
    },
  })),
  parsePlaceAddress: () => ({ formatted: "420 Peete St, Covington, TN 38019" }),
}));

describe("AddressAutocompleteInput", () => {
  it("attaches suggestions when it appears and fills in the picked address", async () => {
    const onChange = vi.fn();
    render(
      <AddressAutocompleteInput
        value=""
        onChange={onChange}
        placeholder="Address"
      />,
    );
    await waitFor(() => expect(placeChanged).toBeTypeOf("function"));
    placeChanged();
    expect(onChange).toHaveBeenCalledWith("420 Peete St, Covington, TN 38019");
    expect(screen.getByPlaceholderText("Address")).toBeInTheDocument();
  });
});
