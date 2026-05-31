import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdditionalLenders, { createEmptyLender } from "./AdditionalLenders";

function Wrapper({ initial = [], onMutate }) {
  const [lenders, setLenders] = useState(initial);
  return (
    <AdditionalLenders
      lenders={lenders}
      setLenders={setLenders}
      onMutate={onMutate}
    />
  );
}

describe("AdditionalLenders", () => {
  it("shows the Additional Lenders section heading and Add button", () => {
    render(<Wrapper />);
    expect(screen.getByText("Additional Lenders")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Lender/i }),
    ).toBeInTheDocument();
  });

  it("does not render any lender row initially", () => {
    render(<Wrapper />);
    expect(screen.queryByLabelText(/Lender 1 Amount/i)).not.toBeInTheDocument();
  });

  it("Add Lender adds a new row with empty Amount, Rate, Term fields", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByRole("button", { name: /Add Lender/i }));
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("");
    expect(screen.getByLabelText(/Lender 1 Rate/i)).toHaveValue("");
    expect(screen.getByLabelText(/Lender 1 Term/i)).toHaveValue("");
  });

  it("formats Amount as currency on input", () => {
    render(<Wrapper initial={[createEmptyLender()]} />);
    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "25000" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$25,000");
  });

  it("strips non-digits from Term", () => {
    render(<Wrapper initial={[createEmptyLender()]} />);
    fireEvent.change(screen.getByLabelText(/Lender 1 Term/i), {
      target: { value: "5 years" },
    });
    expect(screen.getByLabelText(/Lender 1 Term/i)).toHaveValue("5");
  });

  it("appends % to Rate on blur", () => {
    render(<Wrapper initial={[createEmptyLender()]} />);
    const rate = screen.getByLabelText(/Lender 1 Rate/i);
    fireEvent.change(rate, { target: { value: "8" } });
    fireEvent.blur(rate);
    expect(rate).toHaveValue("8%");
  });

  it("renders a monthly payment preview when amount + rate are set", () => {
    render(<Wrapper initial={[createEmptyLender()]} />);
    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText(/Lender 1 Rate/i), {
      target: { value: "12" },
    });
    // interest-only fallback: $10,000 × 12% / 12 = $100.00
    expect(screen.getByText(/Monthly payment: \$100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/interest-only/)).toBeInTheDocument();
  });

  it("removes the interest-only hint once a term is added", () => {
    render(<Wrapper initial={[createEmptyLender()]} />);
    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText(/Lender 1 Rate/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/Lender 1 Term/i), {
      target: { value: "5" },
    });
    expect(screen.queryByText(/interest-only/)).not.toBeInTheDocument();
  });

  it("Remove button drops the row", () => {
    render(<Wrapper initial={[createEmptyLender(), createEmptyLender()]} />);
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lender 2 Amount/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Remove lender 1/i));
    expect(screen.queryByLabelText(/Lender 2 Amount/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toBeInTheDocument();
  });

  it("invokes onMutate when a lender is added, removed, or edited", () => {
    const onMutate = vi.fn();
    render(<Wrapper onMutate={onMutate} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Lender/i }));
    expect(onMutate).toHaveBeenCalled();

    onMutate.mockClear();
    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "1000" },
    });
    expect(onMutate).toHaveBeenCalled();

    onMutate.mockClear();
    fireEvent.click(screen.getByLabelText(/Remove lender 1/i));
    expect(onMutate).toHaveBeenCalled();
  });
});
