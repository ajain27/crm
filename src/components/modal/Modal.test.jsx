import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="X">
        body
      </Modal>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and body when isOpen=true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Hello">
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="X">
        body
      </Modal>,
    );
    fireEvent.click(document.querySelector(".modal-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when clicking inside the modal body", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="X">
        body
      </Modal>,
    );
    fireEvent.click(document.querySelector(".modal"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="X">
        body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders actions block when provided", () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="X"
        actions={<button>Save</button>}
      >
        body
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("locks body scroll while open and restores on close", () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="X">
        body
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <Modal isOpen={false} onClose={() => {}} title="X">
        body
      </Modal>,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
