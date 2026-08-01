import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Set env var before module import so NOT_CONFIGURED is false
beforeAll(() => {
  vi.stubEnv("VITE_BREVO_API_KEY", "test-brevo-key");
});

const { default: MailMergeModal } = await import("./MailMergeModal");

const BUYERS_WITH_EMAIL = [
  { id: "b1", fullName: "Jane Doe", email: "jane@example.com", state: "TX" },
  { id: "b2", fullName: "John Smith", email: "john@example.com", state: "TX" },
];

const BUYER_NO_EMAIL = {
  id: "b3",
  fullName: "No Email",
  email: "",
  state: "GA",
};

function mockFetchOk() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ messageId: "ok" }),
  });
}

function mockFetchFailSecond() {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "fail" }),
    });
}

function renderModal(selectedBuyers = BUYERS_WITH_EMAIL) {
  const onClose = vi.fn();
  render(
    <MailMergeModal
      isOpen={true}
      onClose={onClose}
      selectedBuyers={selectedBuyers}
    />,
  );
  return { onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchOk();
});

describe("MailMergeModal", () => {
  describe("recipients display", () => {
    it("shows a chip for each buyer with an email", () => {
      renderModal();
      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
      expect(screen.getByText(/John Smith/)).toBeInTheDocument();
    });

    it("shows warning when some buyers have no email", () => {
      renderModal([...BUYERS_WITH_EMAIL, BUYER_NO_EMAIL]);
      expect(
        screen.getByText(/1 buyer has no email address and will be skipped/i),
      ).toBeInTheDocument();
    });

    it("shows empty message when no buyers have an email", () => {
      renderModal([BUYER_NO_EMAIL]);
      expect(
        screen.getByText(/No selected buyers have an email address/i),
      ).toBeInTheDocument();
    });

    it("shows correct recipient count in title", () => {
      renderModal(BUYERS_WITH_EMAIL);
      expect(screen.getByText(/2 buyers selected/i)).toBeInTheDocument();
    });
  });

  describe("email editing", () => {
    it("lets the user edit a recipient's email and shows it in the chip", () => {
      renderModal();
      fireEvent.click(screen.getAllByTitle("Edit email")[0]);

      const input = screen.getByPlaceholderText("email@example.com");
      expect(input.value).toBe("jane@example.com");

      fireEvent.change(input, { target: { value: "jane-new@example.com" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.getByText(/jane-new@example\.com/)).toBeInTheDocument();
      expect(screen.queryByText(/jane@example\.com/)).not.toBeInTheDocument();
    });

    it("sends to the edited email address", async () => {
      renderModal();
      fireEvent.click(screen.getAllByTitle("Edit email")[0]);
      fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
        target: { value: "jane-new@example.com" },
      });
      fireEvent.keyDown(screen.getByPlaceholderText("email@example.com"), {
        key: "Enter",
      });

      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        const calls = globalThis.fetch.mock.calls;
        const bodies = calls.map((c) => JSON.parse(c[1].body));
        const sentTo = bodies.map((b) => b.to[0].email);
        expect(sentTo).toContain("jane-new@example.com");
        expect(sentTo).not.toContain("jane@example.com");
      });
    });
  });

  describe("subject auto-population", () => {
    it("pre-fills subject with buyers state", () => {
      renderModal(BUYERS_WITH_EMAIL);
      const subjectInput = screen.getByPlaceholderText(
        /Property available in TX/i,
      );
      expect(subjectInput).toBeInTheDocument();
    });

    it("combines multiple states in subject", () => {
      const multiState = [
        { id: "b1", fullName: "Jane", email: "jane@example.com", state: "TX" },
        { id: "b2", fullName: "John", email: "john@example.com", state: "GA" },
      ];
      renderModal(multiState);
      expect(
        screen.getByPlaceholderText(/Property available in TX & GA/i),
      ).toBeInTheDocument();
    });

    it("uses generic subject when buyers have no state", () => {
      const noState = [
        { id: "b1", fullName: "Jane", email: "jane@example.com", state: "" },
      ];
      renderModal(noState);
      expect(
        screen.getByPlaceholderText(/Property available — interested\?/i),
      ).toBeInTheDocument();
    });
  });

  describe("currency formatting", () => {
    it("formats price as currency while typing", () => {
      renderModal();
      const priceInput = screen.getByPlaceholderText(/e\.g\. \$85,000/i);
      fireEvent.change(priceInput, { target: { value: "85000" } });
      expect(priceInput.value).toBe("$85,000");
    });

    it("formats arv as currency while typing", () => {
      renderModal();
      const arvInput = screen.getByPlaceholderText(/e\.g\. \$160,000/i);
      fireEvent.change(arvInput, { target: { value: "160000" } });
      expect(arvInput.value).toBe("$160,000");
    });

    it("formats repairs as currency while typing", () => {
      renderModal();
      const repairsInput = screen.getByPlaceholderText(/e\.g\. \$25,000/i);
      fireEvent.change(repairsInput, { target: { value: "25000" } });
      expect(repairsInput.value).toBe("$25,000");
    });
  });

  describe("email preview", () => {
    it("personalizes greeting with buyer first name", () => {
      renderModal(BUYERS_WITH_EMAIL);
      expect(screen.getByText(/Hi Jane,/)).toBeInTheDocument();
    });

    it("shows personalized for label", () => {
      renderModal(BUYERS_WITH_EMAIL);
      expect(screen.getByText(/personalized for Jane/i)).toBeInTheDocument();
    });

    it("updates preview when address is typed", () => {
      renderModal();
      const addressInput = screen.getByPlaceholderText(/123 Main St/i);
      fireEvent.change(addressInput, { target: { value: "456 Oak Ave" } });
      expect(screen.getByText(/456 Oak Ave/)).toBeInTheDocument();
    });

    it("shows beds and baths combined in preview", () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 3/i), {
        target: { value: "3" },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 2/i), {
        target: { value: "2" },
      });
      expect(screen.getByText(/3 Beds \/ 2 Baths/)).toBeInTheDocument();
    });

    it("shows You Win Estates in signature", () => {
      renderModal();
      const preview = document.querySelector(".mail-merge-preview");
      expect(preview?.textContent).toContain("You Win Estates");
    });

    it("lets the user edit the generated email body directly", () => {
      renderModal();
      const preview = document.querySelector(".mail-merge-preview");
      fireEvent.change(preview, { target: { value: "Custom message body" } });
      expect(preview.value).toBe("Custom message body");
      expect(
        screen.getByText(/edited — sent as-is to every recipient/i),
      ).toBeInTheDocument();
    });

    it("sends the edited body verbatim to every recipient", async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St" },
      });
      fireEvent.change(document.querySelector(".mail-merge-preview"), {
        target: { value: "Custom message body" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        const calls = globalThis.fetch.mock.calls;
        const bodies = calls.map((c) => JSON.parse(c[1].body).textContent);
        expect(bodies.every((b) => b === "Custom message body")).toBe(true);
      });
    });
  });

  describe("send button state", () => {
    it("is disabled when address is empty", () => {
      renderModal();
      expect(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      ).toBeDisabled();
    });

    it("is enabled when address is filled and recipients exist", () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St" },
      });
      expect(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      ).not.toBeDisabled();
    });

    it("is disabled when all buyers lack email", () => {
      renderModal([BUYER_NO_EMAIL]);
      expect(
        screen.getByRole("button", { name: /Send to 0 Buyers/i }),
      ).toBeDisabled();
    });
  });

  describe("send behaviour", () => {
    it("calls fetch once per recipient", async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St, Dallas, TX" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it("sends to each buyer's email address", async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        const calls = globalThis.fetch.mock.calls;
        const bodies = calls.map((c) => JSON.parse(c[1].body));
        const sentTo = bodies.map((b) => b.to[0].email);
        expect(sentTo).toContain("jane@example.com");
        expect(sentTo).toContain("john@example.com");
      });
    });

    it("personalizes message with each buyer's first name", async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        const calls = globalThis.fetch.mock.calls;
        const bodies = calls.map((c) => JSON.parse(c[1].body));
        const messages = bodies.map((b) => b.textContent);
        expect(messages.some((m) => m.includes("Hi Jane,"))).toBe(true);
        expect(messages.some((m) => m.includes("Hi John,"))).toBe(true);
      });
    });

    it("shows success message after sending", async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Successfully sent to 2 buyers/i),
        ).toBeInTheDocument();
      });
    });

    it("shows error for failed recipients", async () => {
      mockFetchFailSecond();

      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed:/i)).toBeInTheDocument();
      });
    });
  });

  describe("close behaviour", () => {
    it("calls onClose when Cancel is clicked", () => {
      const { onClose } = renderModal();
      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
      expect(onClose).toHaveBeenCalled();
    });

    it("resets template fields when closed", async () => {
      renderModal();
      const addressInput = screen.getByPlaceholderText(/123 Main St/i);
      fireEvent.change(addressInput, { target: { value: "Some Address" } });
      expect(addressInput.value).toBe("Some Address");

      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    });

    it("does not close or lose typed content when clicking the overlay", () => {
      const { onClose } = renderModal();
      const addressInput = screen.getByPlaceholderText(/123 Main St/i);
      fireEvent.change(addressInput, { target: { value: "Some Address" } });

      fireEvent.click(document.querySelector(".modal-overlay"));

      expect(onClose).not.toHaveBeenCalled();
      expect(addressInput.value).toBe("Some Address");
    });
  });
});
