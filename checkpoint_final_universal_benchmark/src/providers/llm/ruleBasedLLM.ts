import { ILLMProvider, VideoScript, Scene } from '../../types/index.js';

export class RuleBasedLLMProvider implements ILLMProvider {
  readonly name = 'RuleBasedLLM';

  async generateScript(
    prompt: string,
    targetDuration: number,
    contextText?: string
  ): Promise<VideoScript> {
    console.log(`🤖 [LLM] Đang phân tích nội dung và tạo kịch bản video (${targetDuration}s)...`);

    // Target scene count: each scene ~ 7 - 10 seconds
    const sceneCount = Math.max(3, Math.min(8, Math.round(targetDuration / 8)));
    const avgSceneDuration = Math.round(targetDuration / sceneCount);

    const fullContent = (contextText && contextText.trim().length > 50)
      ? `${contextText}\n\nYêu cầu: ${prompt}`
      : prompt;

    // Extract sentences or clean lines
    const rawSentences = fullContent
      .replace(/https?:\/\/\S+/gi, '')
      .split(/(?<=[.?!:\n])\s+/)
      .map(s => s.trim().replace(/^[-*•0-9.)\s]+/, ''))
      .filter(s => s.length > 15);

    const scenes: Scene[] = [];
    const baseVisualStyles = [
      'cinematic lighting, ultra realistic, 8k resolution, vertical 9:16, aesthetic modern photography',
      'vibrant colors, clean composition, hyper-detailed, trending on artstation, 9:16 vertical',
      'dramatic angle, cinematic atmosphere, photorealistic, 4k vertical wallpaper',
      'minimalist sleek aesthetic, modern tech vibe, soft studio lighting, 9:16 portrait',
      'epic cinematic shot, depth of field, high contrast, vibrant cinematic color grading',
    ];

    // Determine topic/title
    let title = prompt
      .replace(/^(tạo video|làm video|hãy tạo|video tiktok|video ngắn|\d+\s*giây|từ bài viết này|từ url).*?:/i, '')
      .replace(/https?:\/\/\S+/gi, '')
      .trim();

    if (!title || title.length < 5) {
      title = rawSentences[0] ? rawSentences[0].slice(0, 45) : 'Khám phá bí mật hôm nay';
    }

    // Default template scenes if content is short
    const defaultThemes = [
      {
        stage: 'Hook (Thu hút)',
        voice: `Bạn có biết điều này không? ${title}! Hãy xem hết video để không bỏ lỡ.`,
        caption: 'BÍ MẬT BẠN CHƯA BIẾT',
        visual: `A striking dramatic visual representing: ${title}, modern cinematic, 9:16 portrait`,
      },
      {
        stage: 'Bối cảnh',
        voice: `Đa số mọi người đều hiểu nhầm về vấn đề này. Sự thật thực sự khiến nhiều người bất ngờ.`,
        caption: 'SỰ THẬT BẤT NGỜ',
        visual: `Curious person discovering revelation about ${title}, high tech background, cinematic`,
      },
      {
        stage: 'Chi tiết cốt lõi',
        voice: `Điểm mấu chốt nằm ở chỗ mọi thứ thay đổi rất nhanh khi bạn nắm được nguyên lý cơ bản này.`,
        caption: 'ĐIỂM MẤU CHỐT',
        visual: `Infographic concept dynamic visual illustrating ${title}, futuristic style, glowing details`,
      },
      {
        stage: 'Giải pháp / Bài học',
        voice: `Khi áp dụng đúng cách, hiệu quả mang lại sẽ vượt xa những gì bạn có thể tưởng tượng.`,
        caption: 'ÁP DỤNG NGAY',
        visual: `Success, achievement and breakthrough representation of ${title}, bright golden hour light`,
      },
      {
        stage: 'Kêu gọi hành động (CTA)',
        voice: `Hãy lưu ngay video này lại và bình luận ý kiến của bạn bên dưới nhé!`,
        caption: 'LƯU & CHIA SẺ NGAY',
        visual: `Call to action, modern sleek smartphone interface, like and subscribe icons glowing, 3d render`,
      },
    ];

    let allocatedDuration = 0;
    let sentenceIdx = 0;
    const targetWordsPerScene = Math.max(22, Math.round((targetDuration * 2.65) / sceneCount));

    for (let i = 0; i < sceneCount; i++) {
      let isLast = i === sceneCount - 1;
      let duration = (i === sceneCount - 1)
        ? Math.max(5, targetDuration - allocatedDuration)
        : avgSceneDuration;
      allocatedDuration += duration;

      let voiceOver = '';
      let caption = '';
      let visualPrompt = '';

      if (sentenceIdx < rawSentences.length) {
        const sceneParts: string[] = [];
        let curWords = 0;
        while (sentenceIdx < rawSentences.length && curWords < targetWordsPerScene) {
          const sent = rawSentences[sentenceIdx];
          sceneParts.push(sent);
          curWords += sent.split(/\s+/).length;
          sentenceIdx++;
        }
        voiceOver = sceneParts.join(' ');
        const firstSent = sceneParts[0] || '';
        const words = firstSent.split(/\s+/).filter(Boolean);
        caption = words.slice(0, Math.min(words.length, 5)).join(' ').replace(/[,;:.!?\-–—]+$/, '').toUpperCase();
        visualPrompt = `Cinematic visual scene for ${title}, theme: ${caption}, ${baseVisualStyles[i % baseVisualStyles.length]}`;
      } else {
        const themeIndex = Math.min(i, defaultThemes.length - 1);
        voiceOver = defaultThemes[themeIndex].voice;
        caption = defaultThemes[themeIndex].caption;
        visualPrompt = `${defaultThemes[themeIndex].visual}, ${baseVisualStyles[i % baseVisualStyles.length]}`;
      }

      scenes.push({
        id: i + 1,
        durationInSeconds: duration,
        durationInFrames: duration * 30,
        voiceOver,
        caption,
        visualPrompt,
      });
    }

    return {
      title,
      topic: title,
      targetDuration,
      scenes,
      backgroundMusicStyle: 'modern upbeat background beat',
    };
  }
}
