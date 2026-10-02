import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { IVisualProvider } from '../../types/index.js';
import { CanvasVisualProvider } from './canvasVisual.js';

export class OpenAIVisualProvider implements IVisualProvider {
  readonly name = 'OpenAIVisual';
  private apiKey: string;
  private canvasFallback = new CanvasVisualProvider();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVisual(prompt: string, outputPath: string, sceneIndex: number): Promise<string> {
    console.log(`🎨 [DALL-E 3] Đang sinh ảnh cho scene ${sceneIndex + 1}...`);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: `${prompt}, vertical 9:16 portrait composition, cinematic photography, 8k`,
          n: 1,
          size: '1024x1792',
          response_format: 'b64_json',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const b64 = response.data.data[0].b64_json;
      fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
      return outputPath;
    } catch (err: any) {
      console.warn(`⚠️ [OpenAI DALL-E] Lỗi (${err.message}). Chuyển sang fallback...`);
      return this.canvasFallback.generateVisual(prompt, outputPath, sceneIndex);
    }
  }
}
