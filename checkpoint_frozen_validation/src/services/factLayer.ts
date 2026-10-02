import { SourceDocument } from './researchEngine.js';

export interface VerifiedFact {
  claim: string;
  evidence: string;
  sourceUrl: string;
  sourceName: string;
  confidence: number; // 0 - 100
  relevance: number;  // 0 - 100
  category: 'location' | 'price' | 'specification' | 'history' | 'culture' | 'statistics' | 'general';
}

export interface FactExtractionResult {
  facts: VerifiedFact[];
  verifiedCount: number;
  rejectedCount: number;
}

export class FactLayer {
  /**
   * Trích xuất các sự thật được kiểm chứng (Verified Facts) từ các nguồn đã phê duyệt
   */
  public static extractFacts(sources: SourceDocument[], coreTopic: string): FactExtractionResult {
    const verifiedFacts: VerifiedFact[] = [];
    let rejectedCount = 0;

    const topicWords = coreTopic.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

    for (const source of sources) {
      if (!source.isApproved) {
        rejectedCount++;
        continue;
      }

      // Duyệt qua từng câu trong cleanedContent
      const sentences = source.cleanedContent
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 30);

      for (const sent of sentences) {
        // Kiểm tra relevance với coreTopic
        const sentLower = sent.toLowerCase();
        const matchesTopic = topicWords.some((w) => sentLower.includes(w));
        let relevance = matchesTopic ? 90 : source.relevanceScore >= 80 ? 80 : 70;

        // Phân loại danh mục của fact
        let category: VerifiedFact['category'] = 'general';
        let confidence = source.relevanceScore;

        if (/(giá|triệu đồng|tỷ đồng|usd|đô la|vnd|chi phí)/i.test(sent)) {
          category = 'price';
          // Với thông tin giá cả, yêu cầu có số liệu cụ thể
          if (!/\d+/.test(sent)) {
            rejectedCount++;
            continue;
          }
          confidence = Math.min(100, confidence + 10);
        } else if (/(diện tích|km2|ha|m2|héc ta|vuông|chiều dài|km\b)/i.test(sent)) {
          category = 'statistics';
          confidence = Math.min(100, confidence + 5);
        } else if (/(nằm ở|tọa lạc|vị trí|phía đông|phía tây|phía nam|phía bắc|giáp|tỉnh|huyện|thành phố)/i.test(sent)) {
          category = 'location';
          relevance = Math.min(100, relevance + 10);
        } else if (/(thế kỷ|năm \d{3,4}|lịch sử|di tích|thời kỳ|nguyễn du|truyền thống)/i.test(sent)) {
          category = 'history';
        } else if (/(đặc sản|ẩm thực|món ăn|danh thắng|bãi biển|núi|hồ|thơ mộng|hùng vĩ)/i.test(sent)) {
          category = 'culture';
        } else if (/(công suất|động cơ|mã lực|pin|dung lượng|màn hình|kích thước|gầm)/i.test(sent)) {
          category = 'specification';
        }

        // Loại bỏ các câu không đủ độ tin cậy hoặc quá chung chung
        if (confidence < 75 || relevance < 75) {
          rejectedCount++;
          continue;
        }

        // Tạo Claim súc tích
        const claim = sent.length > 120 ? sent.slice(0, 117) + '...' : sent;

        // Tránh trùng lặp
        if (!verifiedFacts.some((f) => f.claim === claim || f.evidence.includes(sent.slice(0, 40)))) {
          verifiedFacts.push({
            claim,
            evidence: sent,
            sourceUrl: source.url,
            sourceName: source.sourceName,
            confidence,
            relevance,
            category,
          });
        }
      }
    }

    // Nếu chưa trích xuất được fact theo danh mục đặc thù, trích xuất câu mô tả chủ đề từ nguồn đã duyệt
    if (verifiedFacts.length === 0 && sources.length > 0) {
      const coreTopicLower = coreTopic.toLowerCase();
      for (const source of sources) {
        if (!source.isApproved) continue;
        const sentences = source.cleanedContent
          .split(/(?<=[.?!:\n])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 25 && s.length <= 250);

        for (const sent of sentences) {
          const sentLower = sent.toLowerCase();
          if (
            sentLower.includes(coreTopicLower) ||
            topicWords.some((w) => sentLower.includes(w))
          ) {
            const claim = sent.length > 120 ? sent.slice(0, 117) + '...' : sent;
            verifiedFacts.push({
              claim,
              evidence: sent,
              sourceUrl: source.url,
              sourceName: source.sourceName,
              confidence: 85,
              relevance: 85,
              category: 'general',
            });
            if (verifiedFacts.length >= 3) break;
          }
        }
        if (verifiedFacts.length > 0) break;
      }

      // Nếu vẫn chưa có fact nào, lấy các câu hoàn chỉnh đầu tiên từ nguồn đã phê duyệt
      if (verifiedFacts.length === 0) {
        for (const source of sources) {
          if (!source.isApproved) continue;
          const sentences = source.cleanedContent
            .split(/(?<=[.?!:\n])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length >= 30 && s.length <= 220);

          for (const sent of sentences) {
            const claim = sent.length > 120 ? sent.slice(0, 117) + '...' : sent;
            verifiedFacts.push({
              claim,
              evidence: sent,
              sourceUrl: source.url,
              sourceName: source.sourceName,
              confidence: 80,
              relevance: 80,
              category: 'general',
            });
            if (verifiedFacts.length >= 2) break;
          }
          if (verifiedFacts.length > 0) break;
        }
      }
    }

    // Sắp xếp các fact theo relevance và confidence
    verifiedFacts.sort((a, b) => b.confidence + b.relevance - (a.confidence + a.relevance));

    console.log(`📊 [FactLayer] Đã xác minh ${verifiedFacts.length} sự thật có nguồn kiểm chứng (Loại bỏ ${rejectedCount} thông tin chưa rõ ràng).`);

    return {
      facts: verifiedFacts,
      verifiedCount: verifiedFacts.length,
      rejectedCount,
    };
  }

  /**
   * Tạo tóm tắt ngữ cảnh chuẩn cho Writer CHỈ DỰA TRÊN FACTS ĐƯỢC DUYỆT (Không chứa research metadata)
   */
  public static buildApprovedContext(facts: VerifiedFact[]): string {
    if (facts.length === 0) return '';
    return facts
      .map((f) => f.evidence.trim())
      .filter(Boolean)
      .join('\n\n');
  }
}
