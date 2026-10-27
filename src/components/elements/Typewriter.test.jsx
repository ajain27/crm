import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Typewriter from "./Typewriter";

const SEGMENTS = [{ text: "Find " }, { text: "deals", className: "accent" }];

afterEach(() => vi.useRealTimers());

// Each letter's timer starts once the previous letter has rendered.
function typeLetters(count, speed) {
  for (let i = 0; i < count; i++) act(() => vi.advanceTimersByTime(speed));
}

describe("Typewriter", () => {
  it("types one letter at a time, then calls onDone", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { container } = render(
      <Typewriter
        segments={SEGMENTS}
        speed={50}
        startDelay={0}
        onDone={onDone}
      />,
    );
    const typed = () => container.querySelector("[aria-hidden]").textContent;
    expect(typed()).toBe("");
    act(() => vi.advanceTimersByTime(0));
    expect(typed()).toBe("F");
    typeLetters(6, 50);
    expect(typed()).toBe("Find de");
    expect(container.querySelector(".accent")).toHaveTextContent("de");
    typeLetters(10, 50);
    expect(typed()).toBe("Find deals");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("gives screen readers the whole text at once", () => {
    render(<Typewriter segments={SEGMENTS} />);
    expect(screen.getByLabelText("Find deals")).toBeInTheDocument();
  });
});
