import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const updateUserProfile = vi.fn();
vi.mock("../../../../firebase/firestoreService", () => ({
  updateUserProfile: (...args) => updateUserProfile(...args),
}));

const { useProfileManager } = await import("./useProfileManager");

beforeEach(() => {
  updateUserProfile.mockReset();
  sessionStorage.clear();
  global.alert = vi.fn();
});

const baseProps = (overrides = {}) => ({
  currentUser: {
    id: "u1",
    firstName: "Jane",
    lastName: "Doe",
    profileImage: "",
  },
  setCurrentUser: vi.fn(),
  sessionStorageKey: "crmCurrentUser",
  ...overrides,
});

describe("useProfileManager", () => {
  it("seeds profileForm from currentUser", () => {
    const { result } = renderHook(() => useProfileManager(baseProps()));
    expect(result.current.profileForm.firstName).toBe("Jane");
    expect(result.current.profileForm.lastName).toBe("Doe");
  });

  it("modals start closed", () => {
    const { result } = renderHook(() => useProfileManager(baseProps()));
    expect(result.current.isProfileModalOpen).toBe(false);
    expect(result.current.isProfileMenuOpen).toBe(false);
  });

  it("setIsProfileModalOpen toggles modal", () => {
    const { result } = renderHook(() => useProfileManager(baseProps()));
    act(() => result.current.setIsProfileModalOpen(true));
    expect(result.current.isProfileModalOpen).toBe(true);
  });

  it("handleSaveProfile persists and closes the modal", async () => {
    updateUserProfile.mockResolvedValue({
      firstName: "Jane",
      lastName: "Doe",
    });
    const props = baseProps();
    const { result } = renderHook(() => useProfileManager(props));
    act(() => result.current.setIsProfileModalOpen(true));
    await act(async () => {
      await result.current.handleSaveProfile();
    });
    expect(updateUserProfile).toHaveBeenCalled();
    expect(props.setCurrentUser).toHaveBeenCalled();
    expect(sessionStorage.getItem("crmCurrentUser")).toBeTruthy();
    expect(result.current.isProfileModalOpen).toBe(false);
  });

  it("handleSaveProfile alerts on failure", async () => {
    updateUserProfile.mockRejectedValue(new Error("net"));
    const props = baseProps();
    const { result } = renderHook(() => useProfileManager(props));
    await act(async () => {
      await result.current.handleSaveProfile();
    });
    await waitFor(() => expect(global.alert).toHaveBeenCalled());
  });

  it("handleProfileImageChange rejects non-image files", () => {
    const props = baseProps();
    const { result } = renderHook(() => useProfileManager(props));
    const file = new File(["doc"], "doc.txt", { type: "text/plain" });
    act(() =>
      result.current.handleProfileImageChange({
        target: { files: [file], value: "x" },
      }),
    );
    expect(global.alert).toHaveBeenCalled();
  });

  it("handleProfileImageChange rejects files larger than 600KB", () => {
    const props = baseProps();
    const { result } = renderHook(() => useProfileManager(props));
    const big = new File([new Uint8Array(700 * 1024)], "big.png", {
      type: "image/png",
    });
    act(() =>
      result.current.handleProfileImageChange({
        target: { files: [big], value: "x" },
      }),
    );
    expect(global.alert).toHaveBeenCalledWith(
      "Profile photo must be smaller than 600 KB.",
    );
  });

  it("handleProfileImageChange no-ops when no file", () => {
    const props = baseProps();
    const { result } = renderHook(() => useProfileManager(props));
    act(() =>
      result.current.handleProfileImageChange({ target: { files: [] } }),
    );
    expect(global.alert).not.toHaveBeenCalled();
  });
});
