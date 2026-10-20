import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireRepSession } from "@/lib/app/auth/require-session";
import { RENDER_CONTENT_TYPES, RENDER_MAX_BYTES } from "@/lib/app/quotes/renders";

/**
 * Issues the client-upload token for quote renders; the browser then uploads
 * straight to Blob (public, random suffix). Rep-only: no session, no token.
 * The upload is attached to the quote afterwards by attachQuoteRenderAction,
 * so no onUploadCompleted callback is relied on.
 */
export async function POST(request: Request) {
  try {
    await requireRepSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "File storage isn't configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...RENDER_CONTENT_TYPES],
        maximumSizeInBytes: RENDER_MAX_BYTES,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
