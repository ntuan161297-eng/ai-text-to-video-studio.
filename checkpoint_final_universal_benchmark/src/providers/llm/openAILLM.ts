import axios from 'axios';
import { ILLMProvider, VideoScript, Scene } from '../../types/index.js';

export class OpenAILLMProvider implements ILLMProvider {
  readonly name = 'OpenAILLM';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateScript(
    prompt: string,
    targetDuration: number,
    contextText?: string
  ): Promise<VideoScript> {
    console.log(`🤖 [OpenAI] Đang sinh kịch bản video TikTok (${targetDuration}s)...`);

    const systemPrompt = `Bạn là đạo diễn kịch bản video ngắn TikTok/Shorts/Reels chuyên nghiệp bằng tiếng Việt.
Nhiệm vụ: Chuyển đổi nội dung được cung cấp thành kịch bản video dọc 9:16 có tổng thời lượng xấp xỉ ${targetDuration} giây.
Quy tắc:
- Tốc độ đọc tiếng Việt: khoảng 3 - 3.5 từ/giây. Với video ${targetDuration}s, tổng số từ của toàn bộ voice-over nên khoảng ${Math.round(targetDuration * 3.2)} từ.
- Chia thành các scene (khoảng ${Math.max(3, Math.round(targetDuration / 8))} - ${Math.max(4, Math.round(targetDuration / 6))} scenes).
- Mỗi scene gồm:
  + durationInSeconds: thời lượng scene (tổng các scene phải bằng ${targetDuration})
  + voiceOver: lời bình tiếng Việt cuốn hút, ngắn gọn, tự nhiên, nhịp điệu nhanh
  + caption: tiêu đề phụ đề nổi bật (ngắn gọn, 3-6 từ, viết HOA)
  + visualPrompt: câu mô tả hình ảnh bằng tiếng Anh để đưa vào AI sinh ảnh (DALL-E / Midjourney / Flux), yêu cầu cinematic, 9:16 vertical ratio, aesthetic photography.
- Trả về DUY NHẤT một chuỗi JSON hợp lệ không kèm markdown backticks theo format:
{
  "title": "Tiêu đề video",
  "topic": "Chủ đề",
  "targetDuration": ${targetDuration},
  "backgroundMusicStyle": "lofi / electronic / dramatic beat",
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

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    const jsonText = response.data.choices[0].message.content;
    const parsed = JSON.parse(jsonText);

    // Compute frames
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
