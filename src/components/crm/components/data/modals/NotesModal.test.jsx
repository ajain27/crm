import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotesModal from "./NotesModal";

describe("NotesModal", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = render(
      <NotesModal
        isOpen={false}
        onClose={vi.fn()}
        selectedDeal={{ address: "1 Main" }}
        notesDraft=""
        setNotesDraft={vi.fn()}
        saveNotes={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title with the deal address", () => {
    render(
      <NotesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedDeal={{ address: "1 Main" }}
        notesDraft="x"
        setNotesDraft={vi.fn()}
        saveNotes={vi.fn()}
      />,
    );
    expect(screen.getByText(/Notes for 1 Main/i)).toBeInTheDocument();
  });

  it("renders textarea with current draft value", () => {
    render(
      <NotesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedDeal={{ address: "X" }}
        notesDraft="draft text"
        setNotesDraft={vi.fn()}
        saveNotes={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("draft text")).toBeInTheDocument();
  });

  it("typing updates draft via setNotesDraft", () => {
    const setNotesDraft = vi.fn();
    render(
      <NotesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedDeal={{ address: "X" }}
        notesDraft="old"
        setNotesDraft={setNotesDraft}
        saveNotes={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("old"), {
      target: { value: "new" },
    });
    expect(setNotesDraft).toHaveBeenCalledWith("new");
  });

  it("Save Notes button calls saveNotes", () => {
    const saveNotes = vi.fn();
    render(
      <NotesModal
        isOpen={true}
        onClose={vi.fn()}
        selectedDeal={{ address: "X" }}
        notesDraft=""
        setNotesDraft={vi.fn()}
        saveNotes={saveNotes}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save Notes/i }));
    expect(saveNotes).toHaveBeenCalled();
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <NotesModal
        isOpen={true}
        onClose={onClose}
        selectedDeal={{ address: "X" }}
        notesDraft=""
        setNotesDraft={vi.fn()}
        saveNotes={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
