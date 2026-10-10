import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DealPhotos from "./DealPhotos";
import { compressImage } from "../../../../../utils/compressImage";

vi.mock("../../../../../utils/compressImage", () => ({
  compressImage: vi.fn(async (file) => `data:image/jpeg;base64,${file.name}`),
}));

function makeStore() {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn(async (dealId, id) => ({ id, data: `data:${id}` })),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

function photosList(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    uploadedAt: "2026-10-01T00:00:00.000Z",
  }));
}

function image(name) {
  return new File(["x"], name, { type: "image/jpeg" });
}

function renderPhotos({ photos = [], store = makeStore(), patch } = {}) {
  const updateDealPatch = patch || vi.fn().mockResolvedValue(undefined);
  render(
    <DealPhotos
      deal={{ id: "d1", photos }}
      photoStore={store}
      currentUserId="u1"
      updateDealPatch={updateDealPatch}
    />,
  );
  return { store, updateDealPatch };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("DealPhotos", () => {
  it("loads and shows the deal's saved photos", async () => {
    const { store } = renderPhotos({ photos: photosList(2) });
    expect(await screen.findByAltText("Deal photo 1")).toHaveAttribute(
      "src",
      "data:p1",
    );
    expect(screen.getByAltText("Deal photo 2")).toBeInTheDocument();
    expect(store.fetch).toHaveBeenCalledWith("d1", "p1");
    expect(screen.getByText("2 of 5 photos")).toBeInTheDocument();
  });

  it("compresses, stores and lists newly added photos", async () => {
    const { store, updateDealPatch } = renderPhotos({ photos: photosList(1) });
    fireEvent.change(screen.getByLabelText("Add photos"), {
      target: { files: [image("a.jpg"), image("b.jpg")] },
    });

    await waitFor(() => expect(updateDealPatch).toHaveBeenCalled());
    expect(compressImage).toHaveBeenCalledTimes(2);
    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: "d1",
        userId: "u1",
        data: "data:image/jpeg;base64,a.jpg",
      }),
    );
    const [dealId, patch] = updateDealPatch.mock.calls[0];
    expect(dealId).toBe("d1");
    expect(patch.photos).toHaveLength(3);
    expect(patch.photos[1]).not.toHaveProperty("data");
  });

  it("refuses more photos than the five-photo limit allows", () => {
    const { store } = renderPhotos({ photos: photosList(4) });
    fireEvent.change(screen.getByLabelText("Add photos"), {
      target: { files: [image("a.jpg"), image("b.jpg")] },
    });
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringMatching(/up to 5 photos.*1 more/),
    );
    expect(store.save).not.toHaveBeenCalled();
  });

  it("hides the add button once a deal has five photos", () => {
    renderPhotos({ photos: photosList(5) });
    expect(screen.queryByLabelText("Add photos")).toBeNull();
    expect(screen.getByText("5 of 5 photos")).toBeInTheDocument();
  });

  it("deletes a photo and its stored image", async () => {
    const { store, updateDealPatch } = renderPhotos({ photos: photosList(2) });
    fireEvent.click(screen.getByLabelText("Delete photo 1"));
    await waitFor(() => expect(updateDealPatch).toHaveBeenCalled());
    expect(store.remove).toHaveBeenCalledWith("d1", "p1");
    expect(updateDealPatch.mock.calls[0][1].photos.map((p) => p.id)).toEqual([
      "p2",
    ]);
  });

  it("opens a photo full size and steps through the others", async () => {
    renderPhotos({ photos: photosList(2) });
    await screen.findByAltText("Deal photo 1");
    fireEvent.click(screen.getByLabelText("View photo 1"));
    expect(screen.getByText("Photo 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next photo"));
    expect(screen.getByText("Photo 2 of 2")).toBeInTheDocument();
  });
});
