import axios from 'axios';
import { ILLMProvider, VideoScript, Scene } from '../../types/index.js';

export class GeminiLLMProvider implements ILLMProvider {
  readonly name = 'GeminiLLM';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = (apiKey || '').trim();
    this.model = (model && !model.includes('3.5')) ? model.trim() : 'gemini-1.5-flash';
  }

  async generateScript(
    prompt: string,
    targetDuration: number,
    contextText?: string
  ): Promise<VideoScript> {
    console.log(`🤖 [Gemini] Đang sinh kịch bản video TikTok (${targetDuration}s)...`);

    const systemPrompt = `Bạn là đạo diễn kịch bản video ngắn TikTok/Shorts/Reels chuyên nghiệp bằng tiếng Việt.
Nhiệm vụ: Chuyển đổi nội dung được cung cấp thành kịch bản video dọc 9:16 có tổng thời lượng xấp xỉ ${targetDuration} giây.
Quy tắc:
- Tốc độ đọc tiếng Việt: khoảng 3 - 3.5 từ/giây. Với video ${targetDuration}s, tổng số từ toàn bộ voice-over khoảng ${Math.round(targetDuration * 3.2)} từ.
- Chia thành ${Math.max(3, Math.round(targetDuration / 8))} - ${Math.max(4, Math.round(targetDuration / 6))} scenes.
- Mỗi scene gồm:
  + durationInSeconds: thời lượng scene (tổng phải xấp xỉ ${targetDuration})
  + voiceOver: lời bình tiếng Việt cuốn hút, ngắn gọn, tự nhiên, nhịp điệu nhanh
  + caption: tiêu đề phụ đề nổi bật (ngắn gọn, 3-6 từ, viết HOA)
  + visualPrompt: câu mô tả hình ảnh bằng tiếng Anh để đưa vào AI sinh ảnh (DALL-E / Flux / SDXL), cinematic, 9:16 vertical ratio, aesthetic photography.
- Trả về DUY NHẤT một chuỗi JSON hợp lệ không bọc trong markdown:
{
  "title": "Tiêu đề video",
  "topic": "Chủ đề",
  "targetDuration": ${targetDuration},
  "backgroundMusicStyle": "modern background beat",
  "scenes": [
    {
      "id": 1,
      "durationInSeconds": 8,
      "voiceOver": "...",
      "caption": "...",
      "visualPrompt": "..."
    }
  ]
}`;

    const userMessage = contextText
      ? `Nội dung nguồn:\n${contextText}\n\nYêu cầu bổ sung: ${prompt}`
      : prompt;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nNội dung người dùng:\n${userMessage}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000,
      }
    );

    const candidates = response.data.candidates;
    if (!candidates || !candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Gemini API không trả về nội dung hợp lệ.');
    }

    const jsonText = candidates[0].content.parts[0].text;
    const parsed = JSON.parse(jsonText);

    const scenes: Scene[] = parsed.scenes.map((s: any, idx: number) => ({
      id: idx + 1,
      durationInSeconds: s.durationInSeconds || 8,
      durationInFrames: (s.durationInSeconds || 8) * 30,
      voiceOver: s.voiceOver,
      caption: s.caption,
      visualPrompt: s.visualPrompt,
    }));

    return {
      title: parsed.title || 'Video ngắn',
      topic: parsed.topic || prompt,
      targetDuration,
      scenes,
      backgroundMusicStyle: parsed.backgroundMusicStyle,
    };
  }
}
