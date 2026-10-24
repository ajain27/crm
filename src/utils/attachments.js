import { compressImage } from "./compressImage";

// Attachments (contracts, PM deal files) are saved as data URLs in
// Firestore; ones over a document's worth are split across several
// documents (see saveFileDoc in firestoreService), so a large PDF keeps
// its full quality.
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
export const MAX_ATTACHMENT_LABEL = "15 MB";

// Images over this are re-encoded as smaller JPEGs instead of being split;
// photos lose nothing visible and take far less space.
const COMPRESS_IMAGES_OVER_BYTES = 700 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// A chosen file as { name, type, data } ready to save: large images
// compressed, anything else read as is. Throws when the file is too large.
export async function prepareAttachment(file) {
  const type = file.type || "application/octet-stream";
  if (type.startsWith("image/") && file.size > COMPRESS_IMAGES_OVER_BYTES) {
    return {
      name: file.name,
      type: "image/jpeg",
      data: await compressImage(file, { maxDimension: 2400 }),
    };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `"${file.name}" is larger than ${MAX_ATTACHMENT_LABEL}. Choose a smaller file.`,
    );
  }
  return { name: file.name, type, data: await readAsDataUrl(file) };
}
