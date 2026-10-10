// Firestore documents max out at 1 MB, so photos are stored as JPEG data
// URLs kept under this size (the same budget contracts use).
export const MAX_PHOTO_DATA_URL_LENGTH = 700 * 1024;

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
  const img = await loadImage(file);
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
