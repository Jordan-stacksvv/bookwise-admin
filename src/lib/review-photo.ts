import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";

/** Shrinks a phone photo to at most 1600px / JPEG so uploads are small and fast. */
async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new ConvexError("Please choose a photo.");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new ConvexError("Could not read that photo. Try another one.");
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ConvexError("Could not read that photo. Try another one.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new ConvexError("Could not process that photo."))), "image/jpeg", quality));
}

/** Returns an `upload(file)` that stores the photo in Convex and gives back its storage id. */
export function useReviewPhotoUpload() {
  const generate = useMutation(api.reviews.generateUploadUrl);
  return async (file: File): Promise<string> => {
    const blob = await compressImage(file);
    const url = await generate({});
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
    if (!res.ok) throw new ConvexError("The photo did not upload. Please try again.");
    const { storageId } = (await res.json()) as { storageId: string };
    return storageId;
  };
}
