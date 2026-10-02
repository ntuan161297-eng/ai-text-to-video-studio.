import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InputUnderstandingEngine } from '../src/brain/inputUnderstandingEngine.js';
import { FactVerificationEngine } from '../src/brain/factVerificationEngine.js';
import { KnowledgeBriefBuilder } from '../src/brain/knowledgeBriefBuilder.js';
import { ContentStrategist } from '../src/brain/contentStrategist.js';
import { CreativeAngleEngine } from '../src/brain/creativeAngleEngine.js';
import { HookCandidateEngine } from '../src/brain/hookCandidateEngine.js';
import { CleanedSourceDocument } from '../src/types/contentBrain.js';

describe('Milestone 4: Strategic Direction & Creative Angles', () => {
  const mockApprovedSource: CleanedSourceDocument = {
    id: 'src_001',
    url: 'https://datbike.com/weaver-plus',
    domain: 'datbike.com',
    sourceName: 'datbike.com',
    sourceType: 'PRIMARY_OFFICIAL',
    title: 'DatBike Weaver++ Thông Số Kỹ Thuật',
    rawContent: 'raw text',
    cleanContent: `
      DatBike chính thức giới thiệu dòng xe máy điện Weaver++ với khả năng sạc siêu nhanh trong 3 giờ.
      Xe đạt vận tốc tối đa 90 km/h và quãng đường di chuyển lên tới 200 km chỉ trong một lần sạc đầy.
      Động cơ xe có công suất tối đa 7000W mang lại trải nghiệm tăng tốc ấn tượng.
    `,
    extractedImages: ['https://datbike.com/img1.jpg'],
    scores: {
      authority: 20,
      relevance: 25,
      freshness: 15,
      originality: 15,
      entityMatch: 15,
      contentQuality: 10,
      totalScore: 100,
    },
    isApproved: true,
  };

  it('should formulate an audience strategy with a clear viewer promise', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    const factResult = FactVerificationEngine.verifyFacts([mockApprovedSource], brief.primaryEntities);
    const kb = KnowledgeBriefBuilder.build(brief, factResult.facts);

    const strategy = ContentStrategist.formulateStrategy(brief, kb);
    assert.ok(strategy.viewerPromise.length > 25);
    assert.ok(strategy.viewerProblem.length > 20);
    assert.ok(strategy.mainTakeaway.length > 20);
  });

  it('should generate at least 4 distinct, scored creative angles', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    const factResult = FactVerificationEngine.verifyFacts([mockApprovedSource], brief.primaryEntities);
    const kb = KnowledgeBriefBuilder.build(brief, factResult.facts);
    const strategy = ContentStrategist.formulateStrategy(brief, kb);

    const { allAngles, selectedAngle } = CreativeAngleEngine.generateAngles(brief, kb, strategy);
    assert.ok(allAngles.length >= 4);
    assert.ok(selectedAngle.totalScore > 80);
    assert.ok(selectedAngle.storyStructure.includes('→'));
  });

  it('should generate at least 5 candidate hooks with zero generic clichés', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    const factResult = FactVerificationEngine.verifyFacts([mockApprovedSource], brief.primaryEntities);
    const kb = KnowledgeBriefBuilder.build(brief, factResult.facts);
    const strategy = ContentStrategist.formulateStrategy(brief, kb);
    const { selectedAngle } = CreativeAngleEngine.generateAngles(brief, kb, strategy);

    const { allHooks, selectedHook } = HookCandidateEngine.generateHooks(brief, kb, selectedAngle);
    assert.ok(allHooks.length >= 5);
    assert.ok(selectedHook.hookText.length > 15);

    // Verify absence of forbidden clichés
    for (const h of allHooks) {
      assert.ok(!/bạn có biết/i.test(h.hookText));
      assert.ok(!/trong video hôm nay/i.test(h.hookText));
      assert.ok(!/hãy cùng tìm hiểu/i.test(h.hookText));
    }
  });
});
