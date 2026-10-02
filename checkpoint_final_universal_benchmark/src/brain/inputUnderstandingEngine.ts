/**
 * PART 1 — INPUT INTELLIGENCE ENGINE
 * Analyzes raw prompt, URL, and user constraints to generate a comprehensive ContentBrief.
 * Supports all 19 content types and sets research, factual sensitivity, and freshness parameters.
 */

import { ContentBrief, ContentType } from '../types/contentBrain.js';

export class InputUnderstandingEngine {
  /**
   * Classifies user input into one of 19 distinct content types
   */
  public static classifyContentType(prompt: string, url?: string): ContentType {
    const text = `${prompt} ${url || ''}`.toLowerCase();

    // 1. REAL_PRODUCT
    if (
      /(?:xe\s*máy|xe\s*đạp|xe\s*điện|dat\s*bike|vinfast|honda|yamaha|iphone|samsung|macbook|laptop|điện thoại|tai nghe|đồng hồ|review\s*sản phẩm|đập hộp|trên tay|thông số|giá bán|mở hộp)/i.test(
        text
      )
    ) {
      return 'REAL_PRODUCT';
    }

    // 2. REAL_LOCATION
    if (
      /(?:tỉnh|thành phố|huyện|xã|địa danh|hà tĩnh|đà nẵng|hà nội|sài gòn|tp\.hcm|quảng ninh|nha trang|phú quốc|đà lạt|sapa|vũng tàu|huế|hội an|quảng bình|ninh bình|mộc châu)/i.test(
        text
      ) &&
      !/(?:du lịch|tour|check-in|khách sạn)/i.test(text)
    ) {
      return 'REAL_LOCATION';
    }

    // 3. TRAVEL
    if (
      /(?:du lịch|khám phá|điểm đến|thắng cảnh|bãi biển|resort|non nước|check-in|tour|khách sạn|kinh nghiệm du lịch|ẩm thực du lịch)/i.test(
        text
      )
    ) {
      return 'TRAVEL';
    }

    // 4. REAL_PERSON
    if (
      /(?:ông|bà|tiểu sử|cuộc đời|chủ tịch|ceo|bác hồ|đại tướng|nguyễn du|cầu thủ|ca sĩ|diễn viên|nghệ sĩ|nhà sáng lập|tỷ phú|nhân vật)/i.test(
        text
      )
    ) {
      return 'REAL_PERSON';
    }

    // 5. REAL_ESTATE
    if (
      /(?:bất động sản|căn hộ|chung cư|nhà đất|biệt thự|vinhomes|đất nền|quy hoạch|mặt bằng|bđs|shophouse|dự án khu đô thị)/i.test(
        text
      )
    ) {
      return 'REAL_ESTATE';
    }

    // 6. FINANCE
    if (
      /(?:tài chính|chứng khoán|lãi suất|ngân hàng|giá vàng|lạm phát|đầu tư|cổ phiếu|crypto|bitcoin|tiền tệ|quỹ đầu tư|trái phiếu)/i.test(
        text
      )
    ) {
      return 'FINANCE';
    }

    // 7. BUSINESS
    if (
      /(?:doanh nghiệp|startup|doanh thu|thị phần|tập đoàn|kinh doanh|mô hình kinh doanh|thị trường|chiến lược kinh doanh)/i.test(
        text
      )
    ) {
      return 'BUSINESS';
    }

    // 8. TECH
    if (
      /(?:trí tuệ nhân tạo|công nghệ|ai|chip|bán dẫn|gpu|nvidia|openai|software|lập trình|thuật toán|robot|an ninh mạng)/i.test(
        text
      )
    ) {
      return 'TECH';
    }

    // 9. HISTORY
    if (
      /(?:lịch sử|thế kỷ|chiến dịch|chiến tranh|triều đại|thời kỳ|kháng chiến|di tích lịch sử|vua|cổ xưa)/i.test(
        text
      )
    ) {
      return 'HISTORY';
    }

    // 10. DOCUMENTARY
    if (/(?:phim tài liệu|tài liệu|hồ sơ|ký sự|toàn cảnh sự kiện)/i.test(text)) {
      return 'DOCUMENTARY';
    }

    // 11. NEWS / CURRENT_EVENT
    if (/(?:vừa diễn ra|nóng nhất|tin tức mới|khẩn cấp|chính thức công bố|sự kiện hôm nay|bản tin)/i.test(text)) {
      return 'CURRENT_EVENT';
    }
    if (/(?:tin tức|thời sự|thông cáo|báo cáo mới)/i.test(text)) {
      return 'NEWS';
    }

    // 12. EDUCATION
    if (/(?:giáo dục|học bổng|kỹ năng|phương pháp|đại học|du học|tư duy|bài học|hướng dẫn học)/i.test(text)) {
      return 'EDUCATION';
    }

    // 13. LISTICLE
    if (/(?:top \d+|\d+ điều|\d+ lý do|\d+ bí mật|\d+ sự thật|\d+ cách)/i.test(text)) {
      return 'LISTICLE';
    }

    // 14. STORY
    if (/(?:câu chuyện|hành trình|kể lại|bài học cuộc sống|nghị lực)/i.test(text)) {
      return 'STORY';
    }

    // 15. LIFESTYLE
    if (/(?:ẩm thực|cà phê|thời trang|healthy|lối sống|thói quen|chữa lành|decor)/i.test(text)) {
      return 'LIFESTYLE';
    }

    // 16. EXPLAINER
    if (/(?:tại sao|nguyên lý|cơ chế|hoạt động như thế nào|bản chất của|vì sao)/i.test(text)) {
      return 'EXPLAINER';
    }

    // 17. CONCEPTUAL
    if (/(?:khái niệm|ý niệm|triết lý|tương lai học|giả thuyết)/i.test(text)) {
      return 'CONCEPTUAL';
    }

    return 'OTHER';
  }

  /**
   * Extracts clean primary topic and key entities from user prompt
   */
  public static extractTopicAndEntities(prompt: string): { cleanTopic: string; entities: string[] } {
    let clean = prompt
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/^(?:tạo|làm|dựng|hãy tạo|giúp tôi tạo)\s+(?:video|clip|short|tiktok)?\s*(?:\d+\s*(?:s|giây|second))?\s*[:,-]?\s*/gi, '')
      .replace(/^(?:về|giới thiệu|nói về|chia sẻ về|khám phá|tìm hiểu)\s+/gi, '')
      .trim();

    clean = clean.replace(/^(?:những\s+)?(?:điều|bí mật|sự thật)\s+(?:có thể\s+)?(?:bạn\s+)?(?:chưa biết\s+)?về\s+/gi, '').trim();

    const entities: string[] = [];

    // Extract specific brands/entities with internal capitalization (e.g. DatBike, iPhone, VinFast, ChatGPT)
    const brandMatches = clean.match(/[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴa-z0-9]*[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][A-Za-z0-9+]+/g);
    if (brandMatches) {
      brandMatches.forEach((b) => {
        if (b.length >= 3 && !entities.includes(b)) {
          entities.push(b);
        }
      });
    }

    // Extract capitalized proper nouns
    const properNounMatches = clean.match(/(?:[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][a-zđàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+(?:\s+[A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][a-zđàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)*)/g);
    if (properNounMatches) {
      properNounMatches.forEach((e) => {
        if (e.length > 2 && !entities.includes(e)) {
          entities.push(e);
        }
      });
    }

    if (entities.length === 0 && clean.length > 0) {
      entities.push(clean);
    }

    return {
      cleanTopic: clean || 'Chủ đề nổi bật',
      entities,
    };
  }

  /**
   * Generates a complete, structured ContentBrief from input parameters
   */
  public static analyze(prompt: string, options?: { duration?: number; url?: string }): ContentBrief {
    const rawPrompt = (prompt || '').trim();
    const url = options?.url;
    const contentType = this.classifyContentType(rawPrompt, url);
    const { cleanTopic, entities } = this.extractTopicAndEntities(rawPrompt);

    // Duration normalization (supports 30, 45, 60, 90, 120, 180s)
    let targetDuration = options?.duration || 60;
    const durMatch = rawPrompt.match(/(\d+)\s*(?:giây|s|second)/i);
    if (durMatch && !options?.duration) {
      const parsed = parseInt(durMatch[1], 10);
      if ([30, 45, 60, 90, 120, 180].includes(parsed)) {
        targetDuration = parsed;
      } else if (parsed <= 35) targetDuration = 30;
      else if (parsed <= 50) targetDuration = 45;
      else if (parsed <= 75) targetDuration = 60;
      else if (parsed <= 105) targetDuration = 90;
      else if (parsed <= 150) targetDuration = 120;
      else targetDuration = 180;
    }

    // Determine factual sensitivity
    let factualSensitivity: ContentBrief['factualSensitivity'] = 'MEDIUM';
    if (['REAL_PRODUCT', 'REAL_PERSON', 'REAL_LOCATION', 'FINANCE', 'NEWS', 'CURRENT_EVENT', 'BUSINESS'].includes(contentType)) {
      factualSensitivity = 'HIGH';
    } else if (['CONCEPTUAL', 'LIFESTYLE', 'STORY'].includes(contentType)) {
      factualSensitivity = 'LOW';
    }

    // Freshness requirement
    let freshnessRequirement: ContentBrief['freshnessRequirement'] = 'EVERGREEN';
    if (['NEWS', 'CURRENT_EVENT'].includes(contentType)) {
      freshnessRequirement = 'LATEST';
    } else if (['REAL_PRODUCT', 'FINANCE', 'TECH', 'BUSINESS'].includes(contentType)) {
      freshnessRequirement = 'RECENT';
    }

    // Target audience & intent synthesis
    let targetAudience = 'Khán giả đại chúng trên nền tảng short-form yêu thích thông tin cô đọng, sắc bén';
    let viewerIntent = 'Tìm hiểu nhanh thông tin cốt lõi và góc nhìn giá trị';
    let creatorGoal = 'Cung cấp góc nhìn thuyết phục, giữ chân người xem đến giây cuối và tạo tương tác tự nhiên';
    let tone = 'cuốn hút, súc tích, đáng tin cậy';

    if (contentType === 'REAL_PRODUCT') {
      targetAudience = 'Người tiêu dùng và tín đồ công nghệ/phương tiện đang cân nhắc hoặc tò mò về sản phẩm';
      viewerIntent = 'Biết ưu thế thực tế, thông số cốt lõi và giá trị sử dụng thật sự';
      tone = 'chuyên nghiệp, khách quan, giàu năng lượng';
    } else if (contentType === 'TRAVEL' || contentType === 'REAL_LOCATION') {
      targetAudience = 'Người yêu du lịch, văn hóa và khám phá vẻ đẹp các vùng miền';
      viewerIntent = 'Chiêm ngưỡng cảnh quan độc đáo, hiểu chiều sâu văn hóa và trải nghiệm đáng giá';
      tone = 'truyền cảm hứng, tự hào, lôi cuốn';
    } else if (contentType === 'FINANCE' || contentType === 'TECH') {
      targetAudience = 'Nhà đầu tư, người làm kinh doanh và người theo dõi xu hướng công nghệ';
      viewerIntent = 'Nắm bắt dữ liệu then chốt, ý nghĩa thực tế và xu hướng tương lai';
      tone = 'sắc bén, phân tích chiều sâu, uy tín';
    }

    return {
      originalRequest: rawPrompt,
      topic: cleanTopic,
      primaryEntities: entities,
      contentType,
      targetAudience,
      viewerIntent,
      creatorGoal,
      targetPlatform: 'tiktok',
      targetDuration,
      language: 'vi',
      tone,
      factualSensitivity,
      freshnessRequirement,
      researchRequired: !url || factualSensitivity === 'HIGH',
    };
  }
}
