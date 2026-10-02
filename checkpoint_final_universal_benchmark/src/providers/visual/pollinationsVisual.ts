import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { IVisualProvider } from '../../types/index.js';
import { CanvasVisualProvider } from './canvasVisual.js';

export class PollinationsVisualProvider implements IVisualProvider {
  readonly name = 'PollinationsAI';
  private canvasFallback = new CanvasVisualProvider();

  async generateVisual(prompt: string, outputPath: string, sceneIndex: number): Promise<string> {
    console.log(`🎨 [PollinationsAI] Đang sinh ảnh AI cho scene ${sceneIndex + 1}: "${prompt.slice(0, 50)}..."`);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      // 9:16 aspect ratio: 720x1280 or 1080x1920
      const seed = Math.floor(Math.random() * 1000000);
      const enhancedPrompt = `${prompt}, 9:16 vertical ratio, cinematic, hyperrealistic, high resolution`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=720&height=1280&nologo=true&seed=${seed}`;

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      fs.writeFileSync(outputPath, Buffer.from(response.data));
      console.log(`✅ [PollinationsAI] Đã tải ảnh AI scene ${sceneIndex + 1}: ${path.basename(outputPath)}`);
      return outputPath;
    } catch (err: any) {
      console.warn(`⚠️ [PollinationsAI] Lỗi kết nối (${err.message}). Chuyển sang vẽ đồ họa Canvas/SVG chất lượng cao...`);
      return this.canvasFallback.generateVisual(prompt, outputPath, sceneIndex);
    }
  }
}
