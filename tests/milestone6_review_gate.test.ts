import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InputUnderstandingEngine } from '../src/brain/inputUnderstandingEngine.js';
import { FactVerificationEngine } from '../src/brain/factVerificationEngine.js';
import { KnowledgeBriefBuilder } from '../src/brain/knowledgeBriefBuilder.js';
import { ContentStrategist } from '../src/brain/contentStrategist.js';
import { CreativeAngleEngine } from '../src/brain/creativeAngleEngine.js';
import { HookCandidateEngine } from '../src/brain/hookCandidateEngine.js';
import { SeniorScriptWriter } from '../src/brain/seniorScriptWriter.js';
import { IndependentScriptReviewer } from '../src/brain/independentScriptReviewer.js';
import { ScriptQualityGate } from '../src/brain/scriptQualityGate.js';
import { CleanedSourceDocument } from '../src/types/contentBrain.js';

describe('Milestone 6: Independent Script Reviewer & Script Quality Gate', () => {
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

  it('should independently review a script and detect critical research leak violations', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    const factResult = FactVerificationEngine.verifyFacts([mockApprovedSource], brief.primaryEntities);
    const kb = KnowledgeBriefBuilder.build(brief, factResult.facts);
    const strategy = ContentStrategist.formulateStrategy(brief, kb);
    const { selectedAngle } = CreativeAngleEngine.generateAngles(brief, kb, strategy);
    const { selectedHook } = HookCandidateEngine.generateHooks(brief, kb, selectedAngle);

    const script = SeniorScriptWriter.writeScript({
      brief,
      knowledge: kb,
      strategy,
      selectedAngle,
      selectedHook,
      verifiedFacts: factResult.facts,
    });

    // Deliberately inject a critical leak to test the reviewer
    script.fullNarration += ' [Fact #1 - VnExpress (95%)]';
    const report = IndependentScriptReviewer.review({
      brief,
      knowledge: kb,
      strategy,
      verifiedFacts: factResult.facts,
      script,
    });

    assert.equal(report.passed, false);
    assert.ok(report.criticalCount >= 1);
    assert.ok(report.issues.some((i) => i.dimension === 'RESEARCH_METADATA_LEAK'));
  });

  it('should repair fixable issues in Quality Gate and deliver ApprovedScriptPackage', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    const factResult = FactVerificationEngine.verifyFacts([mockApprovedSource], brief.primaryEntities);
    const kb = KnowledgeBriefBuilder.build(brief, factResult.facts);
    const strategy = ContentStrategist.formulateStrategy(brief, kb);
    const { selectedAngle } = CreativeAngleEngine.generateAngles(brief, kb, strategy);
    const { selectedHook } = HookCandidateEngine.generateHooks(brief, kb, selectedAngle);

    const script = SeniorScriptWriter.writeScript({
      brief,
      knowledge: kb,
      strategy,
      selectedAngle,
      selectedHook,
      verifiedFacts: factResult.facts,
    });

    // Inject minor leak that can be repaired
    script.opening.displayCopy.headline += ' [VERIFIED]';

    const { approvedPackage, finalReport } = ScriptQualityGate.processGate({
      brief,
      knowledge: kb,
      strategy,
      verifiedFacts: factResult.facts,
      script,
    });

    assert.ok(approvedPackage !== null);
    assert.equal(approvedPackage.approved, true);
    assert.equal(finalReport.criticalCount, 0);
    assert.ok(!approvedPackage.opening.displayCopy.headline.includes('[VERIFIED]'));
  });
});
