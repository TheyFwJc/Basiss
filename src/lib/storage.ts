import { promises as fs } from "fs";
import path from "path";
import { put, del } from "@vercel/blob";

/**
 * Screenshot storage: Vercel Blob when a store is connected, local disk
 * otherwise (dev, or any deployment that hasn't connected a Blob store yet)
 * — matching ARCHITECTURE.md's "local disk in dev, S3-compatible storage in
 * production" plan. Local files land under `public/uploads/screenshots` so
 * Next serves them directly at `/uploads/screenshots/...`; this only works
 * for hosts with a writable, persistent filesystem (fine for a single
 * dev/VM/container deploy, not for serverless platforms — those need Blob).
 *
 * A connected store is detected via `BLOB_STORE_ID`, not just the older
 * `BLOB_READ_WRITE_TOKEN`: newer Vercel projects authenticate `put`/`del`
 * via OIDC (`BLOB_STORE_ID` + the auto-refreshed `VERCEL_OIDC_TOKEN`, which
 * `@vercel/blob` reads on its own) instead of a static token, so a project
 * can have Blob fully working with no `BLOB_READ_WRITE_TOKEN` present at all.
 */

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "screenshots");
const LOCAL_UPLOAD_URL_PREFIX = "/uploads/screenshots/";

function isBlobConfigured() {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

async function uploadScreenshotLocal(userId: string, file: File): Promise<{ url: string }> {
  const dir = path.join(LOCAL_UPLOAD_DIR, userId);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return { url: `${LOCAL_UPLOAD_URL_PREFIX}${userId}/${filename}` };
}

async function deleteScreenshotLocal(url: string): Promise<void> {
  const relative = url.slice(LOCAL_UPLOAD_URL_PREFIX.length);
  const resolved = path.resolve(LOCAL_UPLOAD_DIR, relative);
  // Guard against a malformed/tampered URL escaping the upload directory.
  if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return;
  await fs.unlink(resolved).catch(() => {});
}

export async function uploadScreenshot(userId: string, file: File): Promise<{ url: string }> {
  if (isBlobConfigured()) {
    const blob = await put(`screenshots/${userId}/${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }
  return uploadScreenshotLocal(userId, file);
}

export async function deleteScreenshot(url: string): Promise<void> {
  if (url.startsWith(LOCAL_UPLOAD_URL_PREFIX)) {
    await deleteScreenshotLocal(url);
    return;
  }
  await del(url);
}
