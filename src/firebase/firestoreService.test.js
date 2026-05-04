import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/firestore", () => {
  const mockCollection = vi.fn(() => ({ collectionRef: true }));
  const mockDoc = vi.fn(() => ({ docRef: true }));
  const mockGetDocs = vi.fn();
  const mockSetDoc = vi.fn();
  const mockDeleteDoc = vi.fn();
  const mockGetFirestore = vi.fn(() => ({ firestore: true }));
  const mockQuery = vi.fn((...args) => ({ queryRef: args }));
  const mockWhere = vi.fn((...args) => ({ whereRef: args }));
  const mockLimit = vi.fn((value) => ({ limitRef: value }));

  return {
    collection: mockCollection,
    doc: mockDoc,
    getDocs: mockGetDocs,
    setDoc: mockSetDoc,
    deleteDoc: mockDeleteDoc,
    getFirestore: mockGetFirestore,
    query: mockQuery,
    where: mockWhere,
    limit: mockLimit,
  };
});

const {
  fetchDeals,
  fetchBuyers,
  saveDeal,
  saveBuyer,
  deleteDealById,
  deleteBuyerById,
} = await import("./firestoreService");
const { getDocs, setDoc, deleteDoc, collection, doc } =
  await import("firebase/firestore");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("firestoreService", () => {
  it("fetches deals from the properties collection", async () => {
    const mockSnapshot = {
      docs: [{ id: "1", data: () => ({ address: "123 Main" }) }],
    };

    getDocs.mockResolvedValue(mockSnapshot);

    const deals = await fetchDeals();

    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(deals).toEqual([{ id: "1", address: "123 Main" }]);
  });

  it("saves a property document", async () => {
    const property = { id: "1", address: "123 Main" };

    await saveDeal(property);

    expect(doc).toHaveBeenCalledWith(expect.anything(), "1");
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), property);
  });

  it("deletes a property document by id", async () => {
    await deleteDealById("1");

    expect(doc).toHaveBeenCalledWith(expect.anything(), "1");
    expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
  });

  it("fetches buyers from the buyers collection", async () => {
    const mockSnapshot = {
      docs: [{ id: "b1", data: () => ({ fullName: "Jane" }) }],
    };

    getDocs.mockResolvedValue(mockSnapshot);

    const buyers = await fetchBuyers();

    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(buyers).toEqual([{ id: "b1", fullName: "Jane" }]);
  });

  it("saves a buyer document", async () => {
    const buyer = { id: "b1", fullName: "Jane" };

    await saveBuyer(buyer);

    expect(doc).toHaveBeenCalledWith(expect.anything(), "b1");
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), buyer);
  });

  it("deletes a buyer document by id", async () => {
    await deleteBuyerById("b1");

    expect(doc).toHaveBeenCalledWith(expect.anything(), "b1");
    expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
  });
});
