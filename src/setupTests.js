import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("./hooks/useCountUp", () => ({
  useCountUp: (target) => target,
}));
