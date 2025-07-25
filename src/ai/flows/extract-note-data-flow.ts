// Alteração: importado de '@genkit-ai/core' em vez de '@genkit-ai/flow'
import { defineFlow, definePrompt } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { Part } from '@genkit-ai/ai';

const NoteDataSchema = z.object({
  prestadorRazaoSocial: z.string().optional().describe('Razão Social do Prestador do Serviço'),
  prestadorCnpj: z.string().optional().describe('CNPJ do Prestador do Serviço'),
  tomadorRazaoSocial: z.string().optional().describe('Razão Social do Tomador do Serviço'),
  tomadorCnpj: z.string().optional().describe('CNPJ do Tomador do Serviço'),
  numeroNota: z.string().optional().describe('Número da Nota Fiscal'),
  dataEmissao: z.string().optional().describe('Data de Emissão da Nota Fiscal'),
  amount: z.number().optional().describe('Valor Total da Nota Fiscal'),
});

export const extractNoteDataPrompt = definePrompt(
  {
    name: 'extractNoteDataPrompt',
    model: googleAI('gemini-1.5-flash'), // Mantém o nome do modelo corrigido
    output: {
      schema: NoteDataSchema,
      format: 'json',
    },
    input: {
      schema: z.object({
        document: z.instanceof(Part),
      }),
    },
    template: `
      Você é um especialista em análise de documentos fiscais brasileiros.
      Sua tarefa é extrair as seguintes informações do documento fornecido:
      - Razão Social do PRESTADOR do serviço.
      - CNPJ do PRESTADOR do serviço.
      - Razão Social do TOMADOR do serviço.
      - CNPJ do TOMADOR do serviço.
      - Número da Nota Fiscal.
      - Data de Emissão.
      - Valor Total da Nota.
      
      Analise o documento anexo e retorne os dados no formato JSON especificado.
      Se uma informação não for encontrada, deixe o campo correspondente vazio.
      A data de emissão deve estar no formato AAAA-MM-DD.
      O valor total deve ser um número, sem formatação de moeda.

      Documento: {{document}}
    `,
  }
);

export const extractNoteDataFlow = defineFlow(
  {
    name: 'extractNoteDataFlow',
    inputSchema: z.instanceof(Part),
    outputSchema: NoteDataSchema,
  },
  async (documentPart) => {
    const { output } = await extractNoteDataPrompt({
      document: documentPart,
    });

    if (!output) {
      throw new Error('A IA não retornou dados válidos.');
    }
    return output;
  }
);