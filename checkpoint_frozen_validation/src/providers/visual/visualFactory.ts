import { IVisualProvider } from '../../types/index.js';
import { PollinationsVisualProvider } from './pollinationsVisual.js';
import { OpenAIVisualProvider } from './openAIVisual.js';
import { CanvasVisualProvider } from './canvasVisual.js';

export class VisualFactory {
  static create(providerType?: string): IVisualProvider {
    const type = (providerType || process.env.VISUAL_PROVIDER || 'pollinations').toLowerCase();
    const openAIKey = process.env.OPENAI_API_KEY;

    if (type === 'openai' && openAIKey) {
      return new OpenAIVisualProvider(openAIKey);
    }

    if (type === 'canvas' || type === 'svg') {
      return new CanvasVisualProvider();
    }

    // Default to Pollinations (Free AI image generation with Flux model)
    return new PollinationsVisualProvider();
  }
}
