
import { auth } from "@/auth";
import { getDriveService } from "@/lib/google-drive";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { fileId: string } }
) {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Acesso não autorizado", { status: 401 });
    }

    const { fileId } = params;

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
        
        // --- Permission Check ---
        const isOwner = note.userId === session.user.id;
        // User with MANAGER or OWNER role can see all files.
        const isManager = session.user.role === 'OWNER' || session.user.role === 'MANAGER';
        
        // Users can access if they own it or are a manager.
        const canAccess = isOwner || isManager;

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
