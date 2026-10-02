import { ITTSProvider } from '../../types/index.js';
import { EdgeTTSProvider } from './edgeTTS.js';
import { OpenAITTSProvider } from './openAITTS.js';

export class TTSFactory {
  static create(providerType?: string, customVoice?: string, customRate?: string): ITTSProvider {
    const type = (providerType || process.env.TTS_PROVIDER || 'edge').toLowerCase();
    const openAIKey = process.env.OPENAI_API_KEY;

    if (type === 'openai' && openAIKey) {
      return new OpenAITTSProvider(
        openAIKey,
        customVoice || process.env.OPENAI_TTS_VOICE || 'alloy',
        process.env.OPENAI_TTS_MODEL || 'tts-1'
      );
    }

    // Default to EdgeTTS because it provides free, high-fidelity Vietnamese neural voices
    return new EdgeTTSProvider(
      customVoice || process.env.TTS_VOICE || 'vi-VN-HoaiMyNeural',
      customRate || process.env.TTS_RATE || '+5%',
      process.env.TTS_PITCH || '+0Hz'
    );
  }
}
