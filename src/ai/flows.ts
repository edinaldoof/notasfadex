// src/ai/flows.ts
'use server';

// Importa as bibliotecas necessárias
import { genkit, z, defineFlow, generate } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Garante que as variáveis de ambiente sejam carregadas
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// 1. CONFIGURA A IA E EXPORTA-A. ISTO GARANTE QUE QUALQUER CÓDIGO QUE IMPORTE ESTE FICHEIRO
//    TENHA ACESSO À INSTÂNCIA 'ai' JÁ COM O PLUGIN DA GOOGLE REGISTADO.
genkit({
  plugins: [
    googleAI(),
  ],
});

// 2. DEFINIÇÃO DOS SCHEMAS
const ChatbotInputSchema = z.object({
  query: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional(),
});
export type ChatbotInput = z.infer<typeof ChatbotInputSchema>;

const ChatbotOutputSchema = z.object({
  response: z.string(),
});
export type ChatbotOutput = z.infer<typeof ChatbotOutputSchema>;


// 3. DEFINIÇÃO DO FLOW
const chatbotFlow = defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (flowInput) => {
    const llmResponse = await generate({
        model: 'gemini-1.5-flash',
        prompt: `Baseado no histórico, responda à pergunta do usuário. Histórico: ${JSON.stringify(flowInput.history)}. Pergunta: ${flowInput.query}`,
        output: {
            schema: ChatbotOutputSchema,
        },
    });

    const output = llmResponse.output;
    if (output) {
      return output;
    }

    return { response: "Desculpe, não consegui processar a sua pergunta." };
  }
);

// 4. FUNÇÃO DE EXPORTAÇÃO
export async function askChatbot(input: ChatbotInput): Promise<ChatbotOutput> {
  return chatbotFlow(input);
}