'use server';

// 1. IMPORTA AS BIBLIOTECAS NECESSÁRIAS
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// Garante que as variáveis de ambiente sejam carregadas
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Verifica a chave da API e inicializa o cliente
if (!process.env.GEMINI_API_KEY) {
  throw new Error("A variável de ambiente GEMINI_API_KEY não está definida.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// 2. DEFINIÇÃO DA "FERRAMENTA" (COM STATUS OPCIONAL)
const databaseTools = {
  functionDeclarations: [
    {
      name: "getLiveNoteStats",
      description: "Ferramenta para buscar dados agregados e em tempo real sobre notas fiscais. Use esta ferramenta sempre que a pergunta do utilizador envolver contagens ('quantos', 'número de') ou somas de valores ('valor total', 'qual o montante').",
      parameters: {
        type: "OBJECT",
        properties: {
          status: {
            type: "STRING",
            description: "OPCIONAL. O status para filtrar a consulta (PENDENTE, ATESTADA, EXPIRADA). Se não for fornecido, a consulta será sobre o total de todas as notas.",
          },
          operation: {
            type: "STRING",
            description: "A operação a ser feita: 'count' para contar a quantidade de notas, ou 'sum' para somar o campo 'amount'.",
          }
        },
        required: ["operation"] // <-- MUDANÇA AQUI: 'status' agora é opcional
      },
    },
  ],
};

// 3. DEFINIÇÃO DOS SCHEMAS (não muda)
const ChatbotInputSchema = z.object({
  query: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional(),
});
type ChatbotInput = z.infer<typeof ChatbotInputSchema>;

const ChatbotOutputSchema = z.object({
  response: z.string(),
});
type ChatbotOutput = z.infer<typeof ChatbotOutputSchema>;


// 4. A FUNÇÃO EXPORTADA, AGORA COM LÓGICA DE ROTEAMENTO APRIMORADA
export async function askChatbot(input: ChatbotInput): Promise<ChatbotOutput> {
  try {
    const validatedInput = ChatbotInputSchema.parse(input);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      tools: databaseTools,
    });

    const chat = model.startChat({
        history: validatedInput.history?.map(h => ({
            role: h.role,
            parts: [{ text: h.content }],
        }))
    });

    // PROMPT COM NOVO EXEMPLO DE ROTEAMENTO
    const prompt = `
      **Sua Missão:** Você é o cérebro do Assistente "Notas Fadex". Sua primeira tarefa é analisar a pergunta do utilizador e decidir a melhor forma de responder.

      **Passo 1: Decida se precisa de dados em tempo real.**
      - Se a pergunta for sobre quantidade ou valores, use a ferramenta \`getLiveNoteStats\`.
      - Se for sobre como usar o sistema, responda com texto.

      **Passo 2: Se usar a ferramenta, deduza os parâmetros.**
      - 'operação': 'count' para quantidade, 'sum' para valores.
      - 'status': Se o utilizador especificar (pendentes, atestadas), use o status. **Se ele perguntar de forma geral ("total", "no sistema"), NÃO forneça o parâmetro 'status'**.

      **Exemplos de Roteamento:**
      - Pergunta: "quantas notas estão pendentes?" -> Decisão: Chamar \`getLiveNoteStats({ operation: 'count', status: 'PENDENTE' })\`
      - Pergunta: "qual o valor total que já foi atestado?" -> Decisão: Chamar \`getLiveNoteStats({ operation: 'sum', status: 'ATESTADA' })\`
      - Pergunta: "quantas notas tem no sistema?" -> Decisão: Chamar \`getLiveNoteStats({ operation: 'count' })\`
      - Pergunta: "qual o valor total de todas as notas?" -> Decisão: Chamar \`getLiveNoteStats({ operation: 'sum' })\`

      **Execute a sua decisão para a pergunta do utilizador abaixo.**

      **Pergunta do Utilizador:** ${validatedInput.query}
    `;

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const functionCall = response.functionCalls()?.[0];

    if (functionCall && functionCall.name === 'getLiveNoteStats') {
      const args = functionCall.args as { status?: 'PENDENTE' | 'ATESTADA' | 'EXPIRADA', operation: 'count' | 'sum' };
      console.log(`IA roteou para a ferramenta '${functionCall.name}' com os argumentos:`, args);

      let toolResult: any;
      // Constrói o filtro do Prisma dinamicamente
      const whereClause = args.status ? { status: args.status } : {};

      if (args.operation === 'count') {
        const count = await prisma.fiscalNote.count({ where: whereClause });
        toolResult = { ...args, result: count };
      } else if (args.operation === 'sum') {
        const aggregate = await prisma.fiscalNote.aggregate({
          _sum: { amount: true },
          where: whereClause,
        });
        toolResult = { ...args, result: aggregate._sum.amount ?? 0 };
      }

      const result2 = await chat.sendMessage([{
        functionResponse: {
          name: 'getLiveNoteStats',
          response: toolResult,
        },
      }]);
      
      const finalResponse = result2.response.text();
      return { response: finalResponse };
    }

    const text = response.text();
    return { response: text };

  } catch (error) {
    console.error("Erro detalhado na Server Action 'askChatbot':", error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido no servidor.";
    return { response: `Erro ao comunicar com a IA: ${errorMessage}` };
  }
}