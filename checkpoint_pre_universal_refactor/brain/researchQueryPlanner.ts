/**
 * PART 2 — RESEARCH QUERY PLANNER
 * Generates purposeful, multi-intent search queries based on the ContentBrief.
 * Avoids single generic query searches and plans for facts, entities, and visual sources.
 */

import { ContentBrief, ResearchQueryPlan, PlannedQuery } from '../types/contentBrain.js';

export class ResearchQueryPlanner {
  /**
   * Plans multi-intent search queries for a given ContentBrief
   */
  public static plan(brief: ContentBrief): ResearchQueryPlan {
    const topic = brief.topic.trim();
    const mainEntity = brief.primaryEntities[0] || topic;
    const entities = brief.primaryEntities;

    const coreQuestions: string[] = [
      `${mainEntity} là gì và có điểm gì nổi bật nhất?`,
      `Tại sao ${mainEntity} lại được quan tâm hiện nay?`,
    ];

    const subQuestions: string[] = [
      `Thông số hoặc dữ liệu cốt lõi của ${mainEntity} là gì?`,
      `Ưu điểm, nhược điểm hoặc góc nhìn đa chiều về ${mainEntity}?`,
    ];

    const factsToVerify: string[] = [
      'Nguồn gốc, thời điểm ra mắt hoặc thành lập chính xác',
      'Số liệu định lượng (giá bán, dung lượng, diện tích, quy mô, thành tích)',
      'Tổ chức, người sáng lập hoặc cơ quan chủ quản',
    ];

    const visualAssetsToFind: string[] = [
      `Hình ảnh chính thức, thực tế chất lượng cao của ${mainEntity}`,
      `Góc máy chi tiết sản phẩm, công trình hoặc chân dung nhân vật`,
    ];

    const queries: PlannedQuery[] = [];

    // 1. DISCOVERY Query
    queries.push({
      query: `${topic} thông tin chi tiết`,
      purpose: 'DISCOVERY',
      targetEntity: mainEntity,
    });

    // 2. OFFICIAL Query
    queries.push({
      query: `${mainEntity} chính thức trang chủ`,
      purpose: 'OFFICIAL',
      targetEntity: mainEntity,
    });

    // 3. Category-specific queries
    switch (brief.contentType) {
      case 'REAL_PRODUCT':
        queries.push({
          query: `${mainEntity} thông số kỹ thuật giá bán`,
          purpose: 'FACT_CHECK',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} đánh giá thực tế ưu nhược điểm`,
          purpose: 'DISCOVERY',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} ảnh chụp thực tế official`,
          purpose: 'VISUAL_SOURCE',
          targetEntity: mainEntity,
        });
        break;

      case 'REAL_LOCATION':
      case 'TRAVEL':
        queries.push({
          query: `${mainEntity} vị trí địa lý di tích danh thắng nổi tiếng`,
          purpose: 'FACT_CHECK',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} văn hóa đặc sản trải nghiệm`,
          purpose: 'DISCOVERY',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} phong cảnh đẹp flycam 4k`,
          purpose: 'VISUAL_SOURCE',
          targetEntity: mainEntity,
        });
        break;

      case 'REAL_PERSON':
        queries.push({
          query: `${mainEntity} tiểu sử sự nghiệp thành tựu`,
          purpose: 'FACT_CHECK',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} sự kiện mới nhất phát biểu`,
          purpose: 'RECENT_NEWS',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} chân dung sự kiện thực tế`,
          purpose: 'VISUAL_SOURCE',
          targetEntity: mainEntity,
        });
        break;

      case 'FINANCE':
      case 'BUSINESS':
        queries.push({
          query: `${mainEntity} báo cáo doanh thu số liệu thị phần`,
          purpose: 'FACT_CHECK',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} xu hướng tác động thị trường`,
          purpose: 'DISCOVERY',
          targetEntity: mainEntity,
        });
        break;

      case 'NEWS':
      case 'CURRENT_EVENT':
        queries.push({
          query: `${mainEntity} diễn biến mới nhất hôm nay`,
          purpose: 'RECENT_NEWS',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} thông cáo chính thức kết luận`,
          purpose: 'FACT_CHECK',
          targetEntity: mainEntity,
        });
        break;

      default:
        queries.push({
          query: `${mainEntity} giải thích nguyên lý bản chất`,
          purpose: 'FACT_CHECK',
          targetEntity: mainEntity,
        });
        queries.push({
          query: `${mainEntity} hình ảnh minh họa infographic`,
          purpose: 'VISUAL_SOURCE',
          targetEntity: mainEntity,
        });
        break;
    }

    // 4. Freshness Query if needed
    if (brief.freshnessRequirement === 'LATEST' || brief.freshnessRequirement === 'RECENT') {
      queries.push({
        query: `${mainEntity} mới nhất 2026`,
        purpose: 'RECENT_NEWS',
        targetEntity: mainEntity,
      });
    }

    return {
      coreQuestions,
      subQuestions,
      entities,
      factsToVerify,
      visualAssetsToFind,
      queries,
    };
  }
}
