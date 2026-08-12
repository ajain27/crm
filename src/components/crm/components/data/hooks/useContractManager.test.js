import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useContractManager } from "./useContractManager";

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const dealWithContract = {
  id: "d1",
  address: "1 Main",
  contractVersions: [
    {
      id: "v1",
      name: "contract.pdf",
      type: "application/pdf",
      uploadedAt: "2026-01-01T00:00:00Z",
    },
  ],
};

const baseProps = (overrides = {}) => ({
  deals: [dealWithContract],
  saveContractVersion: vi.fn().mockResolvedValue(undefined),
  fetchContractVersion: vi
    .fn()
    .mockResolvedValue({ id: "v1", data: "data:application/pdf;base64,XYZ" }),
  deleteContractById: vi.fn().mockResolvedValue(undefined),
  currentUserId: "u1",
  updateDealPatch: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("useContractManager", () => {
  it("openContract no-ops when deal has no versions", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    await act(async () => {
      await result.current.openContract({ id: "d9", contractVersions: [] });
    });
    expect(result.current.selectedContractDealId).toBeNull();
    expect(props.fetchContractVersion).not.toHaveBeenCalled();
  });

  it("openContract sets selection and fetches data when not cached", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    await act(async () => {
      await result.current.openContract(dealWithContract);
    });
    await waitFor(() =>
      expect(result.current.selectedContractDealId).toBe("d1"),
    );
    expect(result.current.selectedContractVersionId).toBe("v1");
    expect(props.fetchContractVersion).toHaveBeenCalled();
  });

  it("closeContractModal clears selection", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    await act(async () => {
      await result.current.openContract(dealWithContract);
    });
    act(() => result.current.closeContractModal());
    expect(result.current.selectedContractDealId).toBeNull();
    expect(result.current.selectedContractVersionId).toBeNull();
  });

  it("handleContractUpload rejects unsupported file types", () => {
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    const exe = new File(["x"], "evil.exe", {
      type: "application/x-msdownload",
    });
    act(() =>
      result.current.handleContractUpload(dealWithContract, {
        target: { files: [exe], value: "x" },
      }),
    );
    expect(global.alert).toHaveBeenCalled();
    expect(props.saveContractVersion).not.toHaveBeenCalled();
  });

  it("handleContractUpload rejects files larger than 700KB", () => {
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    const big = new File([new Uint8Array(700 * 1024 + 100)], "big.pdf", {
      type: "application/pdf",
    });
    act(() =>
      result.current.handleContractUpload(dealWithContract, {
        target: { files: [big], value: "x" },
      }),
    );
    expect(global.alert).toHaveBeenCalledWith(
      '"big.pdf" is larger than 700 KB. Choose smaller files.',
    );
    expect(props.saveContractVersion).not.toHaveBeenCalled();
  });

  it("handleContractUpload saves multiple files as separate versions", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    const fileA = new File(["a"], "a.pdf", { type: "application/pdf" });
    const fileB = new File(["b"], "b.pdf", { type: "application/pdf" });
    await act(async () => {
      result.current.handleContractUpload(dealWithContract, {
        target: { files: [fileA, fileB], value: "x" },
      });
      await waitFor(() => expect(props.updateDealPatch).toHaveBeenCalled());
    });
    expect(props.saveContractVersion).toHaveBeenCalledTimes(2);
    const patch = props.updateDealPatch.mock.calls[0][1];
    expect(patch.contractVersions).toHaveLength(3);
  });

  it("handleDeleteContractVersion respects user cancel", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    await act(async () => {
      await result.current.handleDeleteContractVersion(dealWithContract, "v1");
    });
    expect(props.deleteContractById).not.toHaveBeenCalled();
  });

  it("handleDeleteContractVersion deletes and updates patch", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useContractManager(props));
    await act(async () => {
      await result.current.handleDeleteContractVersion(dealWithContract, "v1");
    });
    expect(props.deleteContractById).toHaveBeenCalledWith("d1", "v1");
    expect(props.updateDealPatch).toHaveBeenCalled();
  });
});
