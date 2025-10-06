import { NextRequest, NextResponse } from "next/server";
import { getFileForDownload } from "../../../../lib/services/download.service";
import { nodeToWebStream } from "../../../../lib/google-drive-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { fileId } = params;
  const token = request.nextUrl.searchParams.get("token");

  try {
    const { stream, filename, contentType, contentLength, etag } =
      await getFileForDownload(fileId, token);

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    });

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    if (etag) {
      headers.set("ETag", etag);
    }

    return new NextResponse(nodeToWebStream(stream), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return new NextResponse("Acesso não autorizado ou negado.", { status: 403 });
    }
    console.error("Failed to download file:", error);
    return new NextResponse("Erro ao obter o arquivo.", { status: 500 });
  }
}