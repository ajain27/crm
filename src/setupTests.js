import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { vi } from "vitest";

// Accordion cards repeat some of a row's details for the small-screen
// card view — the summary (AccordionHeaderCell `card`) and card-only cells
// (acc-col-card-only) — which CSS hides on the table, but jsdom applies no
// CSS. Text queries skip them, as the screen does; tests that want them
// look them up by class.
configure({
  defaultIgnore: [
    "script",
    "style",
    ".acc-card-summary",
    ".acc-card-summary *",
    ".acc-col-card-only",
    ".acc-col-card-only *",
  ].join(", "),
});

vi.mock("./hooks/useCountUp", () => ({
  useCountUp: (target) => target,
}));
