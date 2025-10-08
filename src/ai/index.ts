// src/ai/index.ts
'use server';

/**
 * @fileOverview O ficheiro central para toda a lógica de IA do Notas Fadex.
 * Este ficheiro deve ser o único local que exporta funções de IA para a aplicação.
 */

// Importa a instância 'ai' JÁ CONFIGURADA do nosso novo ficheiro de configuração.
import { ai } from './genkit.js';
import { z } from 'zod';

// =========================================================
// LÓGICA DO CHATBOT
// =========================================================

// Definição dos Schemas de entrada e saída
const ChatbotInputSchema = z.object({
  query: z.string().describe('The user question about the system.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The conversation history.'),
});
export type ChatbotInput = z.infer<typeof ChatbotInputSchema>;

const ChatbotOutputSchema = z.object({
  response: z.string().describe('The helpful response from the chatbot.'),
});
export type ChatbotOutput = z.infer<typeof ChatbotOutputSchema>;


// Definição do Template de Prompt Detalhado
const chatbotPrompt = ai.definePrompt({
  name: 'chatbotPrompt',
  model: 'gemini-1.5-flash', // <-- CORREÇÃO: O modelo é definido aqui.
  input: { schema: ChatbotInputSchema },
  output: { schema: ChatbotOutputSchema },
  prompt: `Você é um assistente virtual amigável e prestativo para o sistema "Notas Fadex".
Sua principal função é guiar os usuários e responder a perguntas sobre como utilizar a plataforma.
Seja conciso, claro e direto em suas respostas.

Aqui está um resumo das funcionalidades do sistema para sua referência:
- **Dashboard (Início):** Mostra um resumo rápido das notas: total, ativas, pendentes e valor total. É a página inicial após o login.
- **Minhas Notas:** Esta é a área principal do usuário. Aqui, ele pode ver todas as notas que adicionou, filtrar por status ou data, e adicionar novas notas. As ações disponíveis são: visualizar detalhes, baixar o arquivo original, editar ou excluir uma nota. Se uma nota estiver pendente, o usuário pode atestá-la.
- **Analistas:** Uma visão global onde todos podem ver as notas que estão com status "PENDENTE" ou "ATESTADA". Isso serve para que a equipe possa atestar notas, mesmo que não tenham sido eles que as criaram. As ações são semelhantes, focadas em atestar e visualizar.
- **Linha do Tempo:** Um feed de atividades que mostra o histórico de todas as notas do sistema (criação, atesto, edições). Útil para auditoria e acompanhamento.
- **Relatórios:** Permite gerar relatórios com base em um período, mostrando o total de notas atestadas e o valor total por mês em um gráfico.
- **Configurações:** Onde o usuário pode definir regras, como o prazo em dias para que uma nota pendente seja considerada "Expirada".
- **Adicionar Nota:** Ao clicar em "Nova Nota", o usuário anexa um arquivo (PDF, XML, JPG). A IA (você!) extrai os dados do documento para preencher o formulário automaticamente. O usuário então preenche a "Data de Envio para Atesto" e salva a nota.
- **Atestar Nota:** Quando uma nota está "PENDENTE", um usuário pode atestá-la. Isso muda seu status para "ATESTADA" e registra quem a atestou e quando. É possível anexar um PDF assinado no momento do atesto.

Com base nesse contexto, responda a pergunta do usuário.

{{#if history}}
Histórico da Conversa:
{{#each history}}
{{#if this.isUser}}
Usuário: {{{this.content}}}
{{else}}
Assistente: {{{this.content}}}
{{/if}}
{{/each}}
{{/if}}

Pergunta do Usuário: {{{query}}}
`,
});


// Definição do Flow (Fluxo) que usa o prompt acima
const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (input) => {
    // Adiciona a flag booleana 'isUser' para o template conseguir renderizar corretamente
    const historyWithFlags = input.history?.map(h => ({
      ...h,
      isUser: h.role === 'user'
    }));
    
    // Chama o prompt que definimos, passando os dados de entrada
    const { output } = await chatbotPrompt({ ...input, history: historyWithFlags });

    if (output) {
      return output;
    }
    
    // Retorna uma resposta padrão em caso de falha
    return { response: "Desculpe, não consegui processar sua pergunta. Tente novamente." };
  }
);


// Exportação da função principal para ser usada pela aplicação
export async function askChatbot(input: ChatbotInput): Promise<ChatbotOutput> {
  return chatbotFlow(input);
}