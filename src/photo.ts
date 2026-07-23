// Workout-proof photo capture (web). Opens the browser photo/camera picker
// (mobile browsers offer "Take Photo"), then downscales + JPEG-compresses to a
// small thumbnail so it can live inline in the synced state blob. The pruning
// that keeps the blob under DynamoDB's item limit is pure logic — see
// prunePhotos() in logic.ts.
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Photo } from "./types";

export const PHOTO_MAX_DIM = 320; // longest edge, px
export const PHOTO_QUALITY = 0.5; // JPEG quality 0..1

/**
 * Open the camera (native) or photo picker (web — mobile browsers offer the
 * camera in the file sheet), then return a compressed data-URL photo. Returns
 * null if the user cancelled or denied permission (caller should NOT mark done).
 */
export async function capturePhoto(): Promise<Photo | null> {
  // Web only: the picker opens a file input; mobile browsers surface "Take
  // Photo" there. Returns null if the user cancelled.
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
  if (res.canceled || !res.assets?.length) return null;
  const uri = res.assets[0].uri;

  const out = await manipulateAsync(uri, [{ resize: { width: PHOTO_MAX_DIM } }], {
    compress: PHOTO_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) return null;
  return { uri: `data:image/jpeg;base64,${out.base64}`, at: Date.now() };
}
