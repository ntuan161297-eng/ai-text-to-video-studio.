import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InputUnderstandingEngine } from '../src/brain/inputUnderstandingEngine.js';
import { FactVerificationEngine } from '../src/brain/factVerificationEngine.js';
import { KnowledgeBriefBuilder } from '../src/brain/knowledgeBriefBuilder.js';
import { ContentStrategist } from '../src/brain/contentStrategist.js';
import { CreativeAngleEngine } from '../src/brain/creativeAngleEngine.js';
import { HookCandidateEngine } from '../src/brain/hookCandidateEngine.js';
import { SeniorScriptWriter } from '../src/brain/seniorScriptWriter.js';
import { ScriptDurationOptimizer } from '../src/brain/scriptDurationOptimizer.js';
import { CleanedSourceDocument } from '../src/types/contentBrain.js';
import { AntiResearchLeak } from '../src/brain/antiResearchLeak.js';

describe('Milestone 5: Senior Script Writer (Natural Spoken Vietnamese)', () => {
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

  it('should calculate accurate duration budget without artificial padding', () => {
    const budget60 = ScriptDurationOptimizer.getBudget(60);
    assert.equal(budget60.targetDurationSec, 60);
    assert.equal(budget60.targetBeatCount, 5);
    assert.ok(budget60.targetTotalWords >= 140 && budget60.targetTotalWords <= 175);

    const budget30 = ScriptDurationOptimizer.getBudget(30);
    assert.equal(budget30.targetDurationSec, 30);
    assert.equal(budget30.targetBeatCount, 3);
  });

  it('should write a complete natural Vietnamese script package', () => {
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

    assert.ok(script.allBeats.length >= 4);
    assert.equal(script.opening.purpose, 'opening_hook');
    assert.equal(script.ending.purpose, 'ending');
    assert.equal(script.cta.purpose, 'cta');
    assert.ok(script.fullNarration.length > 100);

    // Verify screen headline word count: 2 - 7 words
    for (const b of script.allBeats) {
      const headlineWords = b.displayCopy.headline.split(/\s+/).filter(Boolean);
      assert.ok(headlineWords.length >= 2 && headlineWords.length <= 7);
    }

    // Verify zero research leaks in full narration
    const audit = AntiResearchLeak.audit(script.fullNarration);
    assert.equal(audit.passed, true);
    assert.ok(!script.fullNarration.includes('[Fact'));
    assert.ok(!script.fullNarration.includes('confidence'));
  });
});
