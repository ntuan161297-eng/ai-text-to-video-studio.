import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PreRenderQualityGate } from '../src/production/preRenderQualityGate.js';
import { ApprovedScriptPackage } from '../src/types/contentBrain.js';
import { TimelineScene } from '../src/production/timelineEngine.js';
import { SceneCompositionModel } from '../src/types/productionEngine.js';

describe('Milestone 10: Pre/Post-Render Quality Gates & Real Evidence Scoring', () => {
  const mockApprovedPackage: ApprovedScriptPackage = {
    title: 'DatBike Weaver++: BƯỚC NGOẶT MỚI',
    viewerPromise: 'Khám phá toàn bộ ưu điểm thực tế',
    selectedAngle: 'Khám phá sự thật bất ngờ',
    targetDuration: 60,
    contentType: 'REAL_PRODUCT',
    primaryEntities: ['DatBike Weaver++'],
    ctaType: 'COMMENT',
    opening: {
      beatId: 1,
      purpose: 'opening_hook',
      viewerQuestion: 'Tại sao lại đặc biệt?',
      newInformation: 'DatBike Weaver++ vừa tạo nên bước ngoặt mới.',
      whyItMatters: 'Giữ chân',
      retentionFunction: 'Tò mò',
      factIds: [],
      narration: 'DatBike Weaver++ vừa tạo nên một bước ngoặt thực sự.',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 6,
      displayCopy: { headline: 'DATBIKE: BƯỚC NGOẶT MỚI' },
      visualPromptSuggestion: 'Toàn cảnh xe DatBike',
    },
    beats: [],
    ending: {
      beatId: 2,
      purpose: 'ending',
      viewerQuestion: 'Giá trị?',
      newInformation: 'Bứt phá',
      whyItMatters: 'Payoff',
      retentionFunction: 'Dư âm',
      factIds: [],
      narration: 'Bứt phá vượt trội.',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 6,
      displayCopy: { headline: 'TỰ HÀO VIỆT NAM' },
      visualPromptSuggestion: 'Toàn cảnh xe',
    },
    cta: {
      beatId: 3,
      purpose: 'cta',
      viewerQuestion: 'Hành động?',
      newInformation: 'Bình luận',
      whyItMatters: 'CTA',
      retentionFunction: 'Tương tác',
      factIds: [],
      narration: 'Bình luận ngay!',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 5,
      displayCopy: { headline: 'BẠN NGHĨ THẾ NÀO?' },
      visualPromptSuggestion: 'CTA',
    },
    allBeats: [],
    fullNarration: 'DatBike...',
    estimatedDuration: 17,
    approved: true,
    approvalReport: { reviewerScore: 95, zeroCriticalIssues: true, timestamp: '' },
  };

  mockApprovedPackage.allBeats = [
    mockApprovedPackage.opening,
    mockApprovedPackage.ending,
    mockApprovedPackage.cta,
  ];

  it('should pass cleanly when timeline and compositions meet all standards', () => {
    const timelineScenes: TimelineScene[] = [
      {
        beatId: 1,
        startTimeSec: 0,
        durationSec: 6.0,
        audioPath: '/tmp/beat_1.mp3',
        audioDurationSec: 6.0,
        headline: 'DATBIKE: BƯỚC NGOẶT MỚI',
        isRealAsset: true,
      },
      {
        beatId: 2,
        startTimeSec: 6.0,
        durationSec: 6.0,
        audioPath: '/tmp/beat_2.mp3',
        audioDurationSec: 6.0,
        headline: 'TỰ HÀO VIỆT NAM',
        isRealAsset: true,
      },
      {
        beatId: 3,
        startTimeSec: 12.0,
        durationSec: 5.0,
        audioPath: '/tmp/beat_3.mp3',
        audioDurationSec: 5.0,
        headline: 'BẠN NGHĨ THẾ NÀO?',
        isRealAsset: true,
      },
    ];

    const compositions: SceneCompositionModel[] = [
      {
        beatId: 1,
        archetype: 'PRODUCT_HERO',
        headline: 'DATBIKE: BƯỚC NGOẶT MỚI',
        motion: 'SLOW_PUSH_IN',
        audioPath: '',
        durationSec: 6.0,
        startSec: 0,
      },
    ];

    const check = PreRenderQualityGate.inspect({
      scriptPackage: mockApprovedPackage,
      timelineScenes,
      compositions,
    });

    assert.equal(check.passed, true);
    assert.equal(check.violations.length, 0);
  });

  it('should block render if audio is clipped or silent padding is detected', () => {
    const flawedScenes: TimelineScene[] = [
      {
        beatId: 1,
        startTimeSec: 0,
        durationSec: 4.0, // Clipped! Audio is 6.5s!
        audioPath: '/tmp/beat_1.mp3',
        audioDurationSec: 6.5,
        headline: 'DATBIKE: BƯỚC NGOẶT MỚI',
        isRealAsset: true,
      },
      {
        beatId: 2,
        startTimeSec: 4.0,
        durationSec: 9.0, // Silent padding! Audio is only 5.0s (padded +4s)
        audioPath: '/tmp/beat_2.mp3',
        audioDurationSec: 5.0,
        headline: 'TỰ HÀO VIỆT NAM',
        isRealAsset: true,
      },
    ];

    const check = PreRenderQualityGate.inspect({
      scriptPackage: mockApprovedPackage,
      timelineScenes: flawedScenes,
      compositions: [],
    });

    assert.equal(check.passed, false);
    assert.equal(check.noNarrationClipping, false);
    assert.equal(check.noSilentPadding, false);
    assert.ok(check.violations.length >= 2);
  });

  it('should block render if headline contains research metadata leaks or paragraphs', () => {
    const leakyScenes: TimelineScene[] = [
      {
        beatId: 1,
        startTimeSec: 0,
        durationSec: 6.0,
        audioPath: '/tmp/beat_1.mp3',
        audioDurationSec: 6.0,
        headline: 'ĐIỂM NHẤN CỦA XE [Fact #1 (95%)] RẤT TUYỆT VỜI ĐÁNG MUA HÔM NAY', // Leaky & > 7 words!
        isRealAsset: true,
      },
    ];

    const check = PreRenderQualityGate.inspect({
      scriptPackage: mockApprovedPackage,
      timelineScenes: leakyScenes,
      compositions: [],
    });

    assert.equal(check.passed, false);
    assert.equal(check.noMetadataLeakage, false);
    assert.equal(check.noScreenParagraphs, false);
  });
});
