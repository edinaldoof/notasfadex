'use server';

import { run } from '@genkit-ai/core';
import { Part } from '@genkit-ai/ai';
import { z } from 'zod';
import { menuChat, MessageSchema } from './flows/chatbot-flow';
import { extractNoteDataFlow } from './flows/extract-note-data-flow';

type ChatHistory = z.infer<typeof MessageSchema>[];

export async function askChatbotAction(
  history: ChatHistory,
  prompt: string
): Promise<string> {
  try {
    const response = await run(menuChat, { history, prompt });
    return response;
  } catch (error) {
    console.error('Erro na Server Action do Chatbot:', error);
    return 'Desculpe, ocorreu um erro ao processar sua mensagem.';
  }
}

// O tipo de entrada (input) foi ajustado para receber contentType
export async function extractNoteDataAction(input: { dataUrl: string, contentType?: string }): Promise<{ success: boolean; data?: any; error?: string; }> {
  try {
    const response = await run(extractNoteDataFlow, {
      dataUrl: input.dataUrl,
      contentType: input.contentType,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Erro na Server Action de Extração:', error);
    return { success: false, error: 'Não foi possível analisar o documento.' };
  }
}