import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StreetViewButton, headingBetween } from "./StreetView";

vi.mock("../../utils/googleMapsLoader", () => ({
  loadGooglePlaces: vi.fn(() => Promise.resolve()),
}));

const HOUSE = { lat: 35.2638, lng: -90.0353 };
// The nearest panorama: on the street just west of the house.
const PANO_POINT = { lat: 35.2638, lng: -90.0356 };

function mockMaps({ panoStatus = "OK", placeStatus = "OK" } = {}) {
  const Panorama = vi.fn();
  const getPanorama = vi.fn((request, callback) =>
    callback(
      panoStatus === "OK"
        ? {
            location: {
              pano: "pano-123",
              latLng: { lat: () => PANO_POINT.lat, lng: () => PANO_POINT.lng },
            },
          }
        : null,
      panoStatus,
    ),
  );
  const findPlaceFromQuery = vi.fn((request, callback) =>
    callback(
      placeStatus === "OK"
        ? [
            {
              geometry: {
                location: { lat: () => HOUSE.lat, lng: () => HOUSE.lng },
              },
            },
          ]
        : null,
      placeStatus,
    ),
  );
  window.google = {
    maps: {
      StreetViewService: vi.fn(function () {
        this.getPanorama = getPanorama;
      }),
      StreetViewPanorama: Panorama,
      StreetViewSource: { OUTDOOR: "outdoor" },
      StreetViewPreference: { NEAREST: "nearest" },
      StreetViewStatus: { OK: "OK" },
      places: {
        PlacesService: vi.fn(function () {
          this.findPlaceFromQuery = findPlaceFromQuery;
        }),
        PlacesServiceStatus: { OK: "OK" },
      },
    },
  };
  return { Panorama, getPanorama, findPlaceFromQuery };
}

describe("StreetView", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => delete window.google);

  it("works out the compass heading toward the house", () => {
    expect(headingBetween({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      0,
    );
    expect(headingBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
      90,
    );
    expect(headingBetween(PANO_POINT, HOUSE)).toBeCloseTo(90, 0);
  });

  it("opens Street View at known coordinates, facing the house", async () => {
    const { Panorama, getPanorama, findPlaceFromQuery } = mockMaps();
    render(<StreetViewButton address="5055 Belfast Dr" location={HOUSE} />);
    fireEvent.click(screen.getByText("Street View"));

    expect(screen.getByText("Loading Street View…")).toBeInTheDocument();
    await waitFor(() => expect(Panorama).toHaveBeenCalled());
    expect(findPlaceFromQuery).not.toHaveBeenCalled();
    expect(getPanorama.mock.calls[0][0]).toMatchObject({
      location: HOUSE,
      source: "outdoor",
    });
    const [container, options] = Panorama.mock.calls[0];
    expect(container).toBe(screen.getByTestId("street-view-canvas"));
    expect(options.pano).toBe("pano-123");
    expect(options.pov.heading).toBeCloseTo(90, 0);
    await waitFor(() =>
      expect(screen.queryByText("Loading Street View…")).toBeNull(),
    );
  });

  it("looks the address up when there are no coordinates", async () => {
    const { Panorama, findPlaceFromQuery } = mockMaps();
    render(<StreetViewButton address="5055 Belfast Dr, Memphis, TN" />);
    fireEvent.click(screen.getByText("Street View"));
    await waitFor(() => expect(Panorama).toHaveBeenCalled());
    expect(findPlaceFromQuery.mock.calls[0][0]).toMatchObject({
      query: "5055 Belfast Dr, Memphis, TN",
    });
  });

  it("says when Street View isn't available there", async () => {
    mockMaps({ panoStatus: "ZERO_RESULTS" });
    render(<StreetViewButton address="1 Remote Rd" location={HOUSE} />);
    fireEvent.click(screen.getByText("Street View"));
    expect(
      await screen.findByText("Street View isn't available for this address."),
    ).toBeInTheDocument();
  });

  it("doesn't let clicks reach a clickable row behind it", () => {
    mockMaps();
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick}>
        <StreetViewButton address="5055 Belfast Dr" location={HOUSE} />
      </div>,
    );
    fireEvent.click(screen.getByText("Street View"));
    fireEvent.click(screen.getByTestId("street-view-canvas"));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
