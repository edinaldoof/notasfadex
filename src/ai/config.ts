// src/ai/config.ts
// Este ficheiro NÃO tem 'use server'. A sua única função é configurar e exportar a IA.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Garante que as variáveis de ambiente sejam carregadas (importante para ambos os ambientes)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  enableTracingAndMetrics: true,
});