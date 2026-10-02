import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { parseFile } from 'music-metadata';
import { ITTSProvider } from '../../types/index.js';

export class OpenAITTSProvider implements ITTSProvider {
  readonly name = 'OpenAITTS';
  private apiKey: string;
  private voice: string;
  private model: string;

  constructor(
    apiKey: string,
    voice: string = 'alloy',
    model: string = 'tts-1'
  ) {
    this.apiKey = apiKey;
    this.voice = voice;
    this.model = model;
  }

  async generateAudio(
    text: string,
    outputPath: string
  ): Promise<{ audioPath: string; durationInSeconds: number }> {
    console.log(`🎙️ [OpenAI TTS] Đang tạo giọng đọc (${this.voice}): "${text.slice(0, 40)}..."`);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: this.model,
        input: text,
        voice: this.voice,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 45000,
      }
    );

    fs.writeFileSync(outputPath, Buffer.from(response.data));

    let durationInSeconds = 0;
    try {
      const metadata = await parseFile(outputPath);
      durationInSeconds = metadata.format.duration || 0;
    } catch {
      const wordCount = text.trim().split(/\s+/).length;
      durationInSeconds = Math.max(2, Math.round(wordCount / 3.2));
    }

    return { audioPath: outputPath, durationInSeconds };
  }
}
