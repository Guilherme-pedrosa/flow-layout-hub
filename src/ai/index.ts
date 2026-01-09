/**
 * WAI ERP - AI Module
 * 
 * Exporta todos os recursos de IA centralizados.
 */

export { 
  WAI_SYSTEM_PROMPT, 
  WAI_SYSTEM_PROMPT_VERSION,
  WAI_OBSERVER_PROMPT,
  getPromptForMode,
  getModeInstructions,
  type AIMode 
} from './systemPrompt';

export { 
  buildAIContext, 
  serializeContext,
  type AIContextOptions,
  type AIContext 
} from './contextBuilder';
