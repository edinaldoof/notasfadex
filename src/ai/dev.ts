// src/ai/dev.ts

// Carrega as variáveis de ambiente do arquivo .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Sintaxe de importação correta para Genkit v1.x com "type": "module"
import { genkit } from 'genkit';
import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/googleai';
import * as z from 'zod';
import './index.js';
import './flows.js';
import './actions.js'

// Configuração correta, criando uma instância 'ai' com os plugins
genkit({
  plugins: [googleAI()],
});

// CORREÇÃO FINAL: A função para criar um fluxo é 'defineFlow', não 'flow'.
export const menuChat = defineFlow(
  {
    name: 'menuChat',
    inputSchema: z.object({
      history: z.array(z.any()),
      message: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Validação para impedir mensagens vazias
    if (!input.message || input.message.trim() === '') {
      return "Olá! Por favor, digite uma pergunta para que eu possa ajudá-lo.";
    }

    // A chamada para 'generate' continua a mesma
    const llmResponse = await generate({
      model: googleAI.model('gemini-pro'),
      prompt: input.message,
    });

    return llmResponse.text();
  }
);