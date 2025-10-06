import { auth } from "../../../auth";
import { getDriveService } from "../../../lib/google-drive";
import prisma from "../../../lib/prisma";
import { verifyAttestationToken } from "../../../lib/token-utils";
import { getExportMimeType } from "../../../lib/google-drive-utils";
import { Readable } from "node:stream";
import { Role } from "@prisma/client";

/**
 * Verifies if a user has permission to access a file.
 * Access is granted if the user is the owner, an admin, or has a valid temporary token.
 * @param fileId The ID of the file in Google Drive.
 * @param token A temporary access token from the URL.
 * @returns The note associated with the file if access is granted, otherwise null.
 */
async function authorizeFileAccess(fileId: string, token?: string | null) {
  const session = await auth();
  const userId = session?.creator?.id;
  const userRole = session?.creator?.role;

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
    },
  });

  if (!note) {
    return null;
  }

  // Check 1: User is authenticated and is the owner or an admin
  if (userId && userRole) {
    const isOwner = note.userId === userId;
    const isAdmin = userRole === Role.OWNER || userRole === Role.MANAGER;
    if (isOwner || isAdmin) {
      return note;
    }
  }

  // Check 2: A valid temporary token is provided
  if (token) {
    try {
      const decoded = verifyAttestationToken(token);
      // Ensure the token corresponds to the requested file's note
      if (decoded.noteId === note.id) {
        return note;
      }
    } catch (error) {
      console.warn("Token validation failed during download authorization:", error);
    }
  }

  return null;
}

/**
 * Fetches file content from Google Drive.
 * It handles both regular files and Google Workspace documents (by exporting them).
 * @param fileId The ID of the file in Google Drive.
 * @returns An object containing the file stream and its metadata.
 */
async function fetchFileFromDrive(fileId: string) {
  const drive = getDriveService();

  const { data: metadata } = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, md5Checksum",
    supportsAllDrives: true,
  });

  const isGoogleDoc = (metadata.mimeType || "").startsWith("application/vnd.google-apps");
  const exportMimeType = getExportMimeType(metadata.mimeType || undefined);

  let fileStreamResponse;
  if (isGoogleDoc) {
    fileStreamResponse = await drive.files.export(
      { fileId, mimeType: exportMimeType },
      { responseType: "stream" }
    );
  } else {
    fileStreamResponse = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" }
    );
  }

  return {
    stream: fileStreamResponse.data as Readable,
    metadata,
    isGoogleDoc,
    exportMimeType,
  };
}

/**
 * Determines the correct filename for the download.
 * @param note The fiscal note object.
 * @param fileId The ID of the file being downloaded.
 * @param driveMetadata The metadata from Google Drive.
 * @returns The calculated filename.
 */
function getDownloadFilename(note: any, fileId: string, driveMetadata: any): string {
  if (note.driveFileId === fileId) {
    return note.fileName || driveMetadata.name || "download";
  }
  if (note.attestedDriveFileId === fileId) {
    return driveMetadata.name || `atesto_${note.fileName || "arquivo"}`;
  }
  if (note.reportDriveFileId === fileId) {
    return note.reportFileName || driveMetadata.name || "relatorio";
  }
  return driveMetadata.name || "arquivo_desconhecido";
}

/**
 * Orchestrates the file download process.
 * 1. Authorizes the request.
 * 2. Fetches the file from Google Drive.
 * 3. Determines the correct filename.
 * @param fileId The ID of the file to download.
 * @param token An optional temporary access token.
 * @returns An object with the stream, filename, and metadata for the response.
 */
export async function getFileForDownload(fileId: string, token?: string | null) {
  const note = await authorizeFileAccess(fileId, token);
  if (!note) {
    throw new Error("UNAUTHORIZED");
  }

  const { stream, metadata, isGoogleDoc, exportMimeType } = await fetchFileFromDrive(fileId);

  const filename = getDownloadFilename(note, fileId, metadata);
  const contentType = isGoogleDoc
    ? exportMimeType
    : metadata.mimeType || "application/octet-stream";

  return {
    stream,
    filename,
    contentType,
    contentLength: metadata.size,
    etag: metadata.md5Checksum,
  };
}