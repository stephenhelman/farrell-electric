import { NextResponse } from "next/server";
import { getRepo } from "@/lib/app/repo";

/**
 * Public, unauthenticated by design: the job's unguessable sowSlug is the
 * authorization (same posture as /pay/[token]). 302s to the stored SOW PDF so the
 * raw Blob URL stays internal; 404 for an unknown slug or a SOW not generated yet.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blobUrl = await (await getRepo()).getSowBlobUrlBySlug(slug);
  if (!blobUrl) {
    return new NextResponse("Scope of work not available.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return NextResponse.redirect(blobUrl, { status: 302, headers: { "cache-control": "no-store" } });
}
