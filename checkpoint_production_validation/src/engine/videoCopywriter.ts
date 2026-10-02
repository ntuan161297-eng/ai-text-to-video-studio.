/**
 * VideoCopywriter (Section D, E, P)
 * Dedicated creative copywriter layer converting voice narration and facts
 * into concise, high-impact on-screen display copy (minimal text budget).
 * Enforces:
 *   - HEADLINE: 2-6 words, max 2 lines. Never dumps full voice text.
 *   - BADGE: 1-3 words category label.
 *   - SUPPORTING: 0-8 words brief context (or empty).
 *   - METRIC: Isolated prominent number/statistic.
 *   - Zero duplicate text between layers.
 */

import { FinalContentSanitizer } from './finalContentSanitizer.js';

export interface SceneDisplayCopy {
  badge: string;
  headline: string;
  supportingText: string;
  metric?: string;
  visualFocus: string;
}

export class VideoCopywriter {
  /**
   * Generates clean, concise, non-redundant on-screen copy for a scene
   */
  public static craftSceneCopy(options: {
    sceneIndex: number;
    totalScenes: number;
    purpose: string;
    coreTopic: string;
    voiceText: string;
    contentType: string;
  }): SceneDisplayCopy {
    const { sceneIndex, totalScenes, purpose, coreTopic, voiceText, contentType } = options;

    const cleanTopic = FinalContentSanitizer.sanitizeString(coreTopic)
      .replace(/^(tạo video|video|về|khám phá|đánh giá|phân tích)\s+/i, '')
      .trim();

    const cleanVoice = FinalContentSanitizer.sanitizeString(voiceText);

    // 1. Determine Badge (1-3 words)
    let badge = 'ĐIỂM NHẤN';
    if (sceneIndex === 0 || purpose === 'hook') {
      badge = 'TÂM ĐIỂM';
    } else if (sceneIndex === totalScenes - 1 || purpose === 'cta') {
      badge = contentType === 'PRODUCT' ? 'CHỐT ĐƠN' : 'TỔNG KẾT';
    } else {
      const purposeBadges: Record<string, string[]> = {
        REAL_ESTATE: ['VỊ TRÍ VÀNG', 'QUY HOẠCH', 'TIỆN ÍCH', 'TIỀM NĂNG'],
        PRODUCT: ['THIẾT KẾ', 'CÔNG NGHỆ', 'HIỆU SUẤT', 'TRẢI NGHIỆM', 'THÔNG SỐ'],
        TRAVEL: ['DANH THẮNG', 'VĂN HÓA', 'TRẢI NGHIỆM', 'ẨM THỰC', 'CHECK-IN'],
        FINANCE: ['XU HƯỚNG', 'DÒNG TIỀN', 'LỢI NHUẬN', 'RỦI RO', 'CHIẾN LƯỢC'],
        TECH: ['BỨT PHÁ', 'HIỆU NĂNG', 'TÍNH NĂNG', 'ỨNG DỤNG', 'TƯƠNG LAI'],
        EDUCATION: ['KỸ NĂNG', 'TƯ DUY', 'PHƯƠNG PHÁP', 'ỨNG DỤNG'],
        NEWS: ['DIỄN BIẾN', 'BỐI CẢNH', 'TÁC ĐỘNG', 'DỰ BÁO'],
      };

      const pool = purposeBadges[contentType] || ['ĐẶC ĐIỂM', 'THỰC TẾ', 'GIẢI PHÁP', 'ĐÁNG CHÚ Ý'];
      badge = pool[(sceneIndex - 1) % pool.length];
    }

    // 2. Extract Metric (if any prominent number exists in voice)
    let metric: string | undefined = undefined;
    const metricMatch = cleanVoice.match(
      /(?:\d+[\d.,]*\s*(?:km|km\/h|m|ha|m2|triệu|tỷ|usd|\$|%|s|giây|phút|giờ|★|sao|người|lần|năm))/i
    );
    if (metricMatch) {
      metric = metricMatch[0].toUpperCase();
    }

    // 3. Craft Headline (2-6 words, punchy, NOT a full paragraph)
    let headline = '';
    if (sceneIndex === 0) {
      headline = cleanTopic.length > 28 ? cleanTopic.slice(0, 26).toUpperCase() : cleanTopic.toUpperCase();
    } else if (sceneIndex === totalScenes - 1) {
      headline = contentType === 'PRODUCT' ? 'SỞ HỮU NGAY HÔM NAY' : 'BẠN ĐÁNH GIÁ THẾ NÀO?';
    } else {
      headline = this.extractPunchyHeadline(cleanVoice, cleanTopic);
    }

    // 4. Craft Supporting Text (0-8 words, or empty)
    let supportingText = '';
    if (metric && headline.length <= 20) {
      supportingText = 'Thông số kiểm chứng thực tế';
    } else if (sceneIndex === totalScenes - 1) {
      supportingText = 'Để lại bình luận bên dưới';
    }

    // 5. Duplicate Detection & Prevention (Section E)
    headline = this.preventDuplicate(headline, badge);
    if (supportingText) {
      supportingText = this.preventDuplicate(supportingText, headline);
    }

    // Final safety trim: Headline max 7 words
    const headlineWords = headline.split(/\s+/).filter(Boolean);
    if (headlineWords.length > 7) {
      headline = headlineWords.slice(0, 6).join(' ');
    }

    return {
      badge: badge.toUpperCase(),
      headline: headline.toUpperCase(),
      supportingText,
      metric,
      visualFocus: cleanTopic,
    };
  }

  /**
   * Extracts a punchy 2-5 word concept from voice text instead of dumping whole sentences
   */
  /**
   * Extracts a punchy 2-5 word concept from voice text instead of dumping whole sentences
   */
  private static extractPunchyHeadline(voice: string, rawTopic: string): string {
    // Look for key semantic phrases
    if (/(động cơ|công suất|mã lực|tốc độ|khả năng tăng tốc)/i.test(voice)) {
      return 'HIỆU NĂNG MẠNH MẼ';
    }
    if (/(pin|sạc|thời gian sạc|quãng đường|di chuyển|km\b)/i.test(voice)) {
      return 'PIN VÀ TẦM HOẠT ĐỘNG';
    }
    if (/(thiết kế|ngoại hình|khung xe|chất liệu|kiểu dáng|tinh tế)/i.test(voice)) {
      return 'THIẾT KẾ ĐỘT PHÁ';
    }
    if (/(giá|chi phí|tiết kiệm|ưu đãi|bảo hành)/i.test(voice)) {
      return 'CHI PHÍ TỐI ƯU';
    }
    if (/(công nghệ|thông minh|màn hình|kết nối|tính năng)/i.test(voice)) {
      return 'CÔNG NGHỆ THÔNG MINH';
    }
    if (/(tên lửa|vũ khí|quân sự|pháo|chiến đấu|tác chiến|quốc phòng)/i.test(voice)) {
      return 'VŨ KHÍ CHIẾN LƯỢC';
    }
    if (/(tầm bắn|vận tốc|đầu đạn|uy lực|sức công phá)/i.test(voice)) {
      return 'UY LỰC TẦM XA';
    }
    if (/(bệ phóng|khung gầm|cơ động|khai hỏa|sẵn sàng)/i.test(voice)) {
      return 'KHẢ NĂNG CƠ ĐỘNG';
    }
    if (/(đông nam á|việt nam|duy nhất|độc nhất|sở hữu)/i.test(voice)) {
      return 'VỊ THẾ ĐẶC BIỆT';
    }
    if (/(bãi biển|non nước|thiên nhiên|phong cảnh|kỳ vĩ)/i.test(voice)) {
      return 'THIÊN NHIÊN KỲ VĨ';
    }
    if (/(lịch sử|di tích|truyền thống|văn hóa|ngàn năm)/i.test(voice)) {
      return 'BỀ DÀY VĂN HÓA';
    }
    if (/(ẩm thực|đặc sản|món ngon|hương vị)/i.test(voice)) {
      return 'ẨM THỰC ĐẶC SẮC';
    }

    // Fallback: take first 4-5 meaningful words of the first sentence, stripping source attributions and common hook cliches
    let cleanVoice = voice
      .replace(/^(theo|nguồn(?:\s*tin)?|theo\s*như|báo|trang\s*tin|thông\s*tin\s*từ)\s+[^,.:\n]+,?\s*/i, '')
      .replace(/^(?:bạn có biết|có một sự thật|sự thật bất ngờ|con số \d+ đang|điều gì đã khiến|những điều có thể bạn chưa biết|nói về những điều)\s*[:,-]?\s*/i, '')
      .replace(/^(nếu bạn|điều đầu tiên|thứ nhất|thứ hai|đặc biệt|ngoài ra|chính vì vậy|hơn nữa|có thể thấy|chúng ta|nơi đây|đây là)\s*,?\s*/i, '');

    const firstSentence = cleanVoice.split(/[.?!:\n]/)[0] || cleanVoice;
    const words = firstSentence
      .split(/\s+/)
      .filter((w) => {
        const lower = w.toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
        if (lower.length <= 1) return false;
        // Never include news/research source names in headlines
        if (['vnexpress', 'wikipedia', 'dantri', 'tuoitre', 'thanhnien', 'vtv', 'zing', 'cafef', 'baomoi', 'reuters', 'bloomberg'].includes(lower)) {
          return false;
        }
        return true;
      });

    if (words.length >= 2) {
      return words.slice(0, 5).join(' ').toUpperCase();
    }

    // Fallback to cleaned core topic (never cut off words midway)
    const cleanTopic = rawTopic
      .replace(/^(?:hãy\s+)?(?:nói|kể|chia sẻ)\s+về\s+/i, '')
      .replace(/^(?:những\s+)?(?:điều|sự thật|bí mật)\s+(?:có thể\s+)?(?:bạn\s+)?(?:chưa biết\s+)?về\s+/i, '')
      .replace(/\s*(?:mà rất ít người để ý|mà bạn chưa biết)\s*$/i, '')
      .trim();

    const topicWords = cleanTopic.split(/\s+/).filter(Boolean);
    if (topicWords.length > 0) {
      return topicWords.slice(0, 4).join(' ').toUpperCase();
    }

    return 'TÂM ĐIỂM NỔI BẬT';
  }

  /**
   * Compares similarity and rewrites to prevent duplicated text
   */
  private static preventDuplicate(textA: string, textB: string): string {
    if (!textA || !textB) return textA;

    const normA = textA.toLowerCase().trim();
    const normB = textB.toLowerCase().trim();

    if (normA === normB || normA.includes(normB) || normB.includes(normA)) {
      return 'ĐIỂM NỔI BẬT';
    }

    return textA;
  }
}
