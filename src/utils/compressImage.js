// Firestore documents max out at 1 MB, so photos are stored as JPEG data
// URLs kept under this size (the same budget contracts use).
export const MAX_PHOTO_DATA_URL_LENGTH = 700 * 1024;

const HEIC_NAME = /\.(heic|heif)$/i;

export function isHeicFile(file) {
  return /^image\/hei[cf]/i.test(file.type) || HEIC_NAME.test(file.name);
}

// iPhone photos are HEIC, which only Safari can decode. Elsewhere, convert
// to JPEG with heic-to (loaded only when a HEIC file is picked — it's large).
async function heicToJpeg(file) {
  const { heicTo } = await import("heic-to");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return new File([blob], file.name.replace(HEIC_NAME, ".jpg"), {
    type: "image/jpeg",
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" couldn't be read as an image.`));
    };
    img.src = url;
  });
}

// Scales `file` down to at most `maxDimension` px on its long side and
// re-encodes it as JPEG, lowering quality (then size) until the data URL
// fits in `maxLength`. Phone photos are several MB, so this always runs.
export async function compressImage(
  file,
  { maxDimension = 1600, maxLength = MAX_PHOTO_DATA_URL_LENGTH } = {},
) {
  let img;
  try {
    img = await loadImage(file);
  } catch (error) {
    if (!isHeicFile(file)) throw error;
    try {
      img = await loadImage(await heicToJpeg(file));
    } catch {
      throw new Error(`"${file.name}" couldn't be converted from HEIC.`);
    }
  }
  let dimension = maxDimension;

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, dimension / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    // JPEG has no transparency; fill white so transparent PNGs don't go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.7, 0.58]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= maxLength) return dataUrl;
    }
    dimension = Math.round(dimension * 0.75);
  }
  throw new Error(`"${file.name}" is too large to save, even compressed.`);
}
