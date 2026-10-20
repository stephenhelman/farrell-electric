import { del, put } from "@vercel/blob";

/**
 * Stub-first document storage. With BLOB_READ_WRITE_TOKEN unset this logs once
 * and resolves null instead of uploading, so the app builds and runs with zero
 * Blob credentials — same discipline as lib/ghl/dispatch.ts. Never throws:
 * an upload failure is logged and also resolves null, so callers (document
 * generation) can treat "no URL" as a non-fatal outcome.
 *
 * Uploads are public with a random suffix: the URL is unguessable but not
 * authenticated, the same posture as /q/[token]. Only put customer-facing
 * documents here — never anything carrying cost/profit/margin/revenue.
 */
let warnedUnset = false;

export async function putDocument(
  pathPrefix: string,
  data: Uint8Array | Buffer,
  contentType: string,
): Promise<{ url: string } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    if (!warnedUnset) {
      warnedUnset = true;
      console.log(`[blob:noop] BLOB_READ_WRITE_TOKEN not set — ${pathPrefix} was not stored.`);
    }
    return null;
  }

  try {
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const blob = await put(pathPrefix, body, {
      access: "public",
      addRandomSuffix: true,
      contentType,
      token,
    });
    return { url: blob.url };
  } catch (error) {
    console.error(`[blob] upload of ${pathPrefix} failed (best-effort, non-fatal)`, error);
    return null;
  }
}

/** True for a URL that lives in a Vercel Blob public store — the only kind a render may point at. */
export function isBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Best-effort blob removal: unset token or a failure is logged, never thrown (the DB row is the source of truth). */
export async function deleteDocument(url: string): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !isBlobUrl(url)) return false;
  try {
    await del(url, { token });
    return true;
  } catch (error) {
    console.error(`[blob] delete of ${url} failed (best-effort, non-fatal)`, error);
    return false;
  }
}
