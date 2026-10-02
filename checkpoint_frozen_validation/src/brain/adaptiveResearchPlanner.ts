/**
 * ADAPTIVE RESEARCH PLANNER
 * Designs tailored research plans based exclusively on UserIntentSpec & TopicContract.
 * Does NOT force sensationalized / surprise / controversy searches by default.
 */

import {
  UserIntentSpec,
  TopicContract,
  AdaptiveResearchPlan,
} from '../types/universalContracts.js';

export class AdaptiveResearchPlanner {
  /**
   * Constructs an objective, goal-oriented research plan
   */
  public static plan(
    intentSpec: UserIntentSpec,
    topicContract: TopicContract
  ): AdaptiveResearchPlan {
    const subject = topicContract.coreTopic;
    const entities = topicContract.requiredEntities;
    const queries: AdaptiveResearchPlan['queries'] = [];

    // 1. Primary subject query
    queries.push({
      query: `${subject} thông tin chi tiết`,
      purpose: 'Xác minh thông tin cốt lõi về chủ thể chính',
      targetEntity: subject,
    });

    // 2. Domain-specific verification query
    if (intentSpec.contentMode === 'PRODUCT_REVIEW') {
      queries.push({
        query: `${subject} thông số kỹ thuật giá bán thực tế`,
        purpose: 'Tìm kiếm thông số kỹ thuật và dữ liệu kiểm chứng',
        targetEntity: subject,
      });
    } else if (intentSpec.contentMode === 'NEWS') {
      queries.push({
        query: `${subject} tin tức sự kiện mới nhất`,
        purpose: 'Cập nhật diễn biến sự kiện chính thống',
        targetEntity: subject,
      });
    } else if (intentSpec.contentMode === 'TRAVEL_CULTURE') {
      queries.push({
        query: `${subject} địa danh thắng cảnh văn hóa`,
        purpose: 'Tìm kiếm đặc trưng địa lý và di sản văn hóa',
        targetEntity: subject,
      });
    } else if (intentSpec.contentMode === 'EXPLAINER') {
      queries.push({
        query: `${subject} nguyên lý cơ chế hoạt động`,
        purpose: 'Làm rõ bản chất và cơ chế',
        targetEntity: subject,
      });
    }

    // 3. Entity-specific queries (for key named entities)
    entities.slice(0, 2).forEach((ent) => {
      if (ent.toLowerCase() !== subject.toLowerCase()) {
        queries.push({
          query: `${ent} ${subject}`,
          purpose: `Xác minh thực thể liên quan: ${ent}`,
          targetEntity: ent,
        });
      }
    });

    return {
      researchObjectives: [
        `Thu thập sự thật đã kiểm chứng về ${subject}`,
        `Loại trừ mọi thông tin suy đoán hoặc ngoài phạm vi TopicContract`,
      ],
      researchQuestions: [
        topicContract.coreQuestion,
        `Những con số hoặc dữ kiện nào quan trọng nhất người xem cần nắm được?`,
      ],
      entitiesToVerify: entities,
      freshnessNeeds: intentSpec.freshnessRequirement,
      sourcePriorities: ['Nguồn chính thống / Nhà sản xuất', 'Báo chí uy tín', 'Bách khoa toàn thư'],
      stopConditions: [
        'Đã có ít nhất 2 nguồn xác thực độc lập',
        'Đã trích xuất đủ dữ kiện cho thời lượng yêu cầu',
      ],
      queries,
    };
  }
}
