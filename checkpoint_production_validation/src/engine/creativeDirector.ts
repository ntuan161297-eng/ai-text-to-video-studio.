/**
 * CREATIVE DIRECTOR (Section 1 & 2)
 * Phân tích toàn diện ý tưởng đầu vào: ContentType, Audience, Viewer Promise, Tone, Angle, Arc.
 */

export type ContentType =
  | 'NEWS'
  | 'EXPLAINER'
  | 'REAL_ESTATE'
  | 'TRAVEL'
  | 'FINANCE'
  | 'TECH'
  | 'EDUCATION'
  | 'PRODUCT'
  | 'STORY'
  | 'DOCUMENTARY'
  | 'LISTICLE'
  | 'LOCATION'
  | 'BUSINESS'
  | 'LIFESTYLE'
  | 'OTHER';

export type Tone =
  | 'urgent_authoritative'
  | 'curious_inspiring'
  | 'analytical_premium'
  | 'energetic_engaging'
  | 'calm_insightful'
  | 'dramatic_cinematic';

export interface AngleCandidate {
  id: 'information_first' | 'curiosity_discovery' | 'problem_consequence';
  name: string;
  hookHypothesis: string;
  focus: string;
  score: number;
  selectionRationale: string;
}

export interface CreativeBrief {
  contentType: ContentType;
  targetAudience: string;
  viewerPromise: string;
  coreQuestion: string;
  tone: Tone;
  designPreset: 'MODERN' | 'EDITORIAL' | 'DOCUMENTARY' | 'LUXURY' | 'NEWS' | 'TECH' | 'MINIMAL' | 'ENERGETIC' | 'CINEMATIC' | 'CORPORATE';
  storytellingStrategy: string;
  visualStrategy: string;
  pacingStrategy: string;
  audioStrategy: string;
  retentionStrategy: string;
  selectedAngle: AngleCandidate;
  allAngles: AngleCandidate[];
  profile: 'FAST' | 'BALANCED' | 'PREMIUM';
}

export class CreativeDirector {
  /**
   * Phân loại ContentType chính xác từ Prompt và URL
   */
  public static classifyContentType(prompt: string, url?: string): ContentType {
    const text = (prompt + ' ' + (url || '')).toLowerCase();

    if (/(bất động sản|căn hộ|chung cư|nhà đất|biệt thự|vinhomes|đất nền|quy hoạch|mặt bằng|bđs)/i.test(text)) {
      return 'REAL_ESTATE';
    }
    if (/(du lịch|khám phá|điểm đến|thắng cảnh|bãi biển|resort|non nước|check-in|tour|khách sạn)/i.test(text)) {
      return 'TRAVEL';
    }
    if (/(tài chính|chứng khoán|lãi suất|ngân hàng|giá vàng|lạm phát|đầu tư|cổ phiếu|crypto|bitcoin|tiền tệ)/i.test(text)) {
      return 'FINANCE';
    }
    if (/(công nghệ|trí tuệ nhân tạo|ai|chip|bán dẫn|smartphone|laptop|iphone|samsung|gpu|software|lập trình)/i.test(text)) {
      return 'TECH';
    }
    if (/(xe\s*hơi|ô tô|vinfast|xe điện|suv|sedan|động cơ|review xe|giá xe|xe máy)/i.test(text)) {
      return 'PRODUCT';
    }
    if (/(giáo dục|học bổng|kỹ năng|phương pháp|đại học|du học|tư duy|bài học)/i.test(text)) {
      return 'EDUCATION';
    }
    if (/(doanh nghiệp|startup|doanh thu|thị phần|tập đoàn|kinh doanh|ceo|thương trường)/i.test(text)) {
      return 'BUSINESS';
    }
    if (/(tin tức|bản tin|thời sự|sự kiện vừa diễn ra|nóng nhất|chính thức)/i.test(text)) {
      return 'NEWS';
    }
    if (/(lịch sử|thế kỷ|chiến dịch|triều đại|di tích lịch sử|nhân vật lịch sử)/i.test(text)) {
      return 'DOCUMENTARY';
    }
    if (/(top \d+|danh sách|\d+ điều|\d+ lý do|\d+ bí mật)/i.test(text)) {
      return 'LISTICLE';
    }
    if (/(tỉnh|thành phố|quận|huyện|địa danh|xứ sở|vùng đất)/i.test(text)) {
      return 'LOCATION';
    }
    if (/(ẩm thực|cà phê|thời trang|healthy|lối sống|thói quen|chữa lành)/i.test(text)) {
      return 'LIFESTYLE';
    }
    if (/(tại sao|nguyên lý|cơ chế|hoạt động như thế nào|bản chất)/i.test(text)) {
      return 'EXPLAINER';
    }

    return 'EXPLAINER';
  }

  /**
   * Tạo CreativeBrief hoàn chỉnh cho bất kỳ chủ đề nào
   */
  public static createBrief(prompt: string, duration: number, url?: string, profile: 'FAST' | 'BALANCED' | 'PREMIUM' = 'BALANCED'): CreativeBrief {
    const contentType = this.classifyContentType(prompt, url);
    const cleanTopic = prompt
      .replace(/tạo video\s*(?:\d+s|\d+\s*giây)?\s*[:,-]?/gi, '')
      .replace(/(?:về|cho)\s+/gi, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .trim();

    // 1. Xác định Audience & Viewer Promise
    let targetAudience = 'Khán giả đại chúng quan tâm thông tin hữu ích và xu hướng mới trên short-form.';
    let viewerPromise = `Nắm bắt trọn vẹn thông tin đắt giá nhất về ${cleanTopic} trong ${duration} giây mà không mất thời gian tra cứu.`;
    let coreQuestion = `Điều gì làm nên giá trị và sức ảnh hưởng đặc biệt của ${cleanTopic}?`;
    let tone: Tone = 'curious_inspiring';
    let designPreset: CreativeBrief['designPreset'] = 'MODERN';

    switch (contentType) {
      case 'REAL_ESTATE':
        targetAudience = 'Nhà đầu tư, người mua nhà ở thực và giới quan tâm thị trường bất động sản.';
        viewerPromise = `Hiểu rõ vị trí, tiềm năng tăng giá và rủi ro pháp lý/tài chính thực tế của ${cleanTopic}.`;
        coreQuestion = `Có nên đầu tư hay xuống tiền vào ${cleanTopic} ở thời điểm hiện tại?`;
        tone = 'analytical_premium';
        designPreset = 'LUXURY';
        break;
      case 'TRAVEL':
      case 'LOCATION':
        targetAudience = 'Những người đam mê du lịch, khám phá văn hóa, ẩm thực và trải nghiệm địa phương.';
        viewerPromise = `Khám phá các tọa độ đẹp nhất, nét văn hóa độc bản và kinh nghiệm thực tế về ${cleanTopic}.`;
        coreQuestion = `Tại sao ${cleanTopic} lại là điểm đến nhất định phải ghé thăm ít nhất một lần?`;
        tone = 'curious_inspiring';
        designPreset = 'CINEMATIC';
        break;
      case 'FINANCE':
        targetAudience = 'Nhà đầu tư cá nhân, người quản lý tài chính và người theo dõi thị trường vốn.';
        viewerPromise = `Giải mã số liệu, tác động trực tiếp tới túi tiền và chiến lược ứng phó với ${cleanTopic}.`;
        coreQuestion = `Dòng tiền đang chảy về đâu và biến động này ảnh hưởng thế nào đến bạn?`;
        tone = 'analytical_premium';
        designPreset = 'EDITORIAL';
        break;
      case 'TECH':
      case 'PRODUCT':
        targetAudience = 'Người dùng công nghệ, người mua sắm thông thái tìm kiếm đánh giá khách quan.';
        viewerPromise = `Đánh giá chân thực về công năng, trải nghiệm thực tế và so sánh giá trị so với tầm giá của ${cleanTopic}.`;
        coreQuestion = `Sản phẩm này có thực sự vượt trội như quảng cáo hay chỉ là trào lưu?`;
        tone = 'energetic_engaging';
        designPreset = 'TECH';
        break;
      case 'NEWS':
        targetAudience = 'Độc giả theo dõi thời sự nhanh, cần thông tin xác thực và bối cảnh sự việc.';
        viewerPromise = `Cập nhật diễn biến mới nhất, nguyên nhân và tác động cốt lõi của ${cleanTopic}.`;
        coreQuestion = `Bản chất sự việc là gì và điều gì sẽ diễn ra tiếp theo?`;
        tone = 'urgent_authoritative';
        designPreset = 'NEWS';
        break;
      case 'DOCUMENTARY':
        targetAudience = 'Người yêu thích tri thức sâu, lịch sử, các bài học và câu chuyện truyền cảm hứng.';
        viewerPromise = `Lật mở những góc khuất lịch sử và bài học sâu sắc ít người biết về ${cleanTopic}.`;
        coreQuestion = `Sự kiện này đã định hình tiến trình lịch sử ra sao?`;
        tone = 'dramatic_cinematic';
        designPreset = 'DOCUMENTARY';
        break;
      default:
        tone = 'curious_inspiring';
        designPreset = 'MODERN';
        break;
    }

    // 2. Tạo 3 Angle ứng viên (Section 2)
    const allAngles: AngleCandidate[] = [
      {
        id: 'information_first',
        name: 'Trực diện thông tin (Information-First)',
        hookHypothesis: `Toàn cảnh số liệu và sự thật xác thực về ${cleanTopic}.`,
        focus: 'Độ chuẩn xác, số liệu cụ thể, tổng quan rõ ràng và đáng tin cậy.',
        score: contentType === 'NEWS' || contentType === 'FINANCE' ? 95 : 82,
        selectionRationale: 'Phù hợp khi khán giả tìm kiếm câu trả lời nhanh chóng và số liệu chính xác.',
      },
      {
        id: 'curiosity_discovery',
        name: 'Tò mò & Khám phá (Curiosity / Discovery)',
        hookHypothesis: `Những điều bất ngờ đằng sau ${cleanTopic} mà ít người nhận ra.`,
        focus: 'Góc nhìn mới lạ, phá vỡ định kiến thông thường, tạo cảm giác tò mò cao.',
        score: contentType === 'TRAVEL' || contentType === 'TECH' || contentType === 'DOCUMENTARY' ? 96 : 88,
        selectionRationale: 'Tối ưu tỷ lệ giữ chân (retention) và kích thích xem hết video trên TikTok/Reels.',
      },
      {
        id: 'problem_consequence',
        name: 'Vấn đề & Hệ quả (Problem / Consequence)',
        hookHypothesis: `Rủi ro hoặc cơ hội lớn liên quan trực tiếp đến bạn từ ${cleanTopic}.`,
        focus: 'Lợi ích cá nhân, giải quyết nỗi đau hoặc cảnh báo xu hướng cấp thiết.',
        score: contentType === 'REAL_ESTATE' || contentType === 'PRODUCT' ? 94 : 85,
        selectionRationale: 'Tác động trực tiếp vào tâm lý cần ra quyết định và bài toán chi phí/lợi ích.',
      },
    ];

    allAngles.sort((a, b) => b.score - a.score);
    const selectedAngle = allAngles[0];

    return {
      contentType,
      targetAudience,
      viewerPromise,
      coreQuestion,
      tone,
      designPreset,
      storytellingStrategy: `Kể chuyện theo góc nhìn "${selectedAngle.name}", tập trung vào ${selectedAngle.focus}.`,
      visualStrategy: `Sử dụng phong cách ${designPreset}, ưu tiên thực thể xác thực và đồ họa tương phản cao.`,
      pacingStrategy: `Nhịp kể linh hoạt, chuyển beat thông tin mỗi 4-7 giây, 1 câu = 1 ý súc tích.`,
      audioStrategy: `Voiceover ${tone}, BGM hỗ trợ nền nhẹ nhàng, không lấn át lời thoại.`,
      retentionStrategy: `Đặt câu hỏi tò mò ở 3 giây đầu, bổ sung insight bất ngờ ở giữa và payoff thuyết phục ở cuối.`,
      selectedAngle,
      allAngles,
      profile,
    };
  }
}
