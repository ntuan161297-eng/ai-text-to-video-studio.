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
   * Strictly enforces topic anchoring to prevent homonym drift.
   */
  public static plan(
    intentSpec: UserIntentSpec,
    topicContract: TopicContract
  ): AdaptiveResearchPlan {
    const subject = topicContract.coreTopic;
    const entities = topicContract.requiredEntities;
    const queries: AdaptiveResearchPlan['queries'] = [];

    // Helper to test if a query preserves the core topic anchor
    const isTopicAnchored = (q: string): boolean => {
      const qLower = q.toLowerCase();
      const subjectLower = subject.toLowerCase();
      if (qLower.includes(subjectLower)) return true;
      // If subject is multi-word, check if at least 2 key words are present
      const subWords = subjectLower.split(/\s+/).filter((w) => w.length >= 3);
      if (subWords.length >= 2) {
        const matchCount = subWords.filter((w) => qLower.includes(w)).length;
        if (matchCount >= 2) return true;
      }
      return false;
    };

    // 1. Primary subject query (Complete semantic phrase)
    queries.push({
      query: `"${subject}" thông tin chính thống`,
      purpose: `Xác minh thông tin cốt lõi về ${subject}`,
      targetEntity: subject,
      isTopicAnchored: true,
    });

    // 2. Domain-specific verification query (Always anchored with subject)
    if (intentSpec.contentMode === 'PRODUCT_REVIEW') {
      queries.push({
        query: `"${subject}" thông số kỹ thuật thực tế`,
        purpose: 'Tìm kiếm thông số kỹ thuật và dữ liệu kiểm chứng',
        targetEntity: subject,
        isTopicAnchored: true,
      });
    } else if (intentSpec.contentMode === 'NEWS') {
      queries.push({
        query: `"${subject}" diễn biến sự kiện`,
        purpose: 'Cập nhật diễn biến sự kiện chính thống',
        targetEntity: subject,
        isTopicAnchored: true,
      });
    } else if (intentSpec.contentMode === 'TRAVEL_CULTURE') {
      queries.push({
        query: `"${subject}" lịch sử đặc trưng văn hóa`,
        purpose: 'Tìm kiếm đặc trưng di sản văn hóa và bối cảnh',
        targetEntity: subject,
        isTopicAnchored: true,
      });
    } else if (intentSpec.contentMode === 'EXPLAINER') {
      queries.push({
        query: `"${subject}" nguyên lý cơ chế`,
        purpose: 'Làm rõ bản chất và cơ chế hoạt động',
        targetEntity: subject,
        isTopicAnchored: true,
      });
    } else {
      queries.push({
        query: `"${subject}" dữ liệu tổng quan`,
        purpose: `Thu thập dữ liệu tổng quan chính xác về ${subject}`,
        targetEntity: subject,
        isTopicAnchored: true,
      });
    }

    // 3. Entity-specific queries (STRICTLY anchored to subject to prevent homonym traps)
    const dangerousHomonyms = new Set(['cách', 'nghệ', 'tại', 'sao', 'làm', 'phần', 'hành']);
    entities.slice(0, 2).forEach((ent) => {
      const entClean = ent.trim();
      const entLower = entClean.toLowerCase();
      // Skip dangerous single-word ambiguous tokens that trigger homonym drift
      if (dangerousHomonyms.has(entLower) || entClean.length < 3) return;

      if (entLower !== subject.toLowerCase()) {
        const queryStr = `"${subject}" "${entClean}"`;
        if (isTopicAnchored(queryStr)) {
          queries.push({
            query: queryStr,
            purpose: `Xác minh thực thể liên quan: ${entClean} trong phạm vi ${subject}`,
            targetEntity: entClean,
            isTopicAnchored: true,
          });
        }
      }
    });

    return {
      originalUserRequest: intentSpec.originalUserRequest,
      primaryTopic: subject,
      topicFingerprint: topicContract.topicFingerprint || [subject.toLowerCase()],
      isTopicAnchored: true,
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
