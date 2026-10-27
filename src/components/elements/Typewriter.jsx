import { useEffect, useState } from "react";
import "./Typewriter.css";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Text typed out one letter at a time, with a blinking cursor. `segments`
// is a list of { text, className } so part of a line can be styled (e.g.
// highlighted words). `speed` is milliseconds per letter; `onDone` runs
// once the last letter is in. Screen readers get the whole text at once,
// and with reduced motion it all shows straight away.
export default function Typewriter({
  segments,
  speed = 55,
  startDelay = 250,
  onDone,
  className = "",
}) {
  const total = segments.reduce((n, s) => n + s.text.length, 0);
  const [shown, setShown] = useState(() =>
    prefersReducedMotion() ? total : 0,
  );

  useEffect(() => {
    if (shown >= total) {
      onDone?.();
      return undefined;
    }
    const timer = setTimeout(
      () => setShown((n) => n + 1),
      shown === 0 ? startDelay : speed,
    );
    return () => clearTimeout(timer);
    // onDone is a callback, not something to restart the typing for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, total, speed, startDelay]);

  let left = shown;
  const fullText = segments.map((s) => s.text).join("");
  return (
    <span className={`typewriter ${className}`.trim()} aria-label={fullText}>
      <span aria-hidden="true">
        {segments.map((s, i) => {
          const part = s.text.slice(0, Math.max(0, left));
          left -= s.text.length;
          return part ? (
            <span key={i} className={s.className}>
              {part}
            </span>
          ) : null;
        })}
        <span
          className={`typewriter-cursor${shown >= total ? " is-done" : ""}`}
        />
      </span>
    </span>
  );
}
