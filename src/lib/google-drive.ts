
import { google } from 'googleapis';
import { Readable } from 'stream';

const getCredentials = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !privateKey) {
        throw new Error("Credenciais da conta de serviço do Google ausentes no arquivo .env");
    }

    return {
        client_email: email,
        private_key: privateKey.replace(/\\n/g, '\n'), // Importante para a sintaxe do Vercel/env
    };
};

export const getDriveService = () => {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
};

/**
 * Finds a folder by name within a specific parent folder. If not found, creates it.
 * This function is compatible with Shared Drives.
 * @param drive - The authenticated Google Drive service instance.
 * @param folderName - The name of the folder to find or create.
 * @param parentFolderId - The ID of the parent folder where to search/create.
 * @returns The ID of the found or created folder.
 */
const findOrCreateFolder = async (drive: any, folderName: string, parentFolderId: string) => {
    const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;

    const searchResponse = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        supportsAllDrives: true, // Crucial for Shared Drives
        includeItemsFromAllDrives: true, // Crucial for Shared Drives
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        return searchResponse.data.files[0].id;
    } else {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
        };
        const createResponse = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true, // Crucial for Shared Drives
        });
        if (!createResponse.data.id) {
            throw new Error(`Failed to create folder '${folderName}' and get its ID.`);
        }
        return createResponse.data.id;
    }
};

export const uploadFileToDrive = async (fileName: string, mimeType: string, fileStream: Readable, projectAccountNumber: string) => {
  const drive = getDriveService();
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!rootFolderId) {
      throw new Error("O ID da pasta raiz do Google Drive (GOOGLE_DRIVE_FOLDER_ID) não está definido no arquivo .env");
  }

  try {
    // The rootFolderId from .env is now our starting point, assumed to be in a Shared Drive.
    // 1. Find or create the subfolder for the project account inside the main shared folder
    const projectFolderId = await findOrCreateFolder(drive, projectAccountNumber, rootFolderId);

    const fileMetadata = {
        name: fileName,
        parents: [projectFolderId],
    };

    const media = {
        mimeType: mimeType,
        body: fileStream,
    };

    // CORREÇÃO: A chamada para drive.files.create foi reestruturada.
    // requestBody, media e fields são passados como argumentos separados.
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
    });
    
    if (!response.data.id) {
        throw new Error('O ID do arquivo não foi retornado pela API do Google Drive');
    }

    // Use a custom download link to control access via our own API
    response.data.webViewLink = `/api/download/${response.data.id}`;

    return response.data;
  } catch (error) {
    console.error('Erro ao fazer upload para o Google Drive:', error);
    throw new Error('Falha ao fazer upload do arquivo para o Google Drive.');
  }
};
    