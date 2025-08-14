
import * as jwt from 'jsonwebtoken';

interface AttestationTokenPayload {
    noteId: string;
}

const getAuthSecret = (): string => {
     const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('A variável de ambiente AUTH_SECRET não está definida.');
    }
    return secret;
}

export const generateAttestationToken = (noteId: string): string => {
    const secret = getAuthSecret();
    // Token com validade de 30 dias
    const token = jwt.sign({ noteId }, secret, { expiresIn: '30d' });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:7000';
    return `${baseUrl}/attest/${token}`;
};

export const verifyAttestationToken = (token: string): AttestationTokenPayload | null => {
    const secret = getAuthSecret();
    try {
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload & AttestationTokenPayload;
        return { noteId: decoded.noteId };
    } catch (error) {
         if (error instanceof Error) {
            console.error(`Token verification failed: ${error.name} - ${error.message}`);
         } else {
            console.error("An unknown error occurred during token verification.");
         }
        throw error; // Re-throw to be handled by the caller
    }
}
