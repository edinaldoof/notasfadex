// src/genkit.config.ts

// ✅ CORREÇÃO: Importamos todo o módulo '@genkit-ai/core' como um objeto 'genkit'.
import * as genkit from '@genkit-ai/core'; 
import { googleAI } from '@genkit-ai/googleai';

// ✅ CORREÇÃO: Chamamos a função a partir do objeto 'genkit' que importamos.
// Apenas configura os plugins. Não importe nenhum fluxo aqui.
export default genkit.configureGenkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});