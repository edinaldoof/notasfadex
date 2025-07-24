
import { google } from 'googleapis';

const getCredentials = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !privateKey) {
        throw new Error("Credenciais da conta de serviço do Google ausentes no arquivo .env");
    }

    return {
        client_email: email,
        private_key: privateKey.replace(/\\n/g, '\n'),
    };
};

export const getGmailService = () => {
  const credentials = getCredentials();
  const impersonatedUser = process.env.GMAIL_IMPERSONATED_USER_EMAIL;

  if (!impersonatedUser) {
      throw new Error("E-mail para personificação do Gmail (GMAIL_IMPERSONATED_USER_EMAIL) não definido no .env");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
  });

  // Create a new JWT client with the subject (impersonated user)
  const authClient = auth.fromJSON(credentials);
  // @ts-ignore TODO: Fix this type issue
  authClient.subject = impersonatedUser;

  return google.gmail({ version: 'v1', auth: authClient });
};
