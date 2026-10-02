/**
 * PART 8 — DIGITAL CONTENT STRATEGIST
 * Formulates the strategic foundation of the video before any scriptwriting begins.
 * Synthesizes viewer problem, viewer promise, emotional direction, and main takeaway.
 * Enforces rule: A video without a clear viewer promise is strictly barred from proceeding.
 */

import { AudienceStrategy, ContentBrief, KnowledgeBrief } from '../types/contentBrain.js';
import { AntiResearchLeak } from './antiResearchLeak.js';

export class ContentStrategist {
  /**
   * Crafts the strategic audience blueprint for the video
   */
  public static formulateStrategy(
    brief: ContentBrief,
    knowledge: KnowledgeBrief
  ): AudienceStrategy {
    const mainEntity = brief.primaryEntities[0] || brief.topic;
    const cleanTopic = AntiResearchLeak.sanitize(brief.topic);

    let viewerProblem = '';
    let viewerPromise = '';
    let mainTakeaway = '';
    let emotionalDirection = '';
    let contentDepth = '';
    let storyOpportunity = '';

    switch (brief.contentType) {
      case 'REAL_PRODUCT':
        viewerProblem = `Người xem băn khoăn liệu ${mainEntity} có thực sự đáng tiền và vượt trội như quảng cáo hay không.`;
        viewerPromise = `Làm rõ toàn bộ ưu điểm thực tế, thông số cốt lõi và giá trị sử dụng thật sự của ${mainEntity} trong ${brief.targetDuration} giây.`;
        mainTakeaway = `${mainEntity} là minh chứng rõ ràng cho bước tiến công nghệ mới, giải quyết trọn vẹn bài toán hiệu năng và chi phí.`;
        emotionalDirection = 'Hào hứng, tin cậy, thực tế và thuyết phục.';
        contentDepth = 'Tập trung vào thông số kỹ thuật đã kiểm chứng kết hợp trải nghiệm thực tế.';
        storyOpportunity = `Đối chiếu giữa kỳ vọng thông thường và kết quả vận hành ấn tượng của ${mainEntity}.`;
        break;

      case 'REAL_LOCATION':
      case 'TRAVEL':
        viewerProblem = `Người xem thường chỉ biết về ${cleanTopic} qua vài thông tin khái quát mà chưa thấy được nét độc đáo và vẻ đẹp thực sự.`;
        viewerPromise = `Mở ra bức tranh toàn cảnh sống động về vẻ đẹp thiên nhiên, bề dày lịch sử và linh hồn văn hóa của ${cleanTopic}.`;
        mainTakeaway = `${cleanTopic} không chỉ là điểm đến địa lý, mà là vùng đất giàu bản sắc văn hóa và tiềm năng bứt phá mạnh mẽ.`;
        emotionalDirection = 'Tự hào, trầm trồ, giàu cảm hứng khám phá.';
        contentDepth = 'Kết hợp giữa cảnh quan biểu tượng và chiều sâu lịch sử văn hóa con người.';
        storyOpportunity = `Dẫn dắt khán giả từ những góc nhìn bất ngờ đến sự gắn kết cảm xúc sâu sắc với vùng đất.`;
        break;

      case 'FINANCE':
      case 'BUSINESS':
        viewerProblem = `Người xem ngập trong biển số liệu phức tạp và khó nhận diện xu hướng tài chính cốt lõi ảnh hưởng trực tiếp tới mình.`;
        viewerPromise = `Bóc tách các chỉ số tài chính then chốt và chỉ rõ tác động thực tế của ${cleanTopic} trong ${brief.targetDuration} giây.`;
        mainTakeaway = `Nắm bắt quy luật vận động của dòng tiền và đưa ra quyết định dựa trên dữ liệu thực tế thay vì cảm tính.`;
        emotionalDirection = 'Sắc sảo, tỉnh táo, thực dụng và bản lĩnh.';
        contentDepth = 'Phân tích nguyên nhân - kết quả và ý nghĩa thực tế của số liệu.';
        storyOpportunity = `Chuyển hóa dữ liệu khô khan thành góc nhìn chiến lược sắc bén.`;
        break;

      case 'TECH':
      case 'EXPLAINER':
        viewerProblem = `Khái niệm về ${cleanTopic} thường bị giải thích quá trừu tượng hoặc hàn lâm khiến người xem khó hình dung.`;
        viewerPromise = `Giải mã trọn vẹn bản chất và cơ chế hoạt động của ${cleanTopic} một cách trực quan, dễ hiểu ngay lập tức.`;
        mainTakeaway = `Hiểu rõ nguyên lý cốt lõi giúp người xem làm chủ công nghệ và đón đầu làn sóng phát triển.`;
        emotionalDirection = 'Tò mò, bất ngờ, khai sáng và hào hứng.';
        contentDepth = 'Trực quan hóa nguyên lý thành các bước tư duy logic.';
        storyOpportunity = `Đập tan những ngộ nhận phổ biến để làm sáng tỏ bản chất sự thật.`;
        break;

      default:
        viewerProblem = `Người xem cần một góc nhìn cô đọng, mới mẻ và có giá trị thực tế về ${cleanTopic}.`;
        viewerPromise = `Cung cấp thông tin giá trị nhất và góc nhìn sâu sắc về ${cleanTopic} trong ${brief.targetDuration} giây ngắn gọn.`;
        mainTakeaway = `Mỗi thông tin đều mang lại giá trị thực chứng và mở rộng hiểu biết cho người xem.`;
        emotionalDirection = 'Lôi cuốn, truyền cảm hứng và đáng nhớ.';
        contentDepth = 'Chọn lọc thông tin đắt giá nhất, lược bỏ mọi chi tiết thừa.';
        storyOpportunity = `Xây dựng mạch tiến trình từ tò mò ban đầu đến thỏa mãn ở kết luận.`;
        break;
    }

    if (!viewerPromise || viewerPromise.trim().length < 15) {
      throw new Error(`[ContentStrategist] Video không có viewerPromise rõ ràng. Không được phép viết script.`);
    }

    return {
      targetAudience: brief.targetAudience,
      viewerProblem,
      viewerPromise,
      mainTakeaway,
      emotionalDirection,
      contentDepth,
      storyOpportunity,
    };
  }
}
