'use server';

// 1. IMPORTA AS BIBLIOTECAS NECESSÁRIAS
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import prisma from '../lib/prisma';

// Garante que as variáveis de ambiente sejam carregadas
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// 2. VERIFICA A CHAVE DA API E INICIALIZA O CLIENTE
if (!process.env.GEMINI_API_KEY) {
  throw new Error("A variável de ambiente GEMINI_API_KEY não está definida.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// 3. DEFINIÇÃO DA "FERRAMENTA" DE ACESSO À BASE DE DADOS (MAIS DETALHADA)
const databaseTools = [
    {
        functionDeclarations: [
            {
                name: "getLiveNoteStats",
                description: "Ferramenta para buscar dados agregados e em tempo real sobre notas fiscais. Use esta ferramenta sempre que a pergunta do utilizador envolver contagens ('quantos', 'número de') ou somas de valores ('valor total', 'qual o montante') para um status específico ou para todas as notas.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        status: {
                            type: "STRING",
                            description: "OPCIONAL. O status para filtrar a consulta (PENDENTE, ATESTADA, EXPIRADA). Se não for fornecido, a consulta será sobre o total de todas as notas.",
                        },
                        operation: {
                            type: "STRING",
                            description: "A operação a ser feita: 'count' para contar a quantidade de notas, ou 'sum' para somar o campo 'totalValue'.",
                        }
                    },
                    required: ["operation"]
                },
            },
        ]
    }
];

// 4. DEFINIÇÃO DOS SCHEMAS (NÃO MUDA)
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


// 5. A FUNÇÃO EXPORTADA, AGORA COM LÓGICA DE RACIOCÍNIO
export async function askChatbot(input: ChatbotInput): Promise<ChatbotOutput> {
  try {
    const validatedInput = ChatbotInputSchema.parse(input);
    
    // Inicia o modelo Gemini 1.5 Pro com as ferramentas e configurações de segurança
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest", // Usando o modelo mais avançado
      tools: databaseTools,
      safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      // System Instruction: O "DNA" do nosso chatbot
      systemInstruction: `
        Você é o Assistente Estratégico do "Notas Fadex", um especialista em otimização de processos de negócio. Sua missão é ir além de responder perguntas; você deve antecipar as necessidades do utilizador, fornecer insights e guiá-lo para usar o sistema da forma mais eficiente possível.

        **Seu Processo de Raciocínio (Framework 'Pense-Aja-Responda'):**

        1.  **PENSE: Analise a Intenção Profunda.**
            * Qual é o *objetivo final* do utilizador? Ele não quer apenas saber "quantas notas estão pendentes", ele quer saber se precisa de tomar uma ação.
            * A pergunta requer dados factuais (do banco de dados) ou conhecimento processual (como usar o sistema)?

        2.  **AJA: Execute a Melhor Ação.**
            * **Se precisar de dados:** Use a ferramenta \`getLiveNoteStats\` para obter os números exatos. Não hesite em chamar a ferramenta mesmo que o utilizador não seja explícito. Se a pergunta for "como estamos de pendências?", sua ação é chamar a ferramenta para contar as notas pendentes.
            * **Se precisar de explicar um processo:** Responda com base no seu conhecimento profundo do fluxo de trabalho do Notas Fadex.

        3.  **RESPONDA: Construa uma Resposta de Alto Valor.**
            * **Não entregue apenas o dado.** Contextualize. Em vez de "Existem 15 notas pendentes", diga: "Atualmente, há 15 notas aguardando atesto. Você pode visualizá-las e agilizar o processo na secção 'Analistas'."
            * **Seja Proativo.** Após responder, sugira a próxima ação lógica. Ex: "O valor total atestado este mês é de R$ 12.500,00. Gostaria de gerar um relatório detalhado na secção 'Relatórios'?"
            * **Use um tom profissional, mas encorajador.**

        **Exemplo de Execução do Framework:**
        * **Pergunta:** "e o valor das notas que já venceram?"
        * **PENSAMENTO:** O utilizador quer saber o montante das notas 'EXPIRADAS'. Isto requer dados do banco.
        * **AÇÃO:** Chamar \`getLiveNoteStats({ operation: 'sum', status: 'EXPIRADA' })\`.
        * **RESPOSTA (após receber o resultado da ferramenta):** "O valor total das notas que passaram do prazo de atesto é de R$ 2.350,00. É importante verificar estas notas na secção 'Minhas Notas' ou 'Analistas' para evitar pendências no final do mês."
      `
    });

    // Inicia uma sessão de chat
    const chat = model.startChat({
        history: validatedInput.history?.map(h => ({
            role: h.role,
            parts: [{ text: h.content }],
        }))
    });
    
    // Envia a pergunta do utilizador para o modelo
    const result = await chat.sendMessage(validatedInput.query);
    const response = result.response;
    const functionCall = response.functionCalls()?.[0];

    if (functionCall && functionCall.name === 'getLiveNoteStats') {
      const args = functionCall.args as { status?: 'PENDENTE' | 'ATESTADA' | 'EXPIRADA', operation: 'count' | 'sum' };
      console.log(`IA roteou para a ferramenta '${functionCall.name}' com os argumentos:`, args);

      let toolResult: any;
      const whereClause = args.status ? { status: args.status } : {};

      if (args.operation === 'count') {
        const count = await prisma.note.count({ where: whereClause });
        toolResult = { ...args, result: count };
      } else if (args.operation === 'sum') {
        const aggregate = await prisma.note.aggregate({
          _sum: { totalValue: true },
          where: whereClause,
        });
        toolResult = { ...args, result: aggregate._sum.totalValue ?? 0 };
      }

      // Envia o resultado da ferramenta de volta para a IA formular a resposta final
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