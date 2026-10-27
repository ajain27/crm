import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";
import Modal from "../modal/Modal";
import FavoriteButton from "./FavoriteButton";
import Spinner from "../elements/Spinner";
import { StreetViewButton } from "../elements/StreetView";
import { smsHref } from "../leads/components/LeadTableCells";
import LeadCompsPanel from "../leads/comps/LeadCompsPanel";
import { leadComps, medianPricePerSqft } from "../leads/comps/leadComps";
import { displayPhone } from "../../utils/utils";
import {
  HOME_TYPES,
  belowZestimate,
  keywordLabel,
  money,
  pricePerSqft,
} from "./marketDeals";

// "248-765-9901" → "tel:+12487659901".
function telHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `tel:+1${digits}` : `tel:+${digits}`;
}

function Gallery({ photos, alt }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [photos]);
  if (!photos.length) {
    return (
      <div className="omd-gallery-empty">
        <ImageOff size={28} />
        No photos
      </div>
    );
  }
  const go = (step) =>
    setIndex((i) => (i + step + photos.length) % photos.length);
  return (
    <div className="omd-gallery">
      <div className="omd-gallery-main">
        <img src={photos[index]} alt={`${alt}, photo ${index + 1}`} />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="omd-gallery-nav omd-gallery-prev"
              onClick={() => go(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="omd-gallery-nav omd-gallery-next"
              onClick={() => go(1)}
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
            <span className="omd-gallery-count">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="omd-gallery-strip">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === index ? "active" : ""}
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Everyone the listing names, each with Call and Text (or Email) buttons.
function Contacts({ contacts }) {
  if (!contacts.length) {
    return <p className="omd-muted">Zillow doesn't list a contact.</p>;
  }
  return (
    <ul className="omd-contacts">
      {contacts.map((c) => (
        <li key={`${c.role}-${c.name}-${c.phone}`}>
          <div className="omd-contact-who">
            <span className="omd-contact-role">{c.role}</span>
            <strong>{c.name || "—"}</strong>
            {c.phone && (
              <span className="omd-muted">{displayPhone(c.phone)}</span>
            )}
          </div>
          <div className="omd-contact-actions">
            {c.phone && (
              <>
                <a className="secondary-btn" href={telHref(c.phone)}>
                  <Phone size={14} />
                  Call
                </a>
                <a className="secondary-btn" href={smsHref(c.phone)}>
                  <MessageSquare size={14} />
                  Text
                </a>
              </>
            )}
            {c.email && (
              <a className="secondary-btn" href={`mailto:${c.email}`}>
                <Mail size={14} />
                Email
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// How the asking price stacks up against the comps' ARV: the share of
// ARV it asks, the spread, and the 70%-of-ARV ceiling investors start from
// (before repairs), with the comps' median $/sq ft and the rent estimate.
function DealSnapshot({ price, comps }) {
  const arv = comps?.arv;
  if (!(arv > 0)) return null;
  const ppsf = medianPricePerSqft(comps.comps);
  const share = price > 0 ? price / arv : null;
  const spread = price > 0 ? arv - price : null;
  const verdict =
    share === null
      ? null
      : share <= 0.7
        ? ["omd-good", "At or under 70% of ARV"]
        : share <= 0.85
          ? ["omd-fair", "Above 70% of ARV — negotiate"]
          : ["omd-poor", "Close to or over ARV"];
  return (
    <div className="omd-snapshot">
      <div className="omd-snapshot-arv">
        <span>After repair value</span>
        <strong>{money(arv)}</strong>
        {verdict && (
          <span className={`omd-verdict ${verdict[0]}`}>{verdict[1]}</span>
        )}
      </div>
      <dl className="omd-snapshot-figures">
        <div>
          <dt>Asking price</dt>
          <dd>{money(price)}</dd>
        </div>
        <div>
          <dt>Asking as % of ARV</dt>
          <dd>{share !== null ? `${Math.round(share * 100)}%` : "—"}</dd>
        </div>
        <div>
          <dt>Spread to ARV</dt>
          <dd className={spread > 0 ? "omd-under" : undefined}>
            {spread !== null
              ? `${spread < 0 ? "−" : ""}${money(Math.abs(spread))}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>70% of ARV</dt>
          <dd>{money(arv * 0.7)}</dd>
          <span className="omd-muted">before repairs</span>
        </div>
        <div>
          <dt>Comps median $/sq ft</dt>
          <dd>{money(ppsf)}</dd>
        </div>
        <div>
          <dt>Rent estimate</dt>
          <dd>{comps.rent > 0 ? `${money(comps.rent)}/mo` : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

// The comps run for the listing, once asked for with Run comps: ARV
// snapshot, then the comps table and map (the lead windows' comps panel).
function CompsSection({ listing: l, compsState }) {
  const { saved, loading, error, run } = compsState;
  let body;
  let action = null;
  if (loading) {
    body = (
      <Spinner
        size="lg"
        stacked
        label="Running comps on Zillow, Redfin and Realtor.com… this can take up to a minute."
      />
    );
  } else if (saved) {
    const comps = leadComps({ address: l.address, compsResult: saved.result });
    action = (
      <button type="button" className="omd-open-btn" onClick={run}>
        Run again
      </button>
    );
    body = (
      <>
        <DealSnapshot price={l.price} comps={comps} />
        {saved.summary && (
          <p className="omd-muted omd-comps-summary">{saved.summary}</p>
        )}
        {comps?.comps.length ? (
          <LeadCompsPanel
            comps={comps}
            lead={{ address: l.address, askingPrice: String(l.price ?? "") }}
          />
        ) : (
          <p className="omd-muted">No comparable sales were found nearby.</p>
        )}
      </>
    );
  } else if (error) {
    body = (
      <div className="omd-details-error">
        <span>{error}</span>
        <button type="button" className="secondary-btn" onClick={run}>
          Try again
        </button>
      </div>
    );
  } else {
    body = (
      <div className="omd-comps-empty">
        <span className="omd-muted">
          Run comps to see this home's after repair value and the comparable
          sales nearby.
        </span>
        <button type="button" className="primary-btn" onClick={run}>
          Run comps
        </button>
      </div>
    );
  }
  return (
    <section className="omd-comps">
      <div className="omd-comps-head">
        <h3 className="omd-modal-heading">ARV &amp; comparable sales</h3>
        {action}
      </div>
      {body}
    </section>
  );
}

// Everything about one listing. Its Zillow page's details (photos,
// description, contacts) and its comps run are loaded by the page and
// passed in `detailsState` ({ details, loading, error, retry }) and
// `compsState` ({ saved, loading, error, run }).
export default function ListingDetailsModal({
  listing: l,
  detailsState,
  compsState,
  favorite,
  onToggleFavorite,
  onClose,
}) {
  if (!l) return null;
  const { details, loading, error, retry } = detailsState;
  const under = belowZestimate(l);
  const ppsf = pricePerSqft(l);
  const yearBuilt = details?.yearBuilt || l.yearBuilt;
  const hoa = details?.hoa ?? l.hoa;
  const photos = details?.photos?.length
    ? details.photos
    : l.photo
      ? [l.photo]
      : [];
  const facts = [
    ["Beds", l.beds ?? "—"],
    ["Baths", l.baths ?? "—"],
    ["Living area", l.sqft ? `${l.sqft.toLocaleString("en-US")} sq ft` : "—"],
    ["Lot", l.lotSqft ? `${l.lotSqft.toLocaleString("en-US")} sq ft` : "—"],
    ["Year built", yearBuilt || "—"],
    ["Type", HOME_TYPES[l.homeType] || l.propertyType || "—"],
    ["Price / sq ft", ppsf ? money(ppsf) : "—"],
    ["Rent Zestimate", l.rentZestimate ? `${money(l.rentZestimate)}/mo` : "—"],
    ["Tax assessed", money(l.taxAssessedValue)],
    ["HOA", hoa ? `${money(hoa)}/mo` : "—"],
    ["Days on market", l.daysOnMarket ?? "—"],
    ["Listed", details?.datePosted || "—"],
    [
      "MLS #",
      [details?.mlsId || l.mls, details?.mlsName && `(${details.mlsName})`]
        .filter(Boolean)
        .join(" ") || "—",
    ],
    [
      "Zillow views / saves",
      details?.pageViews != null
        ? `${details.pageViews.toLocaleString("en-US")} / ${details.saves ?? 0}`
        : "—",
    ],
  ];
  const saleType = details?.saleType || l.saleType;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        <span className="omd-modal-title">
          {l.street || l.address}
          <span className="omd-muted">
            {[l.city, [l.state, l.zip].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ")}
          </span>
        </span>
      }
      className="omd-modal"
      style={{ width: "min(1100px, 96vw)", maxWidth: "min(1100px, 96vw)" }}
    >
      <div className="omd-modal-body">
        <div className="omd-modal-media">
          <Gallery photos={photos} alt={l.street || l.address} />
          <div className="omd-links">
            {l.zillowUrl && (
              <a href={l.zillowUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} />
                Zillow
              </a>
            )}
            {l.redfinUrl && (
              <a href={l.redfinUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} />
                Redfin
              </a>
            )}
            <StreetViewButton
              address={l.address}
              location={
                l.lat != null && l.lng != null
                  ? { lat: l.lat, lng: l.lng }
                  : undefined
              }
            />
          </div>

          {/* Under the photos, so the two columns run about even. */}
          <section className="omd-modal-card">
            <h3 className="omd-modal-heading">Matched keywords</h3>
            <div className="omd-keywords">
              {l.keywords.map((k) => (
                <span key={k} className="omd-keyword">
                  {keywordLabel(k)}
                </span>
              ))}
            </div>
          </section>

          {details?.description && (
            <section className="omd-modal-card">
              <h3 className="omd-modal-heading">Description</h3>
              <p className="omd-description">{details.description}</p>
            </section>
          )}
        </div>

        <div className="omd-modal-info">
          <div className="omd-modal-price">
            <strong>{money(l.price)}</strong>
            {saleType && <span className="omd-sale-type">{saleType}</span>}
            <FavoriteButton
              favorite={favorite}
              onToggle={onToggleFavorite}
              withLabel
            />
          </div>
          {l.zestimate > 0 && (
            <div className="omd-zestimate">
              Zestimate {money(l.zestimate)}
              {under !== null && (
                <span className={under > 0 ? "omd-under" : "omd-over"}>
                  {" · "}
                  {Math.abs(Math.round(under * 100))}%{" "}
                  {under > 0 ? "under" : "over"}
                </span>
              )}
            </div>
          )}

          <section>
            <h3 className="omd-modal-heading">Listing contacts</h3>
            {loading ? (
              <Spinner
                size="sm"
                label="Loading the agent's details from Zillow…"
              />
            ) : details ? (
              <Contacts contacts={details.contacts} />
            ) : (
              <div className="omd-details-error">
                <span>{error || "Couldn't load the contacts."}</span>
                <button type="button" className="secondary-btn" onClick={retry}>
                  Try again
                </button>
              </div>
            )}
          </section>

          <section>
            <h3 className="omd-modal-heading">Details</h3>
            <dl className="omd-details omd-details--modal">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {details?.facts
                ?.filter((f) => f.label !== "Year Built")
                .map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>

        <CompsSection listing={l} compsState={compsState} />
      </div>
    </Modal>
  );
}
