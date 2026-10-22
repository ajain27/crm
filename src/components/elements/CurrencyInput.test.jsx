import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CurrencyInput from "./CurrencyInput";
import { Field } from "./elements";

function Controlled({ initial = "", onChange }) {
  const [value, setValue] = useState(initial);
  return (
    <CurrencyInput
      aria-label="Amount"
      name="amount"
      value={value}
      onChange={(e) => {
        onChange?.(e);
        setValue(e.target.value);
      }}
    />
  );
}

describe("CurrencyInput", () => {
  it("formats as the user types", () => {
    render(<Controlled />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "100000" } });
    expect(input).toHaveValue("$100,000");
    fireEvent.change(input, { target: { value: "$100,000.5" } });
    expect(input).toHaveValue("$100,000.5");
  });

  it("shows values saved before formatting as dollars", () => {
    render(<Controlled initial="100000" />);
    expect(screen.getByLabelText("Amount")).toHaveValue("$100,000");
  });

  it("hands handlers the field name and formatted value", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "2500" },
    });
    expect(onChange.mock.calls[0][0].target).toEqual({
      name: "amount",
      value: "$2,500",
    });
  });

  it("keeps the caret after the same digit when commas are added", () => {
    render(<Controlled initial="$10,000" />);
    const input = screen.getByLabelText("Amount");
    input.focus();
    // Typing a 0 after "$1" → "$100,000"; the caret should follow the 0.
    input.setSelectionRange(3, 3);
    fireEvent.change(input, {
      target: { value: "$100,000", selectionStart: 3 },
    });
    expect(input).toHaveValue("$100,000");
    expect(input.selectionStart).toBe(3);
  });

  it("is what Field renders with `currency`", () => {
    render(
      <Field
        label="Rent"
        name="rent"
        currency
        value="1500"
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Rent")).toHaveValue("$1,500");
  });
});
