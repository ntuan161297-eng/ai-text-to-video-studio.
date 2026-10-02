/**
 * ADAPTIVE RESEARCH PLANNER
 * Designs tailored, topic-anchored research plans based on UserIntentSpec & TopicContract.
 * Strictly adheres to Semantic Query Contract:
 * - Decomposes requests into targeted, meaningful queries (3-6 words).
 * - Forbids isolated single-token splits ("Phân", "Một", "Quy", "Hương", "Kiệt", etc.).
 * - Anchors every query to coreTopic or requiredEntities.
 */

import { AIProviderManager } from '../ai/aiProviderManager.js';
import {
  UserIntentSpec,
  TopicContract,
  AdaptiveResearchPlan,
  SemanticResearchQuery,
} from '../types/universalContracts.js';

export class AdaptiveResearchPlanner {
  private static readonly AMBIGUOUS_SINGLE_TOKENS = new Set([
    'phân', 'một', 'quy', 'hương', 'kiệt', 'cách', 'nghệ', 'tại', 'sao', 'làm',
    'phần', 'hành', 'những', 'điều', 'ngày', 'năm', 'thế', 'khi', 'nơi', 'việc',
    'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười', 'được', 'cho',
  ]);

  /**
   * Constructs an objective, goal-oriented research plan
   */
  public static async plan(
    intentSpec: UserIntentSpec,
    topicContract: TopicContract
  ): Promise<AdaptiveResearchPlan> {
    const rawSubject = topicContract.coreTopic || intentSpec.primarySubject;
    const conciseSubject = this.extractConciseSubject(rawSubject, intentSpec.originalUserRequest);
    const entitiesInput = [
      ...(topicContract.requiredEntities || []),
      ...((topicContract as any).primaryEntities || []),
      ...((intentSpec as any).productionDirectives?.priorityEntities || []),
      ...((intentSpec as any).priorityEntities || [])
    ];
    const validEntities = this.filterMeaningfulEntities(entitiesInput, conciseSubject);

    const researchObjectives = [
      `Xác minh sự thật và số liệu kiểm chứng về ${conciseSubject}`,
      `Làm rõ các đặc trưng, cơ chế hoặc diễn biến thực tế liên quan đến ${conciseSubject}`,
      `Loại trừ mọi thông tin suy đoán, sai lệch bối cảnh hoặc ngoài phạm vi yêu cầu`,
    ];

    let queries: SemanticResearchQuery[] = [];

    // Attempt semantic query decomposition via configured AIProviderManager if available
    try {
      const llmQueries = await this.decomposeViaLLM(
        intentSpec.originalUserRequest,
        conciseSubject,
        validEntities
      );
      if (llmQueries.length >= 2) {
        queries = llmQueries.filter((q) => this.validateQuery(q, conciseSubject, validEntities));
      }
    } catch (err: any) {
      console.warn(`[AdaptiveResearchPlanner] LLM decomposition failed (${err.message}). Using deterministic semantic decomposition.`);
    }

    // Deterministic semantic decomposition fallback (guarantees zero single-token loss)
    if (queries.length < 2) {
      queries = this.decomposeDeterministically(
        intentSpec,
        topicContract,
        conciseSubject,
        validEntities,
        researchObjectives
      );
    }

    return {
      originalUserRequest: intentSpec.originalUserRequest,
      primaryTopic: conciseSubject,
      topicFingerprint: topicContract.topicFingerprint || [conciseSubject.toLowerCase()],
      isTopicAnchored: true,
      researchObjectives,
      researchQuestions: [
        topicContract.coreQuestion,
        `Những con số hoặc dữ kiện nào quan trọng nhất người xem cần nắm được về ${conciseSubject}?`,
      ],
      entitiesToVerify: validEntities,
      freshnessNeeds: intentSpec.freshnessRequirement,
      sourcePriorities: ['Nguồn chính thống / Nhà sản xuất', 'Báo chí uy tín', 'Bách khoa toàn thư'],
      stopConditions: [
        'Đã có ít nhất 2 nguồn xác thực độc lập',
        'Đã trích xuất đủ dữ kiện cho thời lượng yêu cầu',
      ],
      queries,
    };
  }

  /**
   * Deterministic semantic decomposition into primary, entity, and subtopic queries
   */
  private static decomposeDeterministically(
    intentSpec: UserIntentSpec,
    topicContract: TopicContract,
    conciseSubject: string,
    validEntities: string[],
    researchObjectives: string[]
  ): SemanticResearchQuery[] {
    const list: SemanticResearchQuery[] = [];

    // 1. Primary Subject Query: Natural, unquoted phrase optimized for search engines (3-6 words)
    list.push({
      query: `${conciseSubject} thông tin chi tiết`,
      purpose: `Xác minh thông tin cốt lõi về ${conciseSubject}`,
      targetEntity: validEntities[0] || conciseSubject,
      researchObjectiveId: 'obj_1',
      topicAnchor: conciseSubject,
      expectedInformation: 'Tổng quan và bản chất cốt lõi',
      isTopicAnchored: true,
    });

    // 2. Entity Query: Anchored to valid multi-word entities
    if (validEntities.length > 0) {
      for (let idx = 0; idx < Math.min(validEntities.length, 3); idx++) {
        const entity = validEntities[idx];
        const entityQueryStr = `${entity} ${conciseSubject.split(/\s+/).slice(0, 3).join(' ')}`.trim();
        list.push({
          query: entityQueryStr,
          purpose: `Xác thực thông tin thực thể: ${entity}`,
          targetEntity: entity,
          researchObjectiveId: `obj_ent_${idx + 1}`,
          topicAnchor: conciseSubject,
          expectedInformation: `Dữ liệu thực tế của ${entity}`,
          isTopicAnchored: true,
        });
      }
    }

    // 3. Subtopic / Technical verification query based on content mode
    let modeSuffix = 'nguyên lý cơ chế';
    if (intentSpec.contentMode === 'PRODUCT_REVIEW') modeSuffix = 'đánh giá thông số kỹ thuật';
    else if (intentSpec.contentMode === 'NEWS') modeSuffix = 'tin tức diễn biến mới nhất';
    else if (intentSpec.contentMode === 'TRAVEL_CULTURE') modeSuffix = 'địa điểm lịch sử văn hóa';
    else if (intentSpec.contentMode === 'EXPLAINER') modeSuffix = 'giải thích cơ chế hoạt động';

    const subtopicQueryStr = `${conciseSubject.split(/\s+/).slice(0, 4).join(' ')} ${modeSuffix}`;
    list.push({
      query: subtopicQueryStr.trim(),
      purpose: `Thu thập dữ liệu chuyên sâu về ${conciseSubject}`,
      targetEntity: validEntities[0] || conciseSubject,
      researchObjectiveId: 'obj_3',
      topicAnchor: conciseSubject,
      expectedInformation: 'Thông số và phân tích chi tiết',
      isTopicAnchored: true,
    });

    return list;
  }

  /**
   * Extracts clean, concise core subject phrase (3-7 words) from potentially verbose prompt
   */
  public static extractConciseSubject(rawSubject: string, originalPrompt: string): string {
    let s = (rawSubject || originalPrompt || '').trim();

    // Remove procedural command prefixes
    s = s.replace(
      /^(?:giải thích|phân tích|hướng dẫn|đánh giá|giới thiệu|khám phá|tìm hiểu|chia sẻ|so sánh|kể về|bàn về|tìm kiếm|xem xét)\s+(?:nguyên lý|mô hình|phương pháp|kiến trúc|cơ chế|chi tiết|bài toán|dự án|về|câu chuyện|bí ẩn|kiệt tác|hiện tượng|lịch sử)?\s*/gi,
      ''
    );
    s = s.replace(/^(?:một ngày làm việc nghẹt thở của|những điều chưa biết về|tất tần tật về)\s*/gi, '');

    // If prompt has colon or em-dash, the main subject is usually in the first clause
    const parts = s.split(/[:–—]/);
    if (parts.length > 1 && parts[0].trim().split(/\s+/).length >= 2) {
      s = parts[0].trim();
    }

    // Clean extraneous punctuation
    s = s.replace(/['"“”‘’]/g, '').trim();

    // Ensure it's not excessively long (max 7 meaningful words)
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length > 7) {
      s = words.slice(0, 7).join(' ');
    }

    return s.trim() || rawSubject;
  }

  /**
   * Filters entities to strictly exclude single-token ambiguous syllables and noise
   */
  public static filterMeaningfulEntities(entities: string[], coreSubject: string): string[] {
    const filtered: string[] = [];

    for (const ent of entities || []) {
      const clean = ent.replace(/['"“”‘’]/g, '').trim();
      const lower = clean.toLowerCase();

      // Reject single-character or dangerous single homonym tokens
      if (clean.length < 3 || this.AMBIGUOUS_SINGLE_TOKENS.has(lower)) {
        continue;
      }

      // If it's a single word, must be at least 4 letters or recognized capitalized brand/acronym
      const words = clean.split(/\s+/);
      if (words.length === 1 && clean.length < 4 && !/^[A-Z0-9-]{3,}$/.test(clean)) {
        continue;
      }

      if (!filtered.includes(clean)) {
        filtered.push(clean);
      }
    }

    // If no multi-word entity was found, derive one from the coreSubject
    if (filtered.length === 0 && coreSubject) {
      const words = coreSubject.split(/\s+/);
      if (words.length >= 2) {
        filtered.push(words.slice(0, Math.min(words.length, 4)).join(' '));
      }
    }

    return filtered;
  }

  /**
   * Validates query against Semantic Query Contract
   */
  public static validateQuery(
    queryObj: SemanticResearchQuery,
    coreSubject: string,
    validEntities: string[]
  ): boolean {
    const text = (queryObj.query || '').trim();
    const words = text.split(/\s+/).filter(Boolean);

    // Rule 1: Query must contain at least 2 words and at least 6 characters
    if (words.length < 2 || text.length < 6) {
      return false;
    }

    // Rule 2: Query must not be an isolated ambiguous token
    if (words.length === 1 && this.AMBIGUOUS_SINGLE_TOKENS.has(text.toLowerCase())) {
      return false;
    }

    // Rule 3: Query must anchor to coreSubject or at least one valid entity
    const textLower = text.toLowerCase();
    const subjectWords = coreSubject.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    const hasSubjectOverlap = subjectWords.some((sw) => textLower.includes(sw));
    const hasEntityOverlap = validEntities.some((ve) => textLower.includes(ve.toLowerCase()));

    return hasSubjectOverlap || hasEntityOverlap;
  }

  /**
   * Calls AIProviderManager to decompose complex prompt into 3 concise search queries
   */
  private static async decomposeViaLLM(
    originalPrompt: string,
    coreSubject: string,
    validEntities: string[]
  ): Promise<SemanticResearchQuery[]> {
    const systemPrompt = `Bạn là chuyên gia phân rã truy vấn nghiên cứu (Search Query Decomposition) cho công cụ tìm kiếm web (Google/Bing).
Nhiệm vụ: Phân rã yêu cầu người dùng thành 3 câu truy vấn tìm kiếm tự nhiên, súc tích (mỗi truy vấn từ 3 đến 6 từ), tập trung chính xác vào thực thể và thông tin cần kiểm chứng.
Yêu cầu bắt buộc:
1. KHÔNG dùng từ đơn lẻ (ví dụ: cấm dùng "Phân", "Một", "Quy", "Hương", "Kiệt").
2. Mỗi câu truy vấn phải chứa tên chủ đề hoặc thực thể chính.
3. Không để trong dấu ngoặc kép toàn bộ câu.
4. Trả về đúng định dạng JSON:
[
  { "query": "truy vấn 1", "purpose": "mục đích", "targetEntity": "thực thể" },
  { "query": "truy vấn 2", "purpose": "mục đích", "targetEntity": "thực thể" },
  { "query": "truy vấn 3", "purpose": "mục đích", "targetEntity": "thực thể" }
]`;

    const userMessage = `Yêu cầu: "${originalPrompt}"
Chủ đề cốt lõi: "${coreSubject}"
Thực thể liên quan: ${validEntities.join(', ') || 'Chưa xác định'}`;

    const rawResponse = await AIProviderManager.executePrompt(
      {
        jobId: `decomp_${Date.now()}`,
        systemPrompt,
        userPrompt: userMessage,
        temperature: 0.1,
        jsonMode: true,
      },
      'research_decomposition'
    );

    let raw = rawResponse.trim();
    if (raw.startsWith('```json')) {
      raw = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (raw.startsWith('```')) {
      raw = raw.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed.queries || parsed.items || [];
    return list.map((item: any, idx: number) => ({
      query: String(item.query || '').trim(),
      purpose: String(item.purpose || `Mục tiêu nghiên cứu ${idx + 1}`),
      targetEntity: String(item.targetEntity || validEntities[0] || coreSubject),
      researchObjectiveId: `obj_${idx + 1}`,
      topicAnchor: coreSubject,
      expectedInformation: 'Dữ liệu kiểm chứng từ web',
      isTopicAnchored: true,
    }));
  }
}
