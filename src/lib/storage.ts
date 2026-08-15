import { put, del } from "@vercel/blob";

/**
 * Screenshot storage via Vercel Blob. `BLOB_READ_WRITE_TOKEN` is provisioned
 * automatically when a Blob store is connected to the Vercel project (and
 * must be set manually in `.env` for local dev) — see ARCHITECTURE.md's
 * "File storage" section. Callers should check `isStorageConfigured()` first
 * and surface a clear message rather than letting `put`/`del` throw.
 */

export function isStorageConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function uploadScreenshot(
  userId: string,
  file: File
): Promise<{ url: string }> {
  const blob = await put(`screenshots/${userId}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

export async function deleteScreenshot(url: string): Promise<void> {
  await del(url);
}
