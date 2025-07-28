
import { auth } from "@/auth";
import { getDriveService } from "@/lib/google-drive";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyAttestationToken } from "@/lib/token-utils";

export async function GET(
    request: NextRequest,
    { params }: { params: { fileId: string } }
) {
    const session = await auth();
    const token = request.nextUrl.searchParams.get('token');

    let isTokenValid = false;
    let noteFromToken;

    if (token) {
        try {
            const decoded = verifyAttestationToken(token);
            if (decoded) {
                 noteFromToken = await prisma.fiscalNote.findUnique({
                    where: { id: decoded.noteId }
                 });

                 if (noteFromToken && noteFromToken.driveFileId === params.fileId) {
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

    const fileId = params.fileId;

    try {
        // Find the note associated with the fileId
        const note = await prisma.fiscalNote.findFirst({
            where: {
                OR: [
                    { driveFileId: fileId },
                    { attestedDriveFileId: fileId }
                ]
            },
        });

        if (!note) {
             return new NextResponse("Arquivo não vinculado a nenhuma nota.", { status: 404 });
        }
        
        let canAccess = false;

        // Public access via valid token
        if (isTokenValid && note.id === noteFromToken?.id) {
            canAccess = true;
        }

        // Authenticated access
        if (session && session.user && session.user.id) {
            const isOwner = note.userId === session.user.id;
            const isManager = session.user.role === 'OWNER' || session.user.role === 'MANAGER';
             if (isOwner || isManager) {
                canAccess = true;
             }
        }
        

        if (!canAccess) {
            return new NextResponse("Acesso negado ao arquivo.", { status: 403 });
        }
        
        const drive = getDriveService();
        const driveResponse = await drive.files.get(
            { fileId: fileId, alt: "media" },
            { responseType: "stream" }
        );

        // Get headers from driveResponse
        const headers = new Headers();
        const driveHeaders = driveResponse.headers as unknown as Record<string, string>;
        
        let fileName = 'download';
        if (note.driveFileId === fileId) {
            fileName = note.fileName;
        } else if (note.attestedDriveFileId === fileId && note.attestedFileUrl) {
            // Attempt to get a more descriptive name for the attested file if possible
             const attestedFile = await drive.files.get({ fileId: fileId, fields: 'name', supportsAllDrives: true });
             fileName = attestedFile.data.name || `atesto_${note.fileName}`;
        }

        headers.set('Content-Type', driveHeaders['content-type'] || 'application/octet-stream');
        headers.set('Content-Length', driveHeaders['content-length'] || '');
        headers.set('Content-Disposition', `attachment; filename="${fileName}"`);


        // Stream the file back to the client
        return new NextResponse(driveResponse.data as any, {
            status: 200,
            headers: headers
        });

    } catch (error) {
        console.error("Failed to download file:", error);
        return new NextResponse("Erro ao baixar o arquivo.", { status: 500 });
    }
}
