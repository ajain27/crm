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
  const mockGetDoc = vi.fn();
  const mockGetFirestore = vi.fn(() => ({ firestore: true }));
  const mockQuery = vi.fn((...args) => ({ queryRef: args }));
  const mockWhere = vi.fn((...args) => ({ whereRef: args }));
  const mockLimit = vi.fn((value) => ({ limitRef: value }));

  return {
    collection: mockCollection,
    doc: mockDoc,
    getDoc: mockGetDoc,
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
  updateUserProfile,
  createUserAccount,
} = await import("./firestoreService");
const { getDocs, setDoc, deleteDoc, doc } = await import("firebase/firestore");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }),
  );
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
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "1",
        address: "123 Main",
        contractVersions: [],
        contractFileData: "",
      }),
    );
  });

  it("strips contract file data from deal before saving to Firestore", async () => {
    const property = {
      id: "1",
      address: "123 Main",
      contractVersions: [
        {
          id: "cv1",
          name: "contract.pdf",
          type: "application/pdf",
          data: "data:application/pdf;base64,ZmFrZQ==",
          uploadedAt: "2026-05-09T10:00:00.000Z",
        },
      ],
    };

    await saveDeal(property);

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contractVersions: [
          expect.objectContaining({
            id: "cv1",
            name: "contract.pdf",
            type: "application/pdf",
          }),
        ],
        contractFileData: "",
      }),
    );
    const savedArg = setDoc.mock.calls[0][1];
    expect(savedArg.contractVersions[0]).not.toHaveProperty("data");
  });

  it("deletes contract subcollection documents before deleting the property", async () => {
    const mockContractDoc = { ref: { contractDocRef: true } };
    getDocs.mockResolvedValue({ docs: [mockContractDoc] });

    await deleteDealById("1");

    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(deleteDoc).toHaveBeenCalledWith(mockContractDoc.ref);
    expect(doc).toHaveBeenCalledWith(expect.anything(), "1");
    expect(deleteDoc).toHaveBeenCalledTimes(2);
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

  it("updates a user profile with first and last name", async () => {
    await updateUserProfile({
      id: "u1",
      firstName: "Ankit",
      lastName: "Jain",
      profileImage: "data:image/png;base64,abc123",
    });

    expect(doc).toHaveBeenCalledWith(expect.anything(), "u1");
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        firstName: "Ankit",
        lastName: "Jain",
        profileImage: "data:image/png;base64,abc123",
      },
      { merge: true },
    );
  });

  it("resends activation when signing up with an inactive existing email", async () => {
    getDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "u1",
            data: () => ({
              email: "a4ankit27@yahoo.com",
              username: "a4ankit27",
              active: false,
              role: "ppc",
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [{ ref: { oldActivationRef: true } }],
      });

    const user = await createUserAccount({
      firstName: "Ankit",
      lastName: "Jain",
      username: "a4ankit27",
      email: "A4Ankit27@yahoo.com",
      password: "secret",
    });

    expect(deleteDoc).toHaveBeenCalledWith({ oldActivationRef: true });
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "u1",
        email: "a4ankit27@yahoo.com",
        used: false,
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/send-email",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("a4ankit27@yahoo.com"),
      }),
    );
    expect(user).toEqual(
      expect.objectContaining({
        id: "u1",
        email: "a4ankit27@yahoo.com",
        active: false,
        resentActivation: true,
      }),
    );
  });
});
