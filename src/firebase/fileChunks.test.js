// Attachments over a Firestore document's worth are split across sibling
// documents and put back together on fetch. Firestore is an in-memory map
// here.
import { describe, expect, it, vi, beforeEach } from "vitest";

const store = vi.hoisted(() => new Map());

vi.mock("firebase/app", () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock("firebase/firestore", () => {
  const snap = (path) => ({
    exists: () => store.has(path),
    id: path.split("/").at(-1),
    data: () => store.get(path),
  });
  return {
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn((db, ...segments) => ({ path: segments.join("/") })),
    doc: vi.fn((coll, id) => ({ path: `${coll.path}/${id}` })),
    setDoc: vi.fn(async (ref, data) => store.set(ref.path, data)),
    getDoc: vi.fn(async (ref) => snap(ref.path)),
    deleteDoc: vi.fn(async (ref) => store.delete(ref.path)),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
});

const {
  saveContractVersion,
  fetchContractVersion,
  deleteContractById,
  savePmDealFile,
  fetchPmDealFile,
} = await import("./firestoreService");

const FIRESTORE_DOC_LIMIT = 1024 * 1024;

const pdf = (length) =>
  `data:application/pdf;base64,${"JVBERi0xLjcK".repeat(Math.ceil(length / 12)).slice(0, length)}`;

beforeEach(() => store.clear());

describe("large attachments", () => {
  it("saves a PDF over 700 KB in parts, each under Firestore's 1 MB limit, and reads it back whole", async () => {
    const data = pdf(2_500_000); // a ~1.9 MB PDF
    await saveContractVersion({
      id: "c1",
      dealId: "d1",
      userId: "u1",
      name: "contract.pdf",
      type: "application/pdf",
      data,
      uploadedAt: "2026-10-24",
    });

    const docs = [...store.entries()];
    expect(docs.length).toBe(5); // the file's document and 4 parts
    docs.forEach(([, d]) =>
      expect(JSON.stringify(d).length).toBeLessThan(FIRESTORE_DOC_LIMIT),
    );
    expect(store.get("properties/d1/contracts/c1")).toMatchObject({
      name: "contract.pdf",
      data: "",
      chunkCount: 4,
    });

    const fetched = await fetchContractVersion("d1", "c1");
    expect(fetched.data).toBe(data);
    expect(fetched.name).toBe("contract.pdf");
  });

  it("keeps a small file in one document, as before", async () => {
    const data = pdf(50_000);
    await savePmDealFile({
      id: "f1",
      pmDealId: "p1",
      userId: "u1",
      name: "small.pdf",
      type: "application/pdf",
      data,
      uploadedAt: "2026-10-24",
    });
    expect([...store.keys()]).toEqual(["pmDeals/p1/files/f1"]);
    expect((await fetchPmDealFile("p1", "f1")).data).toBe(data);
  });

  it("deletes a large file's parts with it", async () => {
    await saveContractVersion({
      id: "c1",
      dealId: "d1",
      userId: "u1",
      name: "contract.pdf",
      type: "application/pdf",
      data: pdf(1_600_000),
      uploadedAt: "2026-10-24",
    });
    await deleteContractById("d1", "c1");
    expect(store.size).toBe(0);
  });

  it("says so when a part is missing", async () => {
    await saveContractVersion({
      id: "c1",
      dealId: "d1",
      userId: "u1",
      name: "contract.pdf",
      type: "application/pdf",
      data: pdf(1_600_000),
      uploadedAt: "2026-10-24",
    });
    store.delete("properties/d1/contracts/c1~1");
    await expect(fetchContractVersion("d1", "c1")).rejects.toThrow(
      /Part of "contract.pdf" is missing/,
    );
  });
});
