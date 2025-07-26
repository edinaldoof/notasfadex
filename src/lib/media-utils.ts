
'use client';

/**
 * Converts a File object to a Data URL string.
 * This is useful for sending file content to server actions or embedding in the client.
 */
export function toDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
