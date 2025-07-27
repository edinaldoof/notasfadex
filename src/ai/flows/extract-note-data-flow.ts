/**
 * @fileOverview Flow de alta precisão para extrair dados estruturados de uma nota fiscal,
 * utilizando o modelo Gemini com Function Calling para garantir a robustez da saída.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';

// Garante que as variáveis de ambiente sejam carregadas
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Definição dos Schemas
const InvoiceTypeSchema = z.enum(['PRODUTO', 'SERVICO']);
export const ExtractNoteDataInputSchema = z.object({ documentUri: z.string() });
export type ExtractNoteDataInput = z.infer<typeof ExtractNoteDataInputSchema>;

export const ExtractNoteDataOutputSchema = z.object({
  prestadorRazaoSocial: z.string().optional().describe('A razão social ou nome do prestador de serviço/vendedor do produto.'),
  prestadorCnpj: z.string().optional().describe('O CNPJ ou CPF do prestador de serviço/vendedor.'),
  tomadorRazaoSocial: z.string().optional().describe('A razão social ou nome do tomador (cliente) do serviço/comprador.'),
  tomadorCnpj: z.string().optional().describe('O CNPJ ou CPF do tomador (cliente) do serviço/comprador.'),
  numeroNota: z.string().optional().describe('O número da nota fiscal.'),
  dataEmissao: z.string().optional().describe('A data em que a nota foi emitida, no formato DD/MM/AAAA.'),
  valorTotal: z.number().optional().describe('O valor total da nota ou dos serviços.'),
  descricaoServicos: z.string().optional().describe('A descrição detalhada dos serviços prestados ou dos produtos.'),
  type: InvoiceTypeSchema.optional().describe('O tipo da nota fiscal, inferido do conteúdo do documento. Deve ser PRODUTO ou SERVICO.'),
});
export type ExtractNoteDataOutput = z.infer<typeof ExtractNoteDataOutputSchema>;


// Ferramenta que a IA vai chamar com os dados extraídos
const dataExtractionTool = {
    functionDeclarations: [
        {
            name: "submitInvoiceData",
            description: "Envia os dados extraídos da nota fiscal para o sistema. Use esta função para retornar todos os campos encontrados no documento.",
            parameters: {
                type: "OBJECT",
                properties: {
                    prestadorRazaoSocial: { type: "STRING", description: "Razão Social do EMITENTE/PRESTADOR." },
                    prestadorCnpj: { type: "STRING", description: "CNPJ/CPF do EMITENTE/PRESTADOR (apenas números)." },
                    tomadorRazaoSocial: { type: "STRING", description: "Razão Social do DESTINATÁRIO/TOMADOR." },
                    tomadorCnpj: { type: "STRING", description: "CNPJ/CPF do DESTINATÁRIO/TOMADOR (apenas números)." },
                    numeroNota: { type: "STRING", description: "Número da nota fiscal." },
                    dataEmissao: { type: "STRING", description: "Data de emissão no formato DD/MM/AAAA." },
                    valorTotal: { type: "NUMBER", description: "Valor total da nota (use ponto como separador decimal)." },
                    descricaoServicos: { type: "STRING", description: "Descrição dos produtos ou serviços." },
                    type: { type: "STRING", "enum": ["PRODUTO", "SERVICO"], description: "Tipo da nota: PRODUTO ou SERVICO." },
                },
                 // Nenhum campo é obrigatório, a IA enviará apenas o que encontrar
                required: []
            },
        },
    ],
};

// Função auxiliar para converter Data URI
function dataUriToGooglePart(dataUri: string) {
    const match = dataUri.match(/^data:(.+);base64,(.+)$/);
    if (!match) { throw new Error("Formato de Data URI inválido."); }
    const [_, mimeType, base64] = match;
    return { inlineData: { mimeType, data: base64 } };
}

// Renomeado para performExtraction para ser chamado pela Server Action
export async function performExtraction(input: ExtractNoteDataInput): Promise<ExtractNoteDataOutput> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("A variável de ambiente GEMINI_API_KEY não está definida no servidor.");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const validatedInput = ExtractNoteDataInputSchema.parse(input);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        tools: dataExtractionTool,
        safetySettings: [ // Relaxa as configurações de segurança para evitar bloqueios em documentos legítimos
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });
    
    const documentPart = dataUriToGooglePart(validatedInput.documentUri);

    const prompt = `
      Sua missão é atuar como um Analista de Dados Contábeis para extrair informações de um documento fiscal brasileiro.
      Analise o documento fornecido e utilize a ferramenta 'submitInvoiceData' para enviar os dados que você encontrar.
      
      Siga este framework rigoroso para cada campo:
      1.  **Tipo de Nota**: Se houver "DANFE", é "PRODUTO". Se houver "NFS-e", é "SERVICO".
      2.  **CNPJ/CPF**: Extraia *apenas os números*, sem formatação.
      3.  **Valor Total**: Extraia como um número (float), usando ponto como separador decimal. Ex: 1500.50.
      4.  **Data de Emissão**: Formate como "DD/MM/AAAA".
      
      Se um campo não for encontrado, simplesmente não o inclua na chamada da função.
      Sua única tarefa é chamar a função 'submitInvoiceData' com os dados extraídos. Não responda com mais nada.
    `;

    const result = await model.generateContent([prompt, documentPart]);
    const call = result.response.functionCalls()?.[0];

    if (!call || call.name !== 'submitInvoiceData') {
      throw new Error("A IA não conseguiu identificar os dados ou retornou uma resposta inesperada.");
    }
    
    const extractedData = call.args;

    return ExtractNoteDataOutputSchema.parse(extractedData);

  } catch (error) {
    console.error("Falha ao extrair dados da nota fiscal:", error);
    if (error instanceof z.ZodError) {
        return Promise.reject(new Error('A IA retornou dados em um formato inválido. Por favor, tente novamente.'));
    }
    const message = error instanceof Error ? error.message : "Erro desconhecido durante a extração.";
    return Promise.reject(new Error(`Não foi possível analisar os dados do documento. Detalhe: ${message}`));
  }
}
