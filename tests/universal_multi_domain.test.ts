/**
 * UNIVERSAL MULTI-DOMAIN PIPELINE VERIFICATION TEST SUITE
 * Validates the core architectural principles of the Universal Refactor:
 * 1. Zero-semantic contamination between unrelated requests.
 * 2. Complete absence of hardcoded rhetorical clichés / templates.
 * 3. Dynamic content structure adapting to topic & intent (no fixed story arcs).
 * 4. Duration fidelity via content-layer reconciliation.
 * 5. Domain diversity (Tech, Science, History, Business, Culture).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Explicitly enable TEST_OFFLINE_MODE for automated development test suites
process.env.TEST_OFFLINE_MODE = 'true';

import { UniversalIntentEngine } from '../src/brain/universalIntentEngine.js';
import { AdaptiveResearchPlanner } from '../src/brain/adaptiveResearchPlanner.js';
import { AdaptiveContentPlanner } from '../src/brain/adaptiveContentPlanner.js';
import { UniversalScriptWriter } from '../src/brain/universalScriptWriter.js';
import { UniversalScriptReviewer } from '../src/brain/universalScriptReviewer.js';
import { KnowledgeBrief } from '../src/types/universalContracts.js';

const FORBIDDEN_CLICHES = [
  'đa số mọi người',
  'ít ai nhận ra',
  'cho đến khi',
  'mấu chốt nằm ở',
  'tựu trung lại',
  'hãy follow kênh',
  'bấm vào link',
  'comment bên dưới',
  'đừng quên bấm like',
  'thay đổi cuộc chơi',
];

const TEST_DOMAINS = [
  {
    domain: 'Product / Tech',
    prompt: 'Đánh giá chi tiết laptop ThinkPad X1 Carbon Gen 12 bàn phím và thời lượng pin',
    duration: 45,
    entities: ['ThinkPad X1 Carbon Gen 12', 'Lenovo'],
    facts: [
      'ThinkPad X1 Carbon Gen 12 trang bị vi xử lý Intel Core Ultra với NPU hỗ trợ AI tích hợp.',
      'Trọng lượng máy chỉ khoảng 1.09 kg nhờ khung gầm sợi carbon và magie tái chế.',
      'Bàn phím ThinkPad mới tích hợp rãnh xúc giác tactile mark và phím TrackPoint Quick Menu.',
      'Thời lượng pin đạt khoảng 12 giờ sử dụng văn phòng liên tục nhờ viên pin 57Wh tối ưu.',
    ],
  },
  {
    domain: 'Astronomy / Science',
    prompt: 'Khám phá kính viễn vọng James Webb và những phát hiện vũ trụ sâu thẳm',
    duration: 60,
    entities: ['James Webb', 'NASA'],
    facts: [
      'Kính viễn vọng James Webb đặt tại điểm Lagrange L2 cách Trái Đất 1.5 triệu km.',
      'Gương chính mạ vàng có đường kính 6.5 mét thu nhận bước sóng hồng ngoại nguyên thủy.',
      'James Webb đã phát hiện các thiên hà cổ xưa hình thành chỉ 300 triệu năm sau Vụ Nổ Lớn.',
      'Các phép phân tích quang phổ xác định hơi nước và methane trong khí quyển ngoại hành tinh.',
    ],
  },
  {
    domain: 'History / Documentary',
    prompt: 'Bối cảnh lịch sử và diễn biến chiến thắng Điện Biên Phủ năm 1954',
    duration: 60,
    entities: ['Điện Biên Phủ', 'Võ Nguyên Giáp'],
    facts: [
      'Chiến dịch Điện Biên Phủ diễn ra trong 56 ngày đêm từ ngày 13 tháng 3 đến ngày 7 tháng 5 năm 1954.',
      'Đại tướng Võ Nguyên Giáp đã quyết định chuyển phương châm từ đánh nhanh thắng nhanh sang đánh chắc tiến chắc.',
      'Hệ thống hào quân sự dài hàng trăm km dần siết chặt vòng vây cụm cứ điểm của tập đoàn cứ điểm Pháp.',
      'Thắng lợi Điện Biên Phủ trực tiếp dẫn đến việc ký kết Hiệp định Giơ-ne-vơ về chấm dứt chiến tranh tại Đông Dương.',
    ],
  },
  {
    domain: 'Finance / Business',
    prompt: 'Mô hình kinh doanh freemium và cách các công ty phần mềm tạo doanh thu',
    duration: 30,
    entities: ['Freemium', 'SaaS'],
    facts: [
      'Mô hình Freemium cung cấp tính năng cơ bản miễn phí và thu phí cho các tính năng nâng cao.',
      'Tỷ lệ chuyển đổi người dùng miễn phí sang trả phí trong ngành SaaS thường dao động từ 2% đến 5%.',
      'Chi phí biên cận để phục vụ thêm một người dùng số gần như bằng không giúp mở rộng quy mô nhanh chóng.',
      'Các doanh nghiệp như Spotify và Slack tối ưu phễu người dùng thông qua việc hạn chế tính năng cao cấp.',
    ],
  },
  {
    domain: 'Travel / Culture',
    prompt: 'Văn hóa trà đạo Nhật Bản và triết lý Wabi-Sabi tinh tế',
    duration: 45,
    entities: ['Trà đạo Nhật Bản', 'Wabi-Sabi'],
    facts: [
      'Nghệ thuật trà đạo Chanoyu được định hình bởi thiền sư Sen no Rikyu vào thế kỷ 16.',
      'Triết lý Wabi-Sabi tôn vinh vẻ đẹp mộc mạc, bất toàn và sự vô thường của thời gian.',
      'Bốn nguyên tắc nền tảng của trà đạo là Hòa, Kính, Thanh, Tịch.',
      'Từng thao tác đánh trà bột Matcha đều phản ánh tinh thần nhất kỳ nhất hội trân trọng từng khoảnh khắc.',
    ],
  },
];

test('Universal Multi-Domain Verification Suite', async (t) => {
  const generatedScripts: { domain: string; prompt: string; fullNarration: string; beatCount: number }[] = [];

  for (const item of TEST_DOMAINS) {
    await t.test(`Domain: ${item.domain} - Adapts structure and remains cliché-free`, async () => {
      // 1. UniversalIntentEngine
      const { intentSpec, topicContract, durationContract } = UniversalIntentEngine.resolve(item.prompt, {
        duration: item.duration,
      });

      assert.equal(durationContract.requestedSeconds, item.duration, 'Requested duration contract must be exact');
      assert.ok(topicContract.coreTopic.length > 0, 'Core topic must be identified');

      // 2. AdaptiveResearchPlanner
      const researchPlan = AdaptiveResearchPlanner.plan(intentSpec, topicContract);
      assert.ok(researchPlan.queries.length >= 1, 'Adaptive research queries must be generated');

      // 3. Knowledge Brief assembly
      const knowledge: KnowledgeBrief = {
        coreUnderstanding: item.prompt,
        strongestFacts: item.facts.map((claim, idx) => ({
          id: `fact_${idx + 1}`,
          claim,
          evidence: claim,
          source: 'Verified Knowledge Base',
          sourceType: 'NEWS' as const,
          confidence: 95,
          freshness: 'RECENT' as const,
          relevance: 95,
          entities: item.entities,
        })),
        supportingFacts: [],
        meaningfulNumbers: [],
        relevantEntities: item.entities,
        nuances: [],
        unansweredQuestions: [],
        visualOpportunities: [],
        informationToAvoid: [],
      };

      // 4. AdaptiveContentPlanner
      const contentPlan = AdaptiveContentPlanner.planContent(intentSpec, topicContract, knowledge);
      assert.ok(contentPlan.sections.length >= 2, 'Content plan must have at least 2 sections');

      // 5. UniversalScriptWriter
      const draft = await UniversalScriptWriter.writeScript({
        intentSpec,
        topicContract,
        knowledge,
        contentPlan,
      });

      assert.ok(draft.beats.length >= 2, 'Script must have multiple beats');
      assert.ok(draft.fullNarration.length > 50, 'Narration must be substantial');

      // 6. Check for forbidden rhetorical clichés
      const narrationLower = draft.fullNarration.toLowerCase();
      for (const cliche of FORBIDDEN_CLICHES) {
        assert.ok(
          !narrationLower.includes(cliche),
          `Script for ${item.domain} MUST NOT contain rhetorical cliché: "${cliche}". Found in: "${draft.fullNarration}"`
        );
      }

      // 7. UniversalScriptReviewer
      const review = UniversalScriptReviewer.review(draft, intentSpec, topicContract);
      assert.ok(review.passed, `Reviewer must pass script for ${item.domain}. Issues: ${review.issues.join('; ')}`);
      assert.ok(review.approvedScript.fidelityScore >= 80, 'Fidelity score must be >= 80');

      generatedScripts.push({
        domain: item.domain,
        prompt: item.prompt,
        fullNarration: draft.fullNarration,
        beatCount: draft.beats.length,
      });
    });
  }

  // Cross-job zero-semantic contamination test across all 5 scripts
  await t.test('Cross-Job Isolation: No entity or vocabulary leakage between sequential domain runs', () => {
    for (let i = 0; i < TEST_DOMAINS.length; i++) {
      for (let j = 0; j < TEST_DOMAINS.length; j++) {
        if (i === j) continue;
        const targetDomain = TEST_DOMAINS[j];
        const scriptUnderAudit = generatedScripts[i];

        for (const foreignEntity of targetDomain.entities) {
          const hasForeignEntity = scriptUnderAudit.fullNarration
            .toLowerCase()
            .includes(foreignEntity.toLowerCase());
          assert.equal(
            hasForeignEntity,
            false,
            `Script for [${scriptUnderAudit.domain}] contaminated with foreign entity [${foreignEntity}] from [${targetDomain.domain}]!`
          );
        }
      }
    }
  });

  // Dynamic Structure verification: Confirm beat count and structure vary with duration and topic
  await t.test('Dynamic Structure: Beat counts and allocations adapt dynamically', () => {
    const beatCounts = generatedScripts.map((s) => s.beatCount);
    console.log('[Test Summary] Beat counts across 5 domains:', beatCounts);
    // Not all scripts have identical length (freemium 30s has fewer beats than 60s history)
    const minBeats = Math.min(...beatCounts);
    const maxBeats = Math.max(...beatCounts);
    assert.ok(maxBeats > minBeats, `Beat counts must vary adaptively based on target duration (got min=${minBeats}, max=${maxBeats})`);
  });
});
