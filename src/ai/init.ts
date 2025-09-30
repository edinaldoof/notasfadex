// src/ai/init.ts

// Passo 1: Importa a configuração para executá-la primeiro.
import '../genkit.config.js';

// Passo 2: Agora, com o Genkit configurado, importa os seus fluxos.
// Isso os registrará no sistema do Genkit, que agora está pronto para recebê-los.
import './flows/chatbot-flow.js';
import './flows/extract-note-data-flow.js';