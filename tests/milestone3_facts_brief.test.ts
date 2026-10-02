import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InputUnderstandingEngine } from '../src/brain/inputUnderstandingEngine.js';
import { FactVerificationEngine } from '../src/brain/factVerificationEngine.js';
import { KnowledgeBriefBuilder } from '../src/brain/knowledgeBriefBuilder.js';
import { CleanedSourceDocument } from '../src/types/contentBrain.js';
import { AntiResearchLeak } from '../src/brain/antiResearchLeak.js';

describe('Milestone 3: Fact Engine & Knowledge Brief Synthesis', () => {
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
      Mẫu xe này được trang bị pin Lithium-ion đạt chuẩn kháng nước IP67.
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

  it('should extract verified facts with evidence and identify sensitive numbers', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    const result = FactVerificationEngine.verifyFacts([mockApprovedSource], brief.primaryEntities);

    assert.ok(result.facts.length >= 3);
    assert.ok(result.facts.some((f) => f.isSensitiveNumber && f.claim.includes('90 km/h')));
    assert.ok(result.facts.every((f) => f.evidenceText.length >= 30));
    assert.ok(result.facts.every((f) => f.sourceUrl === 'https://datbike.com/weaver-plus'));
  });

  it('should build a clean KnowledgeBrief with zero research leaks or markup', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    const factResult = FactVerificationEngine.verifyFacts([mockApprovedSource], brief.primaryEntities);
    const kb = KnowledgeBriefBuilder.build(brief, factResult.facts);

    assert.ok(kb.topicSummary.length > 20);
    assert.ok(kb.importantFacts.length >= 1);
    assert.ok(kb.usefulNumbers.length >= 1);
    assert.ok(kb.visualOpportunities.length >= 2);
    assert.ok(kb.realWorldAssetsNeeded.length >= 2);

    // Audit for any leakage in all KnowledgeBrief string fields
    const allKbText = [
      kb.topicSummary,
      ...kb.importantFacts,
      ...kb.interestingFacts,
      ...kb.surprisingFacts,
      ...kb.viewerQuestions,
      ...kb.factsToAvoid,
    ].join(' ');

    const leakCheck = AntiResearchLeak.audit(allKbText);
    assert.equal(leakCheck.passed, true);
    assert.ok(!allKbText.includes('[Fact'));
    assert.ok(!allKbText.includes('confidence'));
  });
});
