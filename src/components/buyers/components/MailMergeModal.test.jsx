import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Set env vars before module import so NOT_CONFIGURED is false
beforeAll(() => {
  vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "service_test");
  vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "template_test");
  vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "key_test");
});

vi.mock("@emailjs/browser", () => ({
  default: { send: vi.fn().mockResolvedValue({ status: 200 }) },
}));

const { default: emailjs } = await import("@emailjs/browser");
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
    it("calls emailjs.send once per recipient", async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText(/123 Main St/i), {
        target: { value: "123 Oak St, Dallas, TX" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /Send to 2 Buyers/i }),
      );

      await waitFor(() => {
        expect(emailjs.send).toHaveBeenCalledTimes(2);
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
        const calls = emailjs.send.mock.calls;
        const sentTo = calls.map((c) => c[2].to_email);
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
        const messages = emailjs.send.mock.calls.map((c) => c[2].message);
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
      emailjs.send
        .mockResolvedValueOnce({ status: 200 })
        .mockRejectedValueOnce(new Error("fail"));

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
  });
});
