import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SimpleStat,
  AnimatedAmount,
  GaugeStat,
  Field,
  Select,
  Badge,
  ReadOnlyCell,
} from "./elements";

describe("SimpleStat", () => {
  it("renders label and a string value", () => {
    render(<SimpleStat label="Open Deals" value="12 deals" />);
    expect(screen.getByText("Open Deals")).toBeInTheDocument();
    expect(screen.getByText("12 deals")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<SimpleStat label="X" value="0" subtitle="quarterly" />);
    expect(screen.getByText("quarterly")).toBeInTheDocument();
  });

  it("uses format() on numericValue", () => {
    render(
      <SimpleStat label="ARV" numericValue={1500} format={(n) => `$${n}`} />,
    );
    expect(screen.getByText("$1500")).toBeInTheDocument();
  });

  it("applies colorTheme to the wrapping article", () => {
    const { container } = render(
      <SimpleStat label="X" value="0" colorTheme="orange" />,
    );
    expect(container.querySelector(".theme-orange")).toBeTruthy();
  });
});

describe("AnimatedAmount", () => {
  it("renders the unformatted value when no formatter is given", () => {
    render(<AnimatedAmount value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("applies a formatter when provided", () => {
    render(<AnimatedAmount value={1500} format={(n) => `$${n}`} />);
    expect(screen.getByText("$1500")).toBeInTheDocument();
  });

  it("renders negative values with sign preserved", () => {
    render(<AnimatedAmount value={-50} format={(n) => `${n}`} />);
    expect(screen.getByText("-50")).toBeInTheDocument();
  });
});

describe("GaugeStat", () => {
  it("renders label, subtitle and value", () => {
    render(
      <GaugeStat
        label="Score"
        subtitle="of 100"
        value={70}
        max={100}
        colorTheme="green"
      />,
    );
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("of 100")).toBeInTheDocument();
    expect(screen.getByText("70")).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("renders label and input", () => {
    render(<Field label="Name" name="name" value="" onChange={() => {}} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
  });

  it("marks required fields with an asterisk", () => {
    render(
      <Field label="Name" name="name" value="" required onChange={() => {}} />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeRequired();
  });

  it("trims surrounding whitespace on blur and reports the clean value", () => {
    const onChange = vi.fn();
    render(
      <Field
        label="Name"
        name="name"
        value="  John Smith  "
        onChange={onChange}
      />,
    );
    fireEvent.blur(screen.getByLabelText(/Name/i));
    expect(onChange).toHaveBeenCalledWith({
      target: { name: "name", value: "John Smith" },
    });
  });

  it("does not fire onChange on blur when there is no surrounding whitespace", () => {
    const onChange = vi.fn();
    render(<Field label="Name" name="name" value="John" onChange={onChange} />);
    fireEvent.blur(screen.getByLabelText(/Name/i));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("preserves a caller-supplied onBlur handler", () => {
    const onBlur = vi.fn();
    render(
      <Field
        label="Name"
        name="name"
        value="x"
        onChange={() => {}}
        onBlur={onBlur}
      />,
    );
    fireEvent.blur(screen.getByLabelText(/Name/i));
    expect(onBlur).toHaveBeenCalled();
  });

  it("does not trim non-text inputs like numbers", () => {
    const onChange = vi.fn();
    render(
      <Field
        label="ARV"
        name="arv"
        type="number"
        value="100"
        onChange={onChange}
      />,
    );
    fireEvent.blur(screen.getByLabelText(/ARV/i));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Select", () => {
  it("renders an option per item", () => {
    render(
      <Select
        label="State"
        name="state"
        options={["TX", "CA", "NY"]}
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });
});

describe("Badge", () => {
  it("renders value with normalized class", () => {
    const { container } = render(<Badge value="Offer Sent" />);
    expect(container.querySelector(".offer-sent")).toBeTruthy();
  });

  it("renders em-dash for empty value", () => {
    render(<Badge value="" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ReadOnlyCell", () => {
  it("renders value inside a td", () => {
    render(
      <table>
        <tbody>
          <tr>
            <ReadOnlyCell value="ABC" />
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByText("ABC")).toBeInTheDocument();
  });

  it("appends wide and small classes when requested", () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <ReadOnlyCell value="X" wide small />
          </tr>
        </tbody>
      </table>,
    );
    const span = container.querySelector("span");
    expect(span.className).toMatch(/wide/);
    expect(span.className).toMatch(/small/);
  });
});
