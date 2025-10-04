import { Readable } from "node:stream";

/**
 * Converts a Node.js Readable stream to a Web ReadableStream.
 * This is necessary to use Node.js streams with Next.js Response objects.
 * @param nodeStream The Node.js stream to convert.
 * @returns A Web API ReadableStream.
 */
export function nodeToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  // The Readable.toWeb static method is the modern way to do this.
  // @ts-ignore - Sometimes TypeScript typings for Node built-ins can be slightly off.
  return Readable.toWeb(nodeStream);
}

/**
 * Determines the appropriate MIME type for exporting Google Workspace files (Docs, Sheets, etc.).
 * Defaults to PDF for broad compatibility and easy viewing.
 * @param googleMime The MIME type reported by the Google Drive API.
 * @returns The MIME type to use for the export request (e.g., "application/pdf").
 */
export function getExportMimeType(googleMime?: string): string {
  const googleAppMimes = [
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.presentation",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.drawing",
  ];

  if (googleMime && googleAppMimes.includes(googleMime)) {
    return "application/pdf";
  }

  // Default to PDF for any other Google App types or if undefined.
  return "application/pdf";
}