/**
 * PART 7 — KNOWLEDGE BRIEF BUILDER
 * Synthesizes verified facts into a structured creator briefing document.
 * Provides raw material for the ContentStrategist and SeniorScriptWriter without writing the script.
 * Zero research markup or confidence scores are present in the final brief text.
 */

import { ContentBrief, KnowledgeBrief, VerifiedFact } from '../types/contentBrain.js';
import { AntiResearchLeak } from './antiResearchLeak.js';

export class KnowledgeBriefBuilder {
  /**
   * Synthesizes facts and content brief into a comprehensive KnowledgeBrief
   */
  public static build(brief: ContentBrief, facts: VerifiedFact[]): KnowledgeBrief {
    const mainEntity = brief.primaryEntities[0] || brief.topic;
    const cleanTopic = AntiResearchLeak.sanitize(brief.topic);

    const importantFacts: string[] = [];
    const interestingFacts: string[] = [];
    const surprisingFacts: string[] = [];
    const usefulNumbers: string[] = [];
    const visualOpportunities: string[] = [];
    const realWorldAssetsNeeded: string[] = [];
    const factsToAvoid: string[] = [
      'Thông tin suy diễn không có căn cứ số liệu',
      'Đánh giá phóng đại vô căn cứ như "vô cùng tuyệt vời", "đỉnh cao vũ trụ"',
      'Các thông tin thủ tục hành chính, quy trình đăng nhập tài khoản',
    ];

    for (const f of facts) {
      const cleanClaim = AntiResearchLeak.sanitize(f.claim);
      if (!cleanClaim || cleanClaim.length < 25) continue;

      // Extract useful numbers
      const numMatch = cleanClaim.match(/\d+[\d.,]*\s*(?:km\/h|km|triệu|tỷ|usd|\$|w|kw|mah|%|ha|m2|năm|thế kỷ)/i);
      if (numMatch && !usefulNumbers.includes(numMatch[0])) {
        usefulNumbers.push(numMatch[0]);
      }

      if (f.isSensitiveNumber || cleanClaim.includes('kỷ lục') || cleanClaim.includes('đầu tiên')) {
        surprisingFacts.push(cleanClaim);
      } else if (f.relevance >= 90) {
        importantFacts.push(cleanClaim);
      } else {
        interestingFacts.push(cleanClaim);
      }
    }

    // Ensure baseline lists are populated
    if (importantFacts.length === 0 && facts.length > 0) {
      importantFacts.push(AntiResearchLeak.sanitize(facts[0].claim));
    }
    if (importantFacts.length === 0) {
      importantFacts.push(`${cleanTopic} là chủ đề trọng tâm với những đặc điểm và giá trị thực tế nổi bật.`);
    }

    // Formulate viewer questions
    const viewerQuestions: string[] = [
      `Tại sao ${mainEntity} lại thu hút sự chú ý đặc biệt trong cộng đồng?`,
      `Giá trị thực tế và thông số ấn tượng nhất của ${mainEntity} là gì?`,
      `Người xem nhận được bài học hoặc quyết định gì sau khi theo dõi ${mainEntity}?`,
    ];

    // Formulate potential misconceptions
    const potentialMisconceptions: string[] = [
      `Hiểu lầm rằng ${mainEntity} chỉ là giải pháp thông thường mà không thấy sự bứt phá công nghệ/văn hóa.`,
      `Đánh giá phiến diện qua một góc nhìn thay vì toàn cảnh bức tranh thực tế.`,
    ];

    // Formulate visual opportunities & real-world assets needed
    switch (brief.contentType) {
      case 'REAL_PRODUCT':
        visualOpportunities.push(
          `Cận cảnh các góc máy chi tiết của ${mainEntity}, thiết kế khung sườn, động cơ và màn hình`,
          `Góc quay trải nghiệm thực tế trên đường phố hoặc không gian sử dụng hiện đại`,
          `Thẻ đồ họa hiển thị các thông số hiệu năng và giá bán nổi bật`
        );
        realWorldAssetsNeeded.push(
          `Ảnh chụp thực tế góc 3/4 của ${mainEntity}`,
          `Ảnh cận cảnh cụm pin / chi tiết công nghệ chính thức`,
          `Logo hoặc hình ảnh nhận diện thương hiệu chuẩn xác`
        );
        break;

      case 'REAL_LOCATION':
      case 'TRAVEL':
        visualOpportunities.push(
          `Góc máy flycam toàn cảnh thiên nhiên, núi sông hùng vĩ của ${mainEntity}`,
          `Hình ảnh cận cảnh các di tích lịch sử, địa danh văn hóa tiêu biểu`,
          `Bản đồ định vị vệ tinh hoặc đồ họa không gian địa lý trực quan`
        );
        realWorldAssetsNeeded.push(
          `Ảnh phong cảnh thực tế tại địa danh cụ thể của ${mainEntity}`,
          `Ảnh di tích lịch sử / công trình biểu tượng thật`,
          `Hình ảnh văn hóa ẩm thực và đời sống bản địa chuẩn thực thể`
        );
        break;

      default:
        visualOpportunities.push(
          `Đồ họa motion typography và thẻ số liệu kiểm chứng sinh động`,
          `Biểu đồ tiến trình hoặc đồ họa phân tích logic dễ hiểu`,
          `Hình ảnh minh họa có chiều sâu điện ảnh 9:16`
        );
        realWorldAssetsNeeded.push(
          `Hình ảnh tư liệu thực tế liên quan trực tiếp đến ${mainEntity}`
        );
        break;
    }

    const topicSummary = `${cleanTopic} là chủ đề thuộc nhóm ${brief.contentType}, tập trung làm nổi bật bản chất, giá trị thực tế và góc nhìn cốt lõi cho khán giả.`;

    return {
      topicSummary,
      keyEntities: brief.primaryEntities,
      importantFacts: importantFacts.slice(0, 5),
      interestingFacts: interestingFacts.slice(0, 4),
      surprisingFacts: surprisingFacts.slice(0, 3),
      usefulNumbers: usefulNumbers.slice(0, 6),
      viewerQuestions,
      potentialMisconceptions,
      conflictsOrNuances: [],
      visualOpportunities,
      realWorldAssetsNeeded,
      factsToAvoid,
    };
  }
}
