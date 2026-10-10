import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressImage, isHeicFile } from "./compressImage";
import { heicTo } from "heic-to";

vi.mock("heic-to", () => ({
  heicTo: vi.fn(async () => new Blob(["jpeg"], { type: "image/jpeg" })),
}));

// jsdom can't decode images or draw on a canvas, so stand in for both:
// an <img> "loads" unless its source is HEIC (as in Chrome/Firefox).
class FakeImage {
  width = 4000;
  height = 3000;
  set src(url) {
    const type = blobTypes.get(url);
    setTimeout(() => (/hei[cf]/.test(type) ? this.onerror() : this.onload()));
  }
}
const blobTypes = new Map();

beforeEach(() => {
  let n = 0;
  vi.stubGlobal("Image", FakeImage);
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    const url = `blob:${n++}`;
    blobTypes.set(url, blob.type);
    return url;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/jpeg;base64,abc",
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  heicTo.mockClear();
});

describe("compressImage", () => {
  it("re-encodes a regular image as JPEG without converting it", async () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    expect(await compressImage(file)).toBe("data:image/jpeg;base64,abc");
    expect(heicTo).not.toHaveBeenCalled();
  });

  it("converts a HEIC photo the browser can't open, then compresses it", async () => {
    const file = new File(["x"], "IMG_4431.HEIC", { type: "image/heic" });
    expect(await compressImage(file)).toBe("data:image/jpeg;base64,abc");
    expect(heicTo).toHaveBeenCalledWith(
      expect.objectContaining({ blob: file, type: "image/jpeg" }),
    );
  });

  it("explains when a HEIC photo can't be converted", async () => {
    heicTo.mockRejectedValueOnce(new Error("bad heic"));
    const file = new File(["x"], "IMG_1.heic", { type: "image/heic" });
    await expect(compressImage(file)).rejects.toThrow(
      /"IMG_1.heic" couldn't be converted from HEIC/,
    );
  });
});

describe("isHeicFile", () => {
  it("recognises HEIC/HEIF by type or by name when the type is missing", () => {
    expect(isHeicFile(new File([], "a.jpg", { type: "image/heif" }))).toBe(
      true,
    );
    expect(isHeicFile(new File([], "IMG.HEIC", { type: "" }))).toBe(true);
    expect(isHeicFile(new File([], "a.png", { type: "image/png" }))).toBe(
      false,
    );
  });
});
