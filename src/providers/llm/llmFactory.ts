import { ILLMProvider } from '../../types/index.js';
import { OpenAILLMProvider } from './openAILLM.js';
import { GeminiLLMProvider } from './geminiLLM.js';
import { RuleBasedLLMProvider } from './ruleBasedLLM.js';

export class LLMFactory {
  static create(providerType?: string): ILLMProvider {
    const type = (providerType || process.env.LLM_PROVIDER || 'auto').toLowerCase();
    const openAIKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (type === 'openai' && openAIKey) {
      return new OpenAILLMProvider(openAIKey, process.env.OPENAI_MODEL || 'gpt-4o-mini');
    }

    if (type === 'gemini' && geminiKey) {
      return new GeminiLLMProvider(geminiKey, process.env.GEMINI_MODEL || 'gemini-1.5-flash');
    }

    if (type === 'auto') {
      if (geminiKey) {
        return new GeminiLLMProvider(geminiKey, process.env.GEMINI_MODEL || 'gemini-1.5-flash');
      }
      if (openAIKey) {
        return new OpenAILLMProvider(openAIKey, process.env.OPENAI_MODEL || 'gpt-4o-mini');
      }
    }

    // Default or Fallback
    return new RuleBasedLLMProvider();
  }
}
