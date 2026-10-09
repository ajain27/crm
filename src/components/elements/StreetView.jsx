import { useEffect, useRef, useState } from "react";
import { Eye, Loader } from "lucide-react";
import Modal from "../modal/Modal";
import { loadGooglePlaces } from "../../utils/googleMapsLoader";
import "./StreetView.css";

// Compass heading from one point to another, in degrees — used to turn the
// Street View camera toward the house.
export function headingBetween(from, to) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLng = rad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(rad(to.lat));
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// The address's coordinates via Google Places (enabled for address
// autocomplete), for places we don't already have coordinates for.
function findPlaceLocation(maps, address) {
  return new Promise((resolve, reject) => {
    const service = new maps.places.PlacesService(
      document.createElement("div"),
    );
    service.findPlaceFromQuery(
      { query: address, fields: ["geometry"] },
      (results, status) => {
        const location = results?.[0]?.geometry?.location;
        if (status === maps.places.PlacesServiceStatus.OK && location) {
          resolve({ lat: location.lat(), lng: location.lng() });
        } else {
          reject(new Error("Couldn't find this address on Google Maps."));
        }
      },
    );
  });
}

function nearestPanorama(maps, location) {
  return new Promise((resolve, reject) => {
    new maps.StreetViewService().getPanorama(
      {
        location,
        radius: 75,
        source: maps.StreetViewSource.OUTDOOR,
        preference: maps.StreetViewPreference.NEAREST,
      },
      (data, status) => {
        if (status === maps.StreetViewStatus.OK && data?.location) {
          resolve(data.location);
        } else {
          reject(new Error("Street View isn't available for this address."));
        }
      },
    );
  });
}

// Google Street View of `address`, facing the house. Pass `location`
// ({ lat, lng }) when known; otherwise the address is looked up.
export function StreetViewModal({ address, location, onClose }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGooglePlaces();
        const maps = window.google.maps;
        const target = location || (await findPlaceLocation(maps, address));
        const pano = await nearestPanorama(maps, target);
        if (cancelled || !containerRef.current) return;
        const panoPoint = { lat: pano.latLng.lat(), lng: pano.latLng.lng() };
        new maps.StreetViewPanorama(containerRef.current, {
          pano: pano.pano,
          pov: { heading: headingBetween(panoPoint, target), pitch: 0 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true,
          motionTracking: false,
        });
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Couldn't load Street View.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Street View — ${address}`}
      className="street-view-modal"
      style={{
        width: "min(960px, 96vw)",
        maxWidth: "min(960px, 96vw)",
        height: "auto",
      }}
    >
      <div className="street-view-body">
        <div
          ref={containerRef}
          className="street-view-canvas"
          data-testid="street-view-canvas"
          hidden={status === "error"}
        />
        {status === "loading" && (
          <div className="street-view-overlay">
            <Loader className="loading-spinner" size={22} />
            <span>Loading Street View…</span>
          </div>
        )}
        {status === "error" && <p className="street-view-error">{error}</p>}
      </div>
    </Modal>
  );
}

// "Street View" button that opens the Street View window.
export function StreetViewButton({
  address,
  location,
  compact = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  if (!address && !location) return null;
  return (
    <>
      <button
        type="button"
        className={
          className ||
          `street-view-btn${compact ? " street-view-btn--compact" : ""}`
        }
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`Street View of ${address}`}
        aria-label={compact ? `Street View of ${address}` : undefined}
      >
        <Eye size={className ? 13 : 12} />
        {!compact && "Street View"}
      </button>
      {open && (
        // The window is portaled, but React still bubbles its clicks to
        // this button's parents — keep them from reaching a clickable row.
        <span onClick={(e) => e.stopPropagation()}>
          <StreetViewModal
            address={address}
            location={location}
            onClose={() => setOpen(false)}
          />
        </span>
      )}
    </>
  );
}
