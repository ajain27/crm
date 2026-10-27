import { describe, it, expect } from "vitest";
import { smsHref } from "./LeadTableCells";

describe("smsHref", () => {
  it("adds +1 to 10-digit US numbers and strips formatting", () => {
    expect(smsHref("214-663-0735")).toBe("sms:+12146630735");
    expect(smsHref("(214) 663 0735")).toBe("sms:+12146630735");
  });

  it("keeps a country code that's already there", () => {
    expect(smsHref("+1 214.663.0735")).toBe("sms:+12146630735");
  });

  it("returns nothing without digits", () => {
    expect(smsHref("")).toBe("");
    expect(smsHref(undefined)).toBe("");
  });

  it("prefills the message body when given", () => {
    expect(smsHref("214-663-0735", "Hi, 12 Main St & more?")).toBe(
      "sms:+12146630735?&body=Hi%2C%2012%20Main%20St%20%26%20more%3F",
    );
  });
});
