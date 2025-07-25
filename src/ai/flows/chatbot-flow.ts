// Alteração: importado de '@genkit-ai/core' em vez de '@genkit-ai/flow'
import { defineFlow } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/googleai';
import * as z from 'zod';

export const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.any()),
});

export const menuChat = defineFlow(
  {
    name: 'menuChat',
    inputSchema: z.object({
      history: z.array(MessageSchema),
      prompt: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const model = googleAI('gemini-1.5-flash'); // Mantém o nome do modelo corrigido

    const systemInstruction = `
      Você é o "Notas", um assistente virtual da plataforma Notas Fadex.
      Sua função é ajudar os funcionários a entenderem e usarem o sistema.
      Seja amigável, direto e profissional.
      Responda perguntas sobre:
      - Como adicionar uma nova nota fiscal.
      - O que significam os status (Pendente, Atestada, Expirada).
      - Como encontrar notas de outros colaboradores.
      - Como gerar relatórios.
      - Prazos e processos de atesto.
      Se você não souber a resposta, diga que não tem essa informação e recomende
      contatar o administrador do sistema.
    `;

    const response = await generate({
      model: model,
      prompt: input.prompt,
      history: [
        { role: 'user', content: [{ text: systemInstruction }] },
        { role: 'model', content: [{ text: "Olá! Eu sou o Notas, seu assistente virtual. Como posso ajudar?" }] },
        ...input.history,
      ],
      config: {
        temperature: 0.7,
      },
    });

    return response.text();
  }
);