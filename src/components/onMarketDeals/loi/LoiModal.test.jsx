import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoiModal from "./LoiModal";
import {
  LOI_DEFAULTS_KEY,
  daysPhrase,
  defaultMessage,
  initialLoiForm,
  loiProblems,
  loiTerms,
} from "./loiLetter";

const LISTING = {
  id: "z1",
  address: "5100 S Karen St, Oklahoma City, OK 73135",
  beds: 3,
  baths: 1,
  homeType: "SINGLE_FAMILY",
  price: 115000,
};
const CONTACTS = [
  {
    role: "Listing agent",
    name: "Amy Lee",
    phone: "4055550100",
    email: "amy@realty.com",
  },
];
const ME = {
  company: "TurnKey Investments I, LLC",
  signerName: "Kevin Hanna",
  signerEmail: "kevin@turnkey.net",
  titleCompany: "First American Title",
  titleCompanyCity: "Edmond, Oklahoma",
};

describe("loiLetter", () => {
  it("fills the form from the listing and its agent", () => {
    const form = initialLoiForm(LISTING, CONTACTS, {});
    expect(form).toMatchObject({
      toEmail: "amy@realty.com",
      agentName: "Amy Lee",
      address: LISTING.address,
      description: "3 bed / 1 bath single-family residence",
      price: "$115,000",
    });
  });

  it("builds the terms table like the sample letter", () => {
    const form = { ...initialLoiForm(LISTING, [], {}), ...ME };
    expect(Object.fromEntries(loiTerms(form))).toEqual({
      Buyer: "TurnKey Investments I, LLC, and/or assigns",
      "Purchase price": "$115,000",
      "Earnest money":
        "$500, to be deposited with First American Title after the inspection period is over",
      "Closing costs": "Buyer will pay the seller's standard closing costs",
      Commission:
        "Seller to pay the real estate commission for the seller's (listing) side",
      "Inspection period": "Ten (10) days from the executed purchase contract",
      Condition: "Property purchased as-is, where-is",
      Closing:
        "First American Title, Edmond, Oklahoma — on or before thirty (30) days following the executed purchase contract",
      Possession: "At closing and funding",
    });
  });

  it("adds the user's own terms and leaves out blank ones", () => {
    const form = {
      ...initialLoiForm(LISTING, [], {}),
      ...ME,
      possession: "",
      extraTerms: [
        { label: "Financing", value: "Cash" },
        { label: "", value: "" },
      ],
    };
    const labels = loiTerms(form).map(([label]) => label);
    expect(labels).not.toContain("Possession");
    expect(labels.at(-1)).toBe("Financing");
  });

  it("writes days out", () => {
    expect(daysPhrase("10")).toBe("Ten (10) days");
    expect(daysPhrase("21")).toBe("Twenty-one (21) days");
    expect(daysPhrase("1")).toBe("One (1) day");
    expect(daysPhrase("two weeks")).toBe("two weeks");
  });

  it("greets the agent and signs with the user's details", () => {
    const form = { ...initialLoiForm(LISTING, CONTACTS, {}), ...ME };
    const message = defaultMessage(form);
    expect(message).toMatch(/^Hi Amy,/);
    expect(message).toContain(`${LISTING.address} for $115,000`);
    expect(message).toContain("Kevin Hanna");
  });

  it("names what's missing", () => {
    const form = initialLoiForm(LISTING, [], {});
    expect(loiProblems(form)).toEqual([
      "the agent's email",
      "your company (the buyer)",
      "your name",
    ]);
  });
});

describe("LoiModal", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("emails the agent the letter as a PDF, replying to the user", async () => {
    localStorage.setItem(LOI_DEFAULTS_KEY, JSON.stringify(ME));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    const onSent = vi.fn();
    render(
      <LoiModal
        listing={LISTING}
        contacts={CONTACTS}
        onClose={vi.fn()}
        onSent={onSent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Send LOI/ }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      toEmail: "amy@realty.com",
      subject: "Letter of Intent — 5100 S Karen St",
      fromName: "TurnKey Investments I, LLC",
      replyTo: "kevin@turnkey.net",
      cc: "kevin@turnkey.net",
    });
    expect(body.attachments[0].filename).toMatch(
      /^5100-S-Karen-St-LOI-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(atob(body.attachments[0].content).startsWith("%PDF")).toBe(true);
    expect(screen.getByText("Letter of intent sent")).toBeInTheDocument();
  });

  it("asks for what's missing instead of sending", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoiModal listing={LISTING} contacts={[]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Send LOI/ }));
    expect(
      screen.getByText(/Please add the agent's email, your company/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("remembers the user's details for the next letter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    );
    render(
      <LoiModal listing={LISTING} contacts={CONTACTS} onClose={vi.fn()} />,
    );
    const type = (label, value) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    type(/^Company/, "Acme Homes LLC");
    type(/^Your name/, "Pat Doe");
    type(/^Inspection period/, "7");
    fireEvent.click(screen.getByRole("button", { name: /Send LOI/ }));
    await screen.findByText("Letter of intent sent");
    expect(JSON.parse(localStorage.getItem(LOI_DEFAULTS_KEY))).toMatchObject({
      company: "Acme Homes LLC",
      signerName: "Pat Doe",
      inspectionDays: "7",
    });
  });
});
