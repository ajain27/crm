import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePMDealFiles } from "./usePMDealFiles";

const dealWithFile = {
  id: "d1",
  borrowerName: "Jane",
  files: [{ id: "f1", name: "contract.pdf", type: "application/pdf" }],
};

const baseProps = (overrides = {}) => ({
  deals: [dealWithFile],
  setDeals: vi.fn(),
  currentUser: { id: "u1" },
  savePmDeal: vi.fn().mockResolvedValue(undefined),
  savePmDealFile: vi.fn().mockResolvedValue(undefined),
  fetchPmDealFile: vi
    .fn()
    .mockResolvedValue({ data: "data:application/pdf;base64,XYZ" }),
  deletePmDealFileById: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
});

describe("usePMDealFiles", () => {
  it("starts with no selected deal/file", () => {
    const { result } = renderHook(() => usePMDealFiles(baseProps()));
    expect(result.current.selectedDeal).toBeNull();
    expect(result.current.modalDeal).toBeNull();
    expect(result.current.uploadingId).toBeNull();
    expect(result.current.fileVersions).toEqual([]);
  });

  it("openFile sets selected deal/file and fetches data when not cached", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealFiles(props));
    await act(async () => {
      await result.current.openFile(dealWithFile);
    });
    await waitFor(() => expect(result.current.selectedDeal?.id).toBe("d1"));
    expect(props.fetchPmDealFile).toHaveBeenCalledWith("d1", "f1");
    expect(result.current.modalDeal).toEqual({ id: "d1", address: "Jane" });
  });

  it("openFile does nothing for a deal with no files", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealFiles(props));
    await act(async () => {
      await result.current.openFile({ id: "d2", files: [] });
    });
    expect(result.current.selectedDeal).toBeNull();
    expect(props.fetchPmDealFile).not.toHaveBeenCalled();
  });

  it("closeModal clears selection", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealFiles(props));
    await act(async () => {
      await result.current.openFile(dealWithFile);
    });
    act(() => result.current.closeModal());
    expect(result.current.selectedDeal).toBeNull();
    expect(result.current.modalDeal).toBeNull();
  });

  it("handleSelectFileVersion fetches when the requested file isn't cached", async () => {
    const dealMulti = {
      id: "d1",
      borrowerName: "Jane",
      files: [
        { id: "f1", name: "a.pdf", type: "application/pdf" },
        { id: "f2", name: "b.pdf", type: "application/pdf" },
      ],
    };
    const props = baseProps({ deals: [dealMulti] });
    const { result } = renderHook(() => usePMDealFiles(props));
    await act(async () => {
      await result.current.openFile(dealMulti);
    });
    props.fetchPmDealFile.mockClear();
    await act(async () => {
      await result.current.handleSelectFileVersion("f2");
    });
    expect(props.fetchPmDealFile).toHaveBeenCalledWith("d1", "f2");
  });

  it("handleDeleteFile removes the file and clears selection when last file is deleted", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealFiles(props));
    await act(async () => {
      await result.current.openFile(dealWithFile);
    });
    await act(async () => {
      await result.current.handleDeleteFile({ id: "d1" }, "f1");
    });
    expect(props.deletePmDealFileById).toHaveBeenCalledWith("d1", "f1");
    expect(props.savePmDeal).toHaveBeenCalled();
    expect(result.current.selectedDeal).toBeNull();
  });

  it("handleDeleteFile alerts on failure", async () => {
    const props = baseProps();
    props.deletePmDealFileById = vi.fn().mockRejectedValue(new Error("net"));
    const { result } = renderHook(() => usePMDealFiles(props));
    await act(async () => {
      await result.current.openFile(dealWithFile);
    });
    await act(async () => {
      await result.current.handleDeleteFile({ id: "d1" }, "f1");
    });
    expect(global.alert).toHaveBeenCalled();
  });

  it("handleFileUpload rejects files over 700KB", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealFiles(props));
    const bigFile = new File([new Uint8Array(700 * 1024 + 10)], "big.pdf", {
      type: "application/pdf",
    });
    const event = {
      target: { files: [bigFile], value: "X" },
    };
    await act(async () => {
      await result.current.handleFileUpload(dealWithFile, event);
    });
    expect(global.alert).toHaveBeenCalledWith(
      "File must be smaller than 700 KB.",
    );
    expect(props.savePmDealFile).not.toHaveBeenCalled();
  });

  it("handleFileUpload no-ops when no file selected", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealFiles(props));
    await act(async () => {
      await result.current.handleFileUpload(dealWithFile, {
        target: { files: [] },
      });
    });
    expect(props.savePmDealFile).not.toHaveBeenCalled();
  });
});
