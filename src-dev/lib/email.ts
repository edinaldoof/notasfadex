
'use server';

import { getGmailService } from './google-gmail';
import type { SendEmailOptions } from '@/lib/types';

export async function sendEmail({ to, cc, subject, body, attachment }: SendEmailOptions) {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GMAIL_IMPERSONATED_USER_EMAIL) {
        const errorMessage = 'Envio de e-mail desabilitado. Credenciais da conta de serviço do Google ou e-mail de personificação ausentes no .env';
        console.warn(errorMessage);
        throw new Error(errorMessage);
    }
    
    const gmail = getGmailService();

    try {
        const from = `Notas Fadex <${process.env.GMAIL_IMPERSONATED_USER_EMAIL}>`;
        const boundary = `----=${Date.now().toString(16)}`;

        let emailLines: string[] = [
            `From: ${from}`,
            `To: ${to}`,
        ];
        
        if (cc) {
            emailLines.push(`Cc: ${cc}`);
        }

        emailLines.push(
            `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
            'MIME-Version: 1.0'
        );

        if (attachment) {
            emailLines.push(
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: 7bit',
                '',
                body,
                '',
                `--${boundary}`,
                `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
                'Content-Transfer-Encoding: base64',
                `Content-Disposition: attachment; filename="${attachment.filename}"`,
                '',
                attachment.content,
                `--${boundary}--`
            );
        } else {
             emailLines.push(
                'Content-type: text/html;charset=utf-8',
                '',
                body
            );
        }

        const email = emailLines.join('\r\n');
        
        const encodedMessage = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me', // 'me' refers to the impersonated user
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Falha ao enviar o e-mail através da API do Gmail.');
    }
}
