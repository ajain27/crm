import { useState } from "react";
import Typewriter from "./Typewriter";
import "./PageHero.css";

// A page's opening banner: a small label, a headline typed out one letter
// at a time (part of it highlighted), and a description that fades in once
// the headline is done. `headline` is Typewriter segments; `children`
// (e.g. buttons) sit beside the text.
export default function PageHero({
  icon: Icon,
  eyebrow,
  headline,
  description,
  children,
}) {
  const [typed, setTyped] = useState(false);
  return (
    <header className="page-hero" data-reveal="left">
      <div className="page-hero-text">
        {eyebrow && (
          <span className="page-hero-eyebrow">
            {Icon && <Icon size={14} />}
            {eyebrow}
          </span>
        )}
        <h1 className="page-hero-title">
          <Typewriter segments={headline} onDone={() => setTyped(true)} />
        </h1>
        {description && (
          <p className={`page-hero-sub${typed ? " is-shown" : ""}`}>
            {description}
          </p>
        )}
      </div>
      {children && <div className="page-hero-actions">{children}</div>}
    </header>
  );
}
