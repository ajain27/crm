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

  it("prefills the message the way Apple's Messages reads it", () => {
    const iPhone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
    const mac =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
    for (const ua of [iPhone, mac]) {
      expect(smsHref("214-663-0735", "Hi, 12 Main St & more?", ua)).toBe(
        "sms:+12146630735&body=Hi%2C%2012%20Main%20St%20%26%20more%3F",
      );
    }
  });

  it("prefills the message the way Android reads it", () => {
    const android =
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0";
    expect(smsHref("214-663-0735", "Hi there", android)).toBe(
      "sms:+12146630735?body=Hi%20there",
    );
  });
});
