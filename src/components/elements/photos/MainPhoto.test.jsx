import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MainPhoto from "./MainPhoto";
import { clearPhotoCache } from "./photoCache";

const store = {
  fetch: vi.fn(async (dealId, id) => ({ id, data: `data:${id}` })),
};

const deal = {
  id: "d1",
  photos: [
    { id: "p1", uploadedAt: "2026-10-01T00:00:00.000Z" },
    { id: "p2", uploadedAt: "2026-10-01T00:00:00.000Z" },
  ],
};

// jsdom has no PointerEvent; a MouseEvent carries the position.
const pointer = (el, type, clientX, clientY) =>
  fireEvent(el, new MouseEvent(type, { bubbles: true, clientX, clientY }));

describe("MainPhoto", () => {
  beforeEach(() => clearPhotoCache());

  it("shows the first photo, centered", async () => {
    render(
      <MainPhoto
        ownerId="d1"
        photos={deal.photos}
        photoStore={store}
        onChange={vi.fn()}
      />,
    );
    const img = await screen.findByAltText("Main photo");
    expect(img).toHaveAttribute("src", "data:p1");
    expect(img.style.objectPosition).toBe("50% 50%");
  });

  it("saves where the photo is dragged to", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <MainPhoto
        ownerId="d1"
        photos={deal.photos}
        photoStore={store}
        onChange={onChange}
      />,
    );
    await screen.findByAltText("Main photo");
    const frame = container.querySelector(".ddm-main-photo");
    frame.getBoundingClientRect = () => ({ width: 200, height: 100 });

    // Dragging 50px left in a 200px-wide frame shows 25% more of the right.
    pointer(frame, "pointerdown", 100, 50);
    pointer(frame, "pointermove", 50, 50);
    pointer(frame, "pointerup", 50, 50);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith([
      { ...deal.photos[0], focus: { x: 75, y: 50 } },
      deal.photos[1],
    ]);
  });

  it("shows an empty frame without photos", () => {
    const { container } = render(
      <MainPhoto
        ownerId="d2"
        photos={[]}
        photoStore={store}
        onChange={vi.fn()}
      />,
    );
    expect(container.querySelector(".ddm-main-photo.is-empty")).not.toBeNull();
    expect(screen.getByText("No photo yet")).toBeInTheDocument();
  });
});
