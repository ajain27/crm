import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { vi } from "vitest";

// An accordion card's summary (AccordionHeaderCell `card`) repeats the
// row's seller name and address for the small-screen card view; CSS hides
// it on the table, but jsdom applies no CSS. Text queries skip it, as the
// screen does — tests that want it look it up by its class.
configure({
  defaultIgnore: "script, style, .acc-card-summary, .acc-card-summary *",
});

vi.mock("./hooks/useCountUp", () => ({
  useCountUp: (target) => target,
}));
