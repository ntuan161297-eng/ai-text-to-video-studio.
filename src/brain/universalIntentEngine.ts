/**
 * UNIVERSAL INTENT ENGINE
 * Analyzes arbitrary user requests across any domain or niche.
 * Does NOT force single-channel, rigid ContentType, or TikTok assumptions.
 * Generates UserIntentSpec, TopicContract, and DurationContract.
 */

import {
  UserIntentSpec,
  TopicContract,
  DurationContract,
} from '../types/universalContracts.js';
import { v4 as uuidv4 } from 'uuid';

export class UniversalIntentEngine {
  /**
   * Resolves raw prompt, URL and user options into a strict UserIntentSpec & Contracts
   */
  public static resolve(
    rawPrompt: string,
    options?: {
      duration?: number;
      url?: string;
      aspectRatio?: '9:16' | '16:9' | '1:1';
      platform?: string;
      tone?: string;
      userConstraints?: string[];
      requestId?: string;
    }
  ): {
    intentSpec: UserIntentSpec;
    topicContract: TopicContract;
    durationContract: DurationContract;
  } {
    const prompt = (rawPrompt || '').trim();
    const requestId = options?.requestId || `req_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    // 1. Immutable Duration Extraction (No rounding to 30/45/60 presets)
    let requestedDurationSeconds = options?.duration && options.duration > 0 ? options.duration : 60;
    if (!options?.duration) {
      const match = prompt.match(/(\d+)\s*(?:giây|s|second)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed >= 5 && parsed <= 600) {
          requestedDurationSeconds = parsed;
        }
      }
    }

    // 2. Clean primary subject extraction
    const { cleanSubject, requiredEntities } = this.extractSubjectAndEntities(prompt);

    // 3. User Goal & Communication Goal Deduction (Open & Adaptive)
    const { userGoal, communicationGoal, contentMode, tone, factualityLevel, freshnessRequirement } =
      this.deduceGoalsAndMode(prompt, options?.url, options?.tone);

    // 4. Platform & Aspect Ratio
    const targetAspectRatio = options?.aspectRatio || '9:16';
    const targetPlatform = options?.platform || (targetAspectRatio === '16:9' ? 'youtube' : 'general');

    // 5. Visual Expectation
    let visualExpectation: UserIntentSpec['visualExpectation'] = 'REAL_FOOTAGE';
    if (contentMode === 'EXPLAINER' || contentMode === 'TUTORIAL') {
      visualExpectation = 'MIXED';
    } else if (prompt.toLowerCase().includes('đồ họa') || prompt.toLowerCase().includes('infographic')) {
      visualExpectation = 'INFOGRAPHIC';
    }

    // 6. User Constraints & Excluded Scope
    const userConstraints: string[] = options?.userConstraints ? [...options.userConstraints] : [];
    const excludedScope: string[] = [];
    const assumptions: string[] = [];
    const ambiguities: string[] = [];

    // Detect negative constraints in prompt (e.g. "không nói về...", "không quảng cáo...")
    const negativeMatches = prompt.match(/(?:không\s+nói\s+về|tránh|loại\s+trừ|không\s+nhắc\s+đến)\s+([^,.;\n]+)/gi);
    if (negativeMatches) {
      negativeMatches.forEach((m) => {
        const clean = m.replace(/^(?:không\s+nói\s+về|tránh|loại\s+trừ|không\s+nhắc\s+đến)\s+/gi, '').trim();
        if (clean) excludedScope.push(clean);
      });
    }

    // Detect explicit CTA intent in prompt (e.g. "kêu gọi lưu video", "theo dõi kênh", "comment", v.v.)
    const hasCtaRequest = /(?:kêu\s+gọi|lưu\s+video|theo\s+dõi|follow|đăng\s+ký|bình\s+luận|comment|ấn\s+theo\s+dõi|câu\s+kết|đoạn\s+kết)/i.test(prompt);
    if (hasCtaRequest) {
      userConstraints.push('YÊU CẦU CTA: Bắt buộc ở phân cảnh kết thúc phải có câu kêu gọi tự nhiên người xem lưu video, bình luận và ấn theo dõi kênh.');
    } else if (targetAspectRatio === '9:16') {
      userConstraints.push('CTA_DEFAULT: Ở đoạn cuối đúc kết ý nghĩa và gợi mở người xem lưu video, bình luận hoặc ấn theo dõi kênh.');
    }

    if (/(?:bỏ|ẩn|không\s+(?:có|cần|hiện))\s+tiêu\s+đề/i.test(prompt)) {
      userConstraints.push('HIDE_TITLE: Không hiển thị tiêu đề phân cảnh trên đầu video');
    }

    // 7. Confidence Gate Analysis
    let confidenceScore = 100;
    if (!cleanSubject || cleanSubject.length < 3) {
      confidenceScore -= 40;
      ambiguities.push('Chủ đề chính không rõ ràng hoặc quá ngắn.');
    }
    if (prompt.length < 5 && !options?.url) {
      confidenceScore -= 30;
      ambiguities.push('Yêu cầu người dùng quá ngắn, thiếu bối cảnh.');
    }
    const needsClarification = confidenceScore < 50;

    const intentSpec: UserIntentSpec = {
      requestId,
      originalUserRequest: prompt,
      primarySubject: cleanSubject,
      userGoal,
      communicationGoal,
      audience: 'Khán giả quan tâm đến chủ đề ' + cleanSubject,
      contentMode,
      informationDepth: requestedDurationSeconds <= 30 ? 'SUMMARY' : requestedDurationSeconds <= 60 ? 'MEDIUM' : 'HIGH',
      tone,
      factualityLevel,
      freshnessRequirement,
      requestedDurationSeconds,
      targetPlatform,
      targetAspectRatio,
      visualExpectation,
      userConstraints,
      requiredEntities,
      optionalEntities: [],
      excludedScope,
      assumptions,
      ambiguities,
      confidenceScore,
      needsClarification,
    };

    // 8. Construct TopicContract (Inviolable Content Boundary)
    const stopWords = new Set(['khi', 'cho', 'của', 'trong', 'những', 'được', 'các', 'một', 'này', 'theo', 'trên', 'dưới', 'với']);
    const topicFingerprint = cleanSubject
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w));

    const topicContract: TopicContract = {
      coreTopic: cleanSubject,
      topicFingerprint,
      coreQuestion: `Nội dung cốt lõi và giá trị then chốt về ${cleanSubject} là gì?`,
      requiredCoverage: [cleanSubject, ...requiredEntities.slice(0, 3)],
      allowedExpansion: ['Bối cảnh thực tế', 'Số liệu minh chứng', 'Ý nghĩa thực tiễn'],
      prohibitedExpansion: [...excludedScope, 'Tin đồn chưa xác thực', 'Nội dung quảng cáo lạc đề'],
      requiredEntities,
      relevanceCriteria: `Mọi câu văn, cảnh quay và hình ảnh phải trực tiếp phục vụ việc làm sáng tỏ ${cleanSubject}.`,
    };

    // 9. Construct DurationContract (Immutable Target)
    const durationVariance = Math.max(4, Math.round(requestedDurationSeconds * 0.08));
    const durationContract: DurationContract = {
      requestedSeconds: requestedDurationSeconds,
      minimumAcceptedSeconds: Math.max(5, requestedDurationSeconds - durationVariance),
      maximumAcceptedSeconds: requestedDurationSeconds + durationVariance,
    };

    return {
      intentSpec,
      topicContract,
      durationContract,
    };
  }

  private static extractSubjectAndEntities(prompt: string): { cleanSubject: string; requiredEntities: string[] } {
    // 1. Separate primary topic line from user instructions/constraints
    const rawLines = prompt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let topicCandidate = rawLines[0] || prompt;
    for (const line of rawLines) {
      if (!/^(có hình ảnh|bỏ tiêu đề|bỏ phân cảnh|không có|yêu cầu|lưu ý|chú ý|câu kết|kêu gọi|nhớ|đừng)\b/i.test(line)) {
        topicCandidate = line;
        break;
      }
    }

    let clean = topicCandidate
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/^(?:tôi muốn|tôi cần|hãy|hãy giúp tôi|giúp tôi|cần|muốn|làm ơn)?\s*(?:tạo|làm|dựng|sản xuất)?\s*(?:một\s+)?(?:video|clip|short|phim)?\s*(?:\d+\s*(?:s|giây|second))?\s*[:,-]?\s*/gi, '')
      .trim();

    while (/^(?:về|giới thiệu|nói về|chia sẻ về|khám phá|tìm hiểu|cho|hãy giới thiệu)\s+/i.test(clean)) {
      clean = clean.replace(/^(?:về|giới thiệu|nói về|chia sẻ về|khám phá|tìm hiểu|cho|hãy giới thiệu)\s+/i, '').trim();
    }

    clean = clean.replace(/^(?:những\s+)?(?:điều|bí mật|sự thật)\s+(?:có thể\s+)?(?:bạn\s+)?(?:chưa biết\s+)?về\s+/gi, '').trim();

    // Strip inline user instruction clauses (e.g. "... có hình ảnh nem nắm, bỏ tiêu đề...")
    clean = clean.replace(/(?:,|;|\.|\s-\s|\s–\s)\s*(?:bỏ|không có|có câu kết|kêu gọi|lưu ý|yêu cầu|hình ảnh|tiêu đề).*/gi, '').trim();
    clean = clean.replace(/[-–—,:;]+$/, '').trim();

    const PRONOUN_BLOCKLIST = new Set([
      'tôi', 'bạn', 'chúng tôi', 'chúng ta', 'mình', 'người', 'ai', 'video', 'clip', 'hãy', 'muốn', 'giới thiệu', 'giới', 'cần',
      'lưu', 'theo', 'dõi', 'kênh', 'kết', 'thúc', 'câu', 'comment', 'ấn', 'hình', 'ảnh'
    ]);

    const entities: string[] = [];

    // Match traditional Vietnamese dishes or specialty phrases
    const specialtyMatch = prompt.match(/(?:đặc sản|món ăn|món|bánh|kẹo|nem|chả|phở|bún)\s+([^,.;\n\r]+)/i);
    if (specialtyMatch && specialtyMatch[0]) {
      const specClean = specialtyMatch[0].replace(/\b(có hình ảnh|bỏ tiêu đề|trong video|kết thúc|theo dõi)\b/gi, '').trim();
      if (specClean.length > 3 && !entities.includes(specClean)) {
        entities.unshift(specClean);
      }
    }

    // Extract specific brands/entities with internal capitalization (e.g. DatBike, iPhone, VinFast, ChatGPT)
    const brandMatches = clean.match(/[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴa-z0-9]*[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][A-Za-z0-9+]+/g);
    if (brandMatches) {
      brandMatches.forEach((b) => {
        const lower = b.toLowerCase().trim();
        if (b.length >= 3 && !entities.includes(b) && !PRONOUN_BLOCKLIST.has(lower)) {
          entities.push(b);
        }
      });
    }

    // Capitalized multi-word proper nouns
    const properNounMatches = clean.match(/(?:[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][a-zđàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+(?:\s+[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][a-zđàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)*)/g);
    if (properNounMatches) {
      properNounMatches.forEach((e) => {
        const lower = e.toLowerCase().trim();
        if (e.length > 2 && !entities.includes(e) && !PRONOUN_BLOCKLIST.has(lower)) {
          entities.push(e);
        }
      });
    }

    // Extract consecutive capitalized pairs (e.g. "Tân Dân")
    const words = clean.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      if (
        /^[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/.test(words[i]) &&
        /^[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/.test(words[i + 1])
      ) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        const lowerBi = bigram.toLowerCase();
        if (!PRONOUN_BLOCKLIST.has(lowerBi) && !['công ty', 'cổ phần', 'tin học'].includes(lowerBi)) {
          if (!entities.includes(bigram)) entities.push(bigram);
        }
      }
    }

    // If clean has explicit enterprise keywords, add them
    if (/(?:công ty|tập đoàn|doanh nghiệp)\s+([^,.;\n]+)/i.test(clean)) {
      const entMatch = clean.match(/(?:công ty|tập đoàn|doanh nghiệp)\s+([^,.;\n]+)/i);
      if (entMatch && entMatch[0]) {
        const entClean = entMatch[0].trim();
        if (!entities.includes(entClean)) {
          entities.unshift(entClean);
        }
      }
    }

    const finalEntities = entities
      .map((e) => e.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim())
      .filter((e) => {
        const lower = e.toLowerCase().trim();
        if (e.length <= 1 || lower.endsWith(' công') || lower.startsWith('dân ') || PRONOUN_BLOCKLIST.has(lower)) return false;
        return true;
      });

    if (finalEntities.length === 0 && clean.length > 0) {
      const fallback = clean.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').split(/\s+/).slice(0, 3).join(' ').trim();
      if (fallback) finalEntities.push(fallback);
    }

    return {
      cleanSubject: clean || 'Chủ đề video',
      requiredEntities: finalEntities,
    };
  }

  private static deduceGoalsAndMode(
    prompt: string,
    url?: string,
    userTone?: string
  ): {
    userGoal: UserIntentSpec['userGoal'];
    communicationGoal: string;
    contentMode: string;
    tone: string;
    factualityLevel: UserIntentSpec['factualityLevel'];
    freshnessRequirement: UserIntentSpec['freshnessRequirement'];
  } {
    const text = `${prompt} ${url || ''}`.toLowerCase();

    // Default neutral state
    let userGoal: UserIntentSpec['userGoal'] = 'INFORM';
    let communicationGoal = 'Cung cấp thông tin khách quan, rõ ràng và có giá trị về chủ thể';
    let contentMode = 'GENERAL';
    let tone = userTone || 'khách quan, tự nhiên, rõ ràng';
    let factualityLevel: UserIntentSpec['factualityLevel'] = 'BALANCED';
    let freshnessRequirement: UserIntentSpec['freshnessRequirement'] = 'EVERGREEN';

    if (/(?:đánh giá|review|so sánh|trên tay|mở hộp|dùng thử)/i.test(text)) {
      userGoal = 'REVIEW';
      contentMode = 'PRODUCT_REVIEW';
      communicationGoal = 'Đánh giá khách quan các ưu nhược điểm, thông số và trải nghiệm thực tế';
      tone = userTone || 'trung thực, chi tiết, thực tế';
      factualityLevel = 'STRICT';
      freshnessRequirement = 'RECENT';
    } else if (/(?:hướng dẫn|cách làm|làm thế nào|bước làm|quy trình|how to)/i.test(text)) {
      userGoal = 'TUTORIAL';
      contentMode = 'TUTORIAL';
      communicationGoal = 'Hướng dẫn từng bước rõ ràng để người xem có thể thực hiện theo';
      tone = userTone || 'rõ ràng, mạch lạc, dễ hiểu';
    } else if (/(?:tại sao|nguyên lý|bản chất|giải thích|cơ chế|vì sao)/i.test(text)) {
      userGoal = 'EXPLAIN';
      contentMode = 'EXPLAINER';
      communicationGoal = 'Làm sáng tỏ bản chất nguyên lý hoạt động một cách logic và trực quan';
      tone = userTone || 'súc tích, logic, gợi mở';
    } else if (/(?:tin tức|thời sự|mới nhất|vừa công bố|hôm nay|cập nhật)/i.test(text)) {
      userGoal = 'INFORM';
      contentMode = 'NEWS';
      communicationGoal = 'Truyền tải sự kiện mới nhất chính xác, trung thực, không giật gân';
      tone = userTone || 'nghiêm túc, chuẩn xác, nhanh chóng';
      factualityLevel = 'STRICT';
      freshnessRequirement = 'LATEST';
    } else if (/(?:du lịch|khám phá|địa danh|văn hóa|thắng cảnh|non nước)/i.test(text)) {
      userGoal = 'INSPIRE';
      contentMode = 'TRAVEL_CULTURE';
      communicationGoal = 'Giới thiệu vẻ đẹp cảnh quan, nét đặc sắc văn hóa và trải nghiệm đáng giá';
      tone = userTone || 'truyền cảm hứng, giàu hình ảnh, sống động';
      factualityLevel = 'STRICT';
    } else if (/(?:lịch sử|thế kỷ|chiến dịch|nhân vật lịch sử|tiểu sử)/i.test(text)) {
      userGoal = 'DOCUMENT';
      contentMode = 'DOCUMENTARY';
      communicationGoal = 'Tái hiện chân thực dòng chảy sự kiện lịch sử với dữ liệu xác thực';
      tone = userTone || 'sâu sắc, tôn trọng lịch sử, điềm đạm';
      factualityLevel = 'STRICT';
    } else if (/(?:giáo dục|kiến thức|bài học|khoa học)/i.test(text)) {
      userGoal = 'EDUCATE';
      contentMode = 'EDUCATION';
      communicationGoal = 'Truyền đạt kiến thức khoa học hữu ích, chuẩn xác';
      tone = userTone || 'thấu đáo, sư phạm, chuẩn mực';
    }

    return {
      userGoal,
      communicationGoal,
      contentMode,
      tone,
      factualityLevel,
      freshnessRequirement,
    };
  }
}
