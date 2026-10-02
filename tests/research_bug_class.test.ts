import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveResearchPlanner } from '../src/brain/adaptiveResearchPlanner.js';
import { LiveWebSearcher } from '../src/brain/liveWebSearcher.js';
import { SourceQualityEngine } from '../src/brain/sourceQualityEngine.js';
import { UserIntentSpec, TopicContract } from '../src/types/universalContracts.js';

describe('Research Layer Bug Class Remediation Tests', () => {
  // 1. Long Prompt Test (30+ words)
  it('should handle long prompts without single-token loss or whole-prompt quoting', async () => {
    const longPrompt = 'Phân tích toàn diện chiến lược chuỗi cung ứng Just-in-Time của tập đoàn Toyota trong bối cảnh gián đoạn toàn cầu năm 2024 và giải pháp dự phòng linh hoạt cho các nhà máy tại khu vực Đông Nam Á';
    const intentSpec: UserIntentSpec = {
      rawPrompt: longPrompt,
      resolvedDurationSeconds: 60,
      creativePillars: {
        narrativeStyle: 'analytical',
        pacing: 'medium',
        visualDensity: 'high',
        targetTone: 'professional',
        audienceKnowledgeLevel: 'intermediate',
        structureStyle: 'structured'
      },
      productionDirectives: {
        skipResearch: false,
        fastTrack: false,
        strictFactual: true,
        priorityEntities: ['Toyota', 'Just-in-Time', 'chuỗi cung ứng']
      },
      understandingConfidence: 0.95
    };
    const topicContract: TopicContract = {
      coreTopic: longPrompt,
      primaryEntities: ['Toyota', 'Just-in-Time', 'chuỗi cung ứng'],
      requiredFacts: [],
      forbiddenDriftTopics: ['phân bón', 'phân loại rác'],
      contentDomain: 'business'
    };

    const plan = await AdaptiveResearchPlanner.plan(intentSpec, topicContract);
    assert.ok(plan.queries.length >= 2, 'Should generate multiple focused queries');

    for (const q of plan.queries) {
      assert.ok(q.query.trim().split(/\s+/).length >= 2, `Query "${q.query}" must have at least 2 words (no single-token loss)`);
      assert.ok(!q.query.startsWith('"Phân"'), `Query "${q.query}" must not start with single word token "Phân"`);
      assert.ok(q.topicAnchor.length > 0, `Query "${q.query}" must have a topic anchor`);
      assert.ok(q.isTopicAnchored, `Query "${q.query}" must be topic anchored`);
    }
  });

  // 2. Short Prompt Test
  it('should handle short prompts with robust topic anchors', async () => {
    const shortPrompt = 'Pin LFP VinFast';
    const intentSpec: UserIntentSpec = {
      rawPrompt: shortPrompt,
      resolvedDurationSeconds: 45,
      creativePillars: {
        narrativeStyle: 'explanatory',
        pacing: 'fast',
        visualDensity: 'medium',
        targetTone: 'informative',
        audienceKnowledgeLevel: 'general',
        structureStyle: 'hook_story_cta'
      },
      productionDirectives: {
        skipResearch: false,
        fastTrack: false,
        strictFactual: true,
        priorityEntities: ['Pin LFP', 'VinFast']
      },
      understandingConfidence: 0.98
    };
    const topicContract: TopicContract = {
      coreTopic: 'Pin LFP VinFast',
      primaryEntities: ['Pin LFP', 'VinFast'],
      requiredFacts: [],
      forbiddenDriftTopics: [],
      contentDomain: 'technology'
    };

    const plan = await AdaptiveResearchPlanner.plan(intentSpec, topicContract);
    assert.ok(plan.queries.length >= 2);
    assert.ok(plan.queries.some(q => q.query.toLowerCase().includes('vinfast')));
    assert.ok(plan.queries.some(q => q.query.toLowerCase().includes('lfp') || q.query.toLowerCase().includes('pin')));
  });

  // 3. Ambiguous Polysemic Vietnamese Words ("Phân", "Một", "Quy", "Hương", "Kiệt")
  it('should not isolate ambiguous single Vietnamese syllables as search queries', async () => {
    const trickyPrompts = [
      { text: 'Phân tích ưu điểm công nghệ gen CAR-T trong điều trị ung thư', badToken: 'Phân' },
      { text: 'Một ngày làm việc điển hình của kỹ sư vi mạch bán dẫn', badToken: 'Một' },
      { text: 'Quy trình sản xuất cà phê Robusta chất lượng cao tại Đắk Lắk', badToken: 'Quy' },
      { text: 'Hương vị đặc trưng của các loại phở truyền thống miền Bắc', badToken: 'Hương' },
      { text: 'Kiệt tác kiến trúc thánh địa Mỹ Sơn của nền văn minh Chăm Pa', badToken: 'Kiệt' }
    ];

    for (const testCase of trickyPrompts) {
      const intentSpec: UserIntentSpec = {
        rawPrompt: testCase.text,
        resolvedDurationSeconds: 60,
        creativePillars: {
          narrativeStyle: 'storytelling',
          pacing: 'medium',
          visualDensity: 'medium',
          targetTone: 'engaging',
          audienceKnowledgeLevel: 'general',
          structureStyle: 'documentary'
        },
        productionDirectives: {
          skipResearch: false,
          fastTrack: false,
          strictFactual: true,
          priorityEntities: []
        },
        understandingConfidence: 0.9
      };
      const topicContract: TopicContract = {
        coreTopic: testCase.text,
        primaryEntities: [],
        requiredFacts: [],
        forbiddenDriftTopics: [],
        contentDomain: 'education'
      };

      const plan = await AdaptiveResearchPlanner.plan(intentSpec, topicContract);
      for (const q of plan.queries) {
        assert.notEqual(q.query.trim().toLowerCase(), testCase.badToken.toLowerCase(), `Query must not be single word "${testCase.badToken}"`);
        assert.notEqual(q.query.trim().toLowerCase(), `"${testCase.badToken.toLowerCase()}"`, `Query must not be quoted single word "${testCase.badToken}"`);
        assert.ok(q.query.trim().split(/\s+/).length >= 2, `Query "${q.query}" must have >= 2 words`);
      }
    }
  });

  // 4. Multi-Entity Request Test
  it('should extract distinct entity queries for multi-entity requests', async () => {
    const multiEntityPrompt = 'So sánh hiệu năng giữa chip Apple M3 Max và Intel Core Ultra 9 trong render đồ họa 3D';
    const intentSpec: UserIntentSpec = {
      rawPrompt: multiEntityPrompt,
      resolvedDurationSeconds: 60,
      creativePillars: {
        narrativeStyle: 'comparative',
        pacing: 'medium',
        visualDensity: 'high',
        targetTone: 'tech',
        audienceKnowledgeLevel: 'advanced',
        structureStyle: 'head_to_head'
      },
      productionDirectives: {
        skipResearch: false,
        fastTrack: false,
        strictFactual: true,
        priorityEntities: ['Apple M3 Max', 'Intel Core Ultra 9']
      },
      understandingConfidence: 0.95
    };
    const topicContract: TopicContract = {
      coreTopic: multiEntityPrompt,
      primaryEntities: ['Apple M3 Max', 'Intel Core Ultra 9'],
      requiredFacts: [],
      forbiddenDriftTopics: [],
      contentDomain: 'technology'
    };

    const plan = await AdaptiveResearchPlanner.plan(intentSpec, topicContract);
    const queryTexts = plan.queries.map(q => q.query.toLowerCase()).join(' ');
    assert.ok(queryTexts.includes('apple') || queryTexts.includes('m3'), 'Should include Apple entity');
    assert.ok(queryTexts.includes('intel') || queryTexts.includes('ultra'), 'Should include Intel entity');
  });

  // 5. One Entity + Multiple Subtopics
  it('should generate subtopic queries preserving topic anchor', async () => {
    const prompt = 'Bệnh viện Vinmec ứng dụng ghép tế bào gốc và phẫu thuật robot nội soi';
    const intentSpec: UserIntentSpec = {
      rawPrompt: prompt,
      resolvedDurationSeconds: 60,
      creativePillars: {
        narrativeStyle: 'medical',
        pacing: 'medium',
        visualDensity: 'medium',
        targetTone: 'professional',
        audienceKnowledgeLevel: 'general',
        structureStyle: 'informative'
      },
      productionDirectives: {
        skipResearch: false,
        fastTrack: false,
        strictFactual: true,
        priorityEntities: ['Vinmec', 'ghép tế bào gốc', 'phẫu thuật robot']
      },
      understandingConfidence: 0.9
    };
    const topicContract: TopicContract = {
      coreTopic: prompt,
      primaryEntities: ['Vinmec', 'ghép tế bào gốc', 'phẫu thuật robot'],
      requiredFacts: [],
      forbiddenDriftTopics: [],
      contentDomain: 'health'
    };

    const plan = await AdaptiveResearchPlanner.plan(intentSpec, topicContract);
    assert.ok(plan.queries.length >= 3);
    for (const q of plan.queries) {
      assert.ok(q.topicAnchor.length > 0);
      assert.ok(q.isTopicAnchored);
    }
  });

  // 6. Source Covering Single Objective (Section 7)
  it('should accept a high-quality source that covers one objective even if it lacks full video coverage', () => {
    const topicContract: TopicContract = {
      coreTopic: 'Khám phá lịch sử Chùa Thiên Mụ và ẩm thực cung đình Huế',
      primaryEntities: ['Chùa Thiên Mụ', 'Huế', 'ẩm thực cung đình'],
      requiredFacts: [],
      forbiddenDriftTopics: [],
      contentDomain: 'culture'
    };

    // Article about Chùa Thiên Mụ history only (does not mention food)
    const docCleanContent = `
      Chùa Thiên Mụ hay còn gọi là chùa Linh Mụ, là một ngôi chùa cổ nằm trên đồi Hà Khê, tả ngạn sông Hương,
      cách trung tâm thành phố Huế khoảng 5km về phía tây. Ngôi chùa được khởi lập từ năm 1601 bởi chúa Tiên Nguyễn Hoàng.
      Tháp Phước Duyên là biểu tượng nổi tiếng gắn liền với hình ảnh chùa Thiên Mụ và cố đô Huế.
    `;

    const score = SourceQualityEngine.evaluateSource(
      'https://baothuathienhue.vn/chua-thien-mu-di-tich-lich-su-hue',
      'Chùa Thiên Mụ - Di tích lịch sử Huế',
      docCleanContent,
      [],
      docCleanContent,
      topicContract.primaryEntities,
      topicContract
    );

    assert.ok(score.isApproved, 'Source covering Chùa Thiên Mụ entity and topic must be approved');
    assert.ok(score.scores.entityMatch >= 9, 'Entity match score should be substantial');
    assert.ok(score.scores.relevance >= 10, 'Core topic relevance should be high');
  });

  // 7. Source using different wording from prompt
  it('should accept sources that express the core topic with different vocabulary', () => {
    const topicContract: TopicContract = {
      coreTopic: 'Phương thức thanh toán bảo mật Face Pay tại chuỗi cửa hàng tiện lợi',
      primaryEntities: ['Face Pay', 'thanh toán nhận diện khuôn mặt'],
      requiredFacts: [],
      forbiddenDriftTopics: [],
      contentDomain: 'fintech'
    };

    const docContent = `
      Công nghệ xác thực sinh trắc học khuôn mặt đang được triển khai rộng rãi trong giao dịch tài chính.
      Giải pháp Face Pay cho phép người tiêu dùng quét mặt để thanh toán hóa đơn mà không cần mang theo tiền mặt hay thẻ ngân hàng.
      Hệ thống áp dụng thuật toán AI chống giả mạo và mã hóa thông tin người dùng an toàn.
    `;

    const score = SourceQualityEngine.evaluateSource(
      'https://vnexpress.net/thanh-toan-bang-khuon-mat-len-ngoi',
      'Thanh toán bằng khuôn mặt lên ngôi',
      docContent,
      [],
      docContent,
      topicContract.primaryEntities,
      topicContract
    );

    assert.ok(score.isApproved, 'Source with semantic variation should be approved');
    assert.ok(score.scores.relevance >= 10);
  });

  // 8. Malicious/Off-Topic Homonym Drift Rejection
  it('should reject off-topic homonym drift in Preliminary Filter and Source Evaluation', () => {
    const topicContract: TopicContract = {
      coreTopic: 'Phân tích cơ cấu tài chính và dòng tiền doanh nghiệp năm 2024',
      primaryEntities: ['cơ cấu tài chính', 'dòng tiền doanh nghiệp'],
      requiredFacts: [],
      forbiddenDriftTopics: ['phân bón hữu cơ', 'chăn nuôi gia súc'],
      contentDomain: 'finance'
    };

    // Homonym drift: Organic fertilizer article because of "Phân"
    const offTopicResult = {
      title: 'Kỹ thuật ủ phân bón hữu cơ vi sinh hiệu cao cho cây trồng',
      snippet: 'Hướng dẫn bà con cách ủ phân chuồng, phân xanh làm phân hữu cơ bón lót phục vụ nông nghiệp sạch.',
      url: 'https://nongnghiep.vn/ky-thuat-u-phan-bon-huu-co'
    };

    const preliminaryEval = LiveWebSearcher.evaluateSearchResult(offTopicResult, topicContract);
    assert.equal(preliminaryEval.approved, false, 'Preliminary filter must reject fertilizer homonym drift');

    const offTopicContent = `
      Quy trình ủ phân hữu cơ vi sinh giúp tận dụng phế phẩm nông nghiệp, tạo ra phân bón giàu dinh dưỡng cho đất.
      Bà con cần chú ý độ ẩm và nhiệt độ đống ủ để vi sinh vật phân giải chất hữu cơ triệt để.
    `;

    const docScore = SourceQualityEngine.evaluateSource(
      offTopicResult.url,
      offTopicResult.title,
      offTopicContent,
      [],
      offTopicContent,
      topicContract.primaryEntities,
      topicContract
    );

    assert.equal(docScore.isApproved, false, 'Document evaluation must reject fertilizer content for financial prompt');
  });
});
