/**
 * ENTITY & REAL-WORLD VISUAL GROUNDING (Section 5)
 * Định danh thực thể thật, chấm điểm độ xác thực và cung cấp cơ chế fallback an toàn
 */

export type EntityClassification =
  | 'REAL_LOCATION'
  | 'REAL_PERSON'
  | 'REAL_COMPANY'
  | 'REAL_PRODUCT'
  | 'REAL_EVENT'
  | 'DATA_VISUAL'
  | 'CONCEPTUAL'
  | 'ILLUSTRATIVE';

export interface VisualGroundingResult {
  sceneId: number;
  entityName: string;
  classification: EntityClassification;
  semanticRelevance: number; // 0 - 100
  entityAuthenticity: number; // 0 - 100
  isAuthenticAssetApproved: boolean;
  chosenVisualStrategy: 'authentic_media' | 'map' | 'chart' | 'typography' | 'diagram' | 'neutral_illustration';
  assetUrl?: string;
  fallbackReason?: string;
}

export class EntityGroundingEngine {
  /**
   * Phân loại thực thể của phân cảnh dựa trên nội dung câu thoại và từ khoá
   */
  public static classifyEntity(sceneText: string, coreTopic: string): {
    classification: EntityClassification;
    detectedEntity: string;
  } {
    const text = (sceneText + ' ' + coreTopic).toLowerCase();

    if (/(tỉnh|thành phố|quận|huyện|bãi biển|vịnh|đảo|núi|chùa|nhà thờ|khu du lịch|địa danh|hà tĩnh|đà lạt|nha trang|phú quốc|hạ long|sapa)/i.test(text)) {
      return { classification: 'REAL_LOCATION', detectedEntity: coreTopic };
    }
    if (/(xe\s*hơi|ô tô|vinfast|iphone|macbook|samsung|smartphone|thiết bị|sản phẩm|mẫu xe|chiếc xe)/i.test(text)) {
      return { classification: 'REAL_PRODUCT', detectedEntity: coreTopic };
    }
    if (/(tập đoàn|công ty|doanh nghiệp|ngân hàng|shopee|vinfast|vingroup|apple|google|microsoft)/i.test(text)) {
      return { classification: 'REAL_COMPANY', detectedEntity: coreTopic };
    }
    if (/(ông|bà|chủ tịch|ceo|bác|tác giả|nguyễn du|nhà khoa học|chuyên gia|cầu thủ)/i.test(text)) {
      return { classification: 'REAL_PERSON', detectedEntity: coreTopic };
    }
    if (/(triển lãm|hội nghị|trận đấu|chung kết|sự kiện|lễ hội|kỷ niệm|bầu cử)/i.test(text)) {
      return { classification: 'REAL_EVENT', detectedEntity: coreTopic };
    }
    if (/(doanh thu|lãi suất|tăng trưởng|thống kê|phần trăm|%|tỷ đồng|triệu|con số|chỉ số)/i.test(text)) {
      return { classification: 'DATA_VISUAL', detectedEntity: 'Thống kê số liệu' };
    }

    return { classification: 'CONCEPTUAL', detectedEntity: coreTopic };
  }

  /**
   * Thẩm định độ phù hợp và xác thực của tài nguyên hình ảnh (Section 5)
   */
  public static evaluateAssetGrounding(
    sceneId: number,
    sceneText: string,
    coreTopic: string,
    candidateAssetUrl?: string,
    isDirectArticleAsset = false
  ): VisualGroundingResult {
    const { classification, detectedEntity } = this.classifyEntity(sceneText, coreTopic);

    // Tính điểm Semantic Relevance & Entity Authenticity
    let semanticRelevance = 80;
    let entityAuthenticity = 50;

    if (candidateAssetUrl) {
      if (isDirectArticleAsset) {
        semanticRelevance = 95;
        entityAuthenticity = 95;
      } else if (candidateAssetUrl.includes('wikimedia.org') || candidateAssetUrl.includes('unsplash.com')) {
        semanticRelevance = 90;
        entityAuthenticity = 85;
      }
    }

    // Tiêu chuẩn duyệt: Cả hai điểm phải >= 75 đối với thực thể thực
    const isAuthenticAssetApproved =
      Boolean(candidateAssetUrl) &&
      semanticRelevance >= 75 &&
      entityAuthenticity >= 75;

    let chosenVisualStrategy: VisualGroundingResult['chosenVisualStrategy'] = 'authentic_media';
    let fallbackReason: string | undefined = undefined;

    if (!isAuthenticAssetApproved) {
      // Cơ chế Graceful Fallback (Section 5 & 22)
      if (classification === 'REAL_LOCATION') {
        chosenVisualStrategy = 'map';
        fallbackReason = 'Không tìm thấy ảnh thực tế xác thực 100%, chuyển sang bản đồ vị trí địa lý hoặc đồ họa cảnh quan.';
      } else if (classification === 'DATA_VISUAL') {
        chosenVisualStrategy = 'chart';
        fallbackReason = 'Dữ liệu số liệu ưu tiên hiển thị biểu đồ/đồ thị thay vì ảnh minh họa trừu tượng.';
      } else if (classification === 'REAL_PRODUCT' || classification === 'REAL_COMPANY') {
        chosenVisualStrategy = 'typography';
        fallbackReason = 'Tránh dùng hình ảnh AI giả mạo sản phẩm, ưu tiên Kinetic Typography và thẻ thông số kỹ thuật.';
      } else {
        chosenVisualStrategy = 'neutral_illustration';
        fallbackReason = 'Sử dụng đồ họa trung tính chuyên nghiệp.';
      }
    }

    return {
      sceneId,
      entityName: detectedEntity,
      classification,
      semanticRelevance,
      entityAuthenticity,
      isAuthenticAssetApproved,
      chosenVisualStrategy,
      assetUrl: isAuthenticAssetApproved ? candidateAssetUrl : undefined,
      fallbackReason,
    };
  }
}
