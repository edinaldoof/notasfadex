
import { auth } from "@/auth";
import { getDriveService } from "@/lib/google-drive";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyAttestationToken } from "@/lib/token-utils";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// helper: converte Node stream -> Web stream
function toWebStream(nodeStream: Readable) {
  // @ts-ignore
  return Readable.toWeb(nodeStream);
}

// helper: decide export MIME p/ arquivos Google
function pickExportMime(googleMime?: string): string {
  switch (googleMime) {
    case "application/vnd.google-apps.document":
    case "application/vnd.google-apps.presentation":
    case "application/vnd.google-apps.spreadsheet":
    case "application/vnd.google-apps.drawing":
      return "application/pdf"; // bom p/ visualização
    default:
      return "application/pdf";
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { fileId } = params;
  const session = await auth();
  const token = request.nextUrl.searchParams.get("token");

  let isTokenValid = false;
  let noteFromToken: Awaited<ReturnType<typeof prisma.fiscalNote.findUnique>>;

  if (token) {
    try {
      const decoded = verifyAttestationToken(token);
      if (decoded) {
        noteFromToken = await prisma.fiscalNote.findUnique({
          where: { id: decoded.noteId },
        });

        if (
          noteFromToken &&
          (noteFromToken.driveFileId === fileId ||
            noteFromToken.attestedDriveFileId === fileId ||
            noteFromToken.reportDriveFileId === fileId)
        ) {
          isTokenValid = true;
        }
      }
    } catch (error) {
      console.error("Token validation failed for download:", error);
      isTokenValid = false;
    }
  }

  if (!session && !isTokenValid) {
    return new NextResponse("Acesso não autorizado", { status: 401 });
  }

  try {
    // Ache a nota pelo fileId
    const note = await prisma.fiscalNote.findFirst({
      where: {
        OR: [
          { driveFileId: fileId },
          { attestedDriveFileId: fileId },
          { reportDriveFileId: fileId },
        ],
      },
      select: {
        id: true,
        userId: true,
        fileName: true,
        reportFileName: true,
        driveFileId: true,
        attestedDriveFileId: true,
        reportDriveFileId: true,
        attestedFileUrl: true,
      },
    });

    if (!note) {
      return new NextResponse("Arquivo não vinculado a nenhuma nota.", {
        status: 404,
      });
    }

    let canAccess = false;

    // Token válido para a MESMA nota
    if (isTokenValid && note.id === noteFromToken?.id) {
      canAccess = true;
    }

    // Usuário autenticado com permissão
    if (session?.user?.id) {
      const isOwner = note.userId === session.user.id;
      const isManager =
        session.user.role === "OWNER" || session.user.role === "MANAGER";
      if (isOwner || isManager) canAccess = true;
    }

    if (!canAccess) {
      return new NextResponse("Acesso negado ao arquivo.", { status: 403 });
    }

    const drive = getDriveService();

    // 1) Metadados p/ decidir se é Google Docs e obter nome/MIME
    const { data: meta } = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, md5Checksum, modifiedTime",
      supportsAllDrives: true,
    });

    const isGoogleApp = (meta.mimeType || "").startsWith(
      "application/vnd.google-apps"
    );

    // 2) Definir o nome do arquivo que vamos servir
    let fileName = "download";
    if (note.driveFileId === fileId) {
      fileName = note.fileName || meta.name || "download";
    } else if (note.attestedDriveFileId === fileId) {
      // tenta nome do meta; se não tiver, cai para prefixo
      fileName = meta.name || `atesto_${note.fileName || "arquivo"}`;
    } else if (note.reportDriveFileId === fileId) {
      fileName = note.reportFileName || meta.name || "relatorio";
    } else {
      fileName = meta.name || "arquivo";
    }

    // 3) Buscar o conteúdo (export p/ Google Docs, senão media stream)
    let nodeStreamResp:
      | Awaited<ReturnType<typeof drive.files.get>>
      | Awaited<ReturnType<typeof drive.files.export>>;
    if (isGoogleApp) {
      nodeStreamResp = await drive.files.export(
        {
          fileId,
          mimeType: pickExportMime(meta.mimeType || undefined),
        },
        { responseType: "stream" as const }
      );
    } else {
      nodeStreamResp = await drive.files.get(
        {
          fileId,
          alt: "media",
          supportsAllDrives: true,
          // Dica: para Range (vídeos), você pode repassar:
          // headers: { Range: request.headers.get('range') ?? '' }
        },
        { responseType: "stream" as const }
      );
    }

    const nodeStream = nodeStreamResp.data as any as Readable;

    // 4) Cabeçalhos — inline por padrão
    const contentType = isGoogleApp
      ? pickExportMime(meta.mimeType || undefined)
      : meta.mimeType || "application/octet-stream";

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        fileName
      )}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    });

    // Content-Length/ETag se vierem dos metadados (nem sempre vem no stream)
    if (meta.size) headers.set("Content-Length", String(meta.size));
    if (meta.md5Checksum) headers.set("ETag", meta.md5Checksum);

    // 5) Entregar como Web Stream
    return new NextResponse(toWebStream(nodeStream), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Failed to preview file:", error);
    return new NextResponse("Erro ao obter o arquivo do Drive.", {
      status: 500,
    });
  }
}
