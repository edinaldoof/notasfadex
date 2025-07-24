'use server';
/**
 * @fileOverview Flow to extract structured data from a fiscal note document.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// 1. Definição dos Schemas Zod
const InvoiceTypeSchema = z.enum(['PRODUTO', 'SERVICO']);

const ExtractNoteDataInputSchema = z.object({
  documentUri: z
    .string()
    .describe(
      "A fiscal note document (PDF, JPG, XML) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
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

// 2. Exportação da função principal
export async function extractNoteData(input: ExtractNoteDataInput): Promise<ExtractNoteDataOutput> {
  return extractNoteDataFlow(input);
}

// 3. Definição do Prompt (usando os Schemas)
const model = 'googleAI/gemini-1.5-flash-latest';

const extractNoteDataPrompt = ai.definePrompt({
  name: 'extractNoteDataPrompt',
  model: model,
  input: { schema: ExtractNoteDataInputSchema },
  output: { schema: ExtractNoteDataOutputSchema },
  prompt: `Você é um extrator de dados de documentos. Sua tarefa é analisar o documento e extrair as informações solicitadas no formato JSON.
Seja o mais preciso possível. **NÃO INVENTE INFORMAÇÕES**. Se um campo não for encontrado, deixe-o em branco.

Regras de Extração:
- \`numeroNota\`: Número da Nota Fiscal.
- \`dataEmissao\`: Data de emissão no formato DD/MM/AAAA.
- \`valorTotal\`: Valor total como um número (float), usando ponto como separador decimal.
- \`descricaoServicos\`: Resumo dos serviços/produtos.
- \`prestadorRazaoSocial\`: Razão Social/Nome do emissor.
- \`prestadorCnpj\`: CNPJ/CPF do emissor.
- \`tomadorRazaoSocial\`: Razão Social/Nome do cliente.
- \`tomadorCnpj\`: CNPJ/CPF do cliente.
- \`type\`: Classifique como "PRODUTO" (se for DANFE) ou "SERVICO" (se for NFSe).

Documento para análise:
{{media url=documentUri}}`,
});

// 4. Definição do Flow (usando o Prompt)
const extractNoteDataFlow = ai.defineFlow(
  {
    name: 'extractNoteDataFlow',
    inputSchema: ExtractNoteDataInputSchema,
    outputSchema: ExtractNoteDataOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await extractNoteDataPrompt(input);
      return output!;
    } catch (error) {
      console.error("Falha ao extrair dados da nota fiscal:", error);
      throw new Error('Não foi possível analisar os dados do documento. Por favor, verifique o arquivo ou preencha os campos manualmente.');
    }
  }
);
