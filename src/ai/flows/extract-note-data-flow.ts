'use server';
/**
 * @fileOverview Flow de alta precisão para extrair dados estruturados de uma nota fiscal.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Garante que as variáveis de ambiente sejam carregadas
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!process.env.GEMINI_API_KEY) {
  throw new Error("A variável de ambiente GEMINI_API_KEY não está definida.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Definição dos Schemas (não muda)
const InvoiceTypeSchema = z.enum(['PRODUTO', 'SERVICO']);
const ExtractNoteDataInputSchema = z.object({ documentUri: z.string() });
export type ExtractNoteDataInput = z.infer<typeof ExtractNoteDataInputSchema>;
const ExtractNoteDataOutputSchema = z.object({
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

// Função auxiliar para converter Data URI
function dataUriToGooglePart(dataUri: string) {
    const match = dataUri.match(/^data:(.+);base64,(.+)$/);
    if (!match) { throw new Error("Formato de Data URI inválido."); }
    const [_, mimeType, base64] = match;
    return { inlineData: { mimeType, data: base64 } };
}

// Função principal que usa o prompt aprimorado
export async function extractNoteData(input: ExtractNoteDataInput): Promise<ExtractNoteDataOutput> {
  try {
    const validatedInput = ExtractNoteDataInputSchema.parse(input);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const documentPart = dataUriToGooglePart(validatedInput.documentUri);

    // ===================================================================
    // PROMPT APRIMORADO DE ALTA PRECISÃO
    // ===================================================================
    const prompt = `
      Sua função é ser um Analista de Dados Contábeis especializado em documentos fiscais do Brasil.
      Seu objetivo é analisar o documento fornecido e extrair as informações especificadas, retornando **APENAS e EXCLUSIVAMENTE um objeto JSON VÁLIDO**.

      **REGRAS CRÍTICAS:**
      1.  **NÃO INVENTE DADOS.** Se uma informação não estiver explicitamente no documento, o campo correspondente no JSON deve ser \`null\`.
      2.  **FORMATAÇÃO ESTRITA:**
          - \`valorTotal\`: Deve ser um número (float), usando ponto como separador decimal. Ex: \`1500.50\`.
          - \`dataEmissao\`: Deve estar no formato "DD/MM/AAAA".
          - \`prestadorCnpj\` e \`tomadorCnpj\`: Devem conter apenas os dígitos numéricos, sem pontos, barras ou hífens.
      3.  **CLASSIFICAÇÃO:**
          - \`type\`: Se o documento for um DANFE (Documento Auxiliar da Nota Fiscal Eletrônica), classifique como "PRODUTO". Se for uma NFS-e (Nota Fiscal de Serviços Eletrônica), classifique como "SERVICO".

      **EXEMPLO DE SAÍDA PERFEITA:**
      \`\`\`json
      {
        "prestadorRazaoSocial": "EMPRESA DE TECNOLOGIA LTDA",
        "prestadorCnpj": "12345678000190",
        "tomadorRazaoSocial": "CLIENTE FINAL SA",
        "tomadorCnpj": "98765432000100",
        "numeroNota": "12345",
        "dataEmissao": "25/07/2025",
        "valorTotal": 450.75,
        "descricaoServicos": "PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA EM TI",
        "type": "SERVICO"
      }
      \`\`\`

      **TAREFA:**
      Analise o documento a seguir e retorne o objeto JSON correspondente.
    `;

    // Gera o conteúdo
    const result = await model.generateContent([prompt, documentPart]);
    const response = await result.response;
    // Limpa qualquer formatação de markdown que a IA possa adicionar por hábito
    const jsonText = response.text().replace(/```json|```/g, "").trim();

    // Valida a resposta para garantir que está no formato esperado
    const parsedJson = JSON.parse(jsonText);
    return ExtractNoteDataOutputSchema.parse(parsedJson);

  } catch (error) {
    console.error("Falha ao extrair dados da nota fiscal:", error);
    throw new Error('Não foi possível analisar os dados do documento. Por favor, verifique o arquivo ou preencha os campos manualmente.');
  }
}