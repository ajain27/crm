import { useEffect, useRef, useState } from "react";
import { Loader } from "lucide-react";
import { loadGooglePlaces } from "../../../utils/googleMapsLoader";
import { findPlaceLocation } from "../../elements/StreetView";
import { shortPrice } from "./leadComps";
import "./LeadComps.css";

const HOUSE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z"/></svg>';

// A pin drawn as HTML at a map position: a price pill for each comp and a
// house marker for the subject. Built once Google Maps has loaded, since
// it extends google.maps.OverlayView.
function pinOverlayClass(maps) {
  return class PinOverlay extends maps.OverlayView {
    constructor(position, element) {
      super();
      this.position = position;
      this.element = element;
      maps.OverlayView.preventMapHitsAndGesturesFrom(element);
    }
    onAdd() {
      this.getPanes().overlayMouseTarget.appendChild(this.element);
    }
    draw() {
      const at = this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (!at) return;
      this.element.style.left = `${at.x}px`;
      this.element.style.top = `${at.y}px`;
    }
    onRemove() {
      this.element.remove();
    }
  };
}

function pinElement(point, onSelect) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `comps-map-pin ${point.kind === "subject" ? "is-subject" : ""}`;
  el.title = point.address;
  el.setAttribute(
    "aria-label",
    point.kind === "subject"
      ? `Subject property: ${point.address}`
      : `${point.address}, sold ${shortPrice(point.price)}`,
  );
  if (point.kind === "subject") el.innerHTML = HOUSE_ICON;
  else el.textContent = shortPrice(point.price);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect(point.key);
  });
  return el;
}

// Google map of the subject and its comps. `points` are
// { key, kind: "subject" | "comp", address, price, lat, lng }; points
// without coordinates are looked up by address. Clicking a pin calls
// `onSelect(key)`; the `selectedKey` pin is highlighted and kept in view.
// `mapTypeId` ("roadmap", "hybrid", …) and `zoom` (used when there's a
// single point) suit a map of just one property.
export default function CompsMap({
  points,
  selectedKey,
  onSelect,
  mapTypeId = "roadmap",
  zoom = 14,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pinsRef = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState("loading");
  const [missing, setMissing] = useState(0);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const pointsKey = points
    .map((p) => `${p.key}|${p.address}|${p.lat}|${p.lng}`)
    .join("\n");

  useEffect(() => {
    let cancelled = false;
    const overlays = [];

    (async () => {
      try {
        await loadGooglePlaces();
        const maps = window.google.maps;
        if (cancelled || !containerRef.current) return;

        const located = await Promise.all(
          points.map(async (p) => {
            if (p.lat != null && p.lng != null) return p;
            try {
              return { ...p, ...(await findPlaceLocation(maps, p.address)) };
            } catch {
              return null;
            }
          }),
        );
        if (cancelled || !containerRef.current) return;
        const found = located.filter(Boolean);
        setMissing(points.length - found.length);
        if (!found.length) {
          setStatus("error");
          return;
        }

        const map =
          mapRef.current ||
          new maps.Map(containerRef.current, {
            center: found[0],
            zoom,
            mapTypeId,
            // Lets a satellite view switch back to the road map.
            mapTypeControl: mapTypeId !== "roadmap",
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
            styles: [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] },
            ],
          });
        mapRef.current = map;

        const PinOverlay = pinOverlayClass(maps);
        const bounds = new maps.LatLngBounds();
        pinsRef.current = new Map();
        found.forEach((p) => {
          const element = pinElement(p, (key) => onSelectRef.current?.(key));
          const position = new maps.LatLng(p.lat, p.lng);
          const overlay = new PinOverlay(position, element);
          overlay.setMap(map);
          overlays.push(overlay);
          pinsRef.current.set(p.key, { element, position });
          bounds.extend(position);
        });
        if (found.length > 1) map.fitBounds(bounds, 48);
        else map.setCenter(found[0]);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      overlays.forEach((o) => o.setMap(null));
    };
    // `points` is captured through pointsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  useEffect(() => {
    pinsRef.current.forEach(({ element }, key) =>
      element.classList.toggle("is-selected", key === selectedKey),
    );
    const pin = pinsRef.current.get(selectedKey);
    const map = mapRef.current;
    if (pin && map && !map.getBounds()?.contains(pin.position)) {
      map.panTo(pin.position);
    }
  }, [selectedKey, status]);

  return (
    <div className="comps-map">
      <div ref={containerRef} className="comps-map-canvas" />
      {status === "loading" && (
        <div className="comps-map-status">
          <Loader className="loading-spinner" size={18} />
          Loading map…
        </div>
      )}
      {status === "error" && (
        <div className="comps-map-status">
          {points.length === 1
            ? "Couldn't find this address on the map."
            : "Couldn't load the map for these addresses."}
        </div>
      )}
      {status === "ready" && missing > 0 && (
        <div className="comps-map-note">
          {missing} {missing === 1 ? "address" : "addresses"} couldn't be found
          on the map.
        </div>
      )}
    </div>
  );
}
