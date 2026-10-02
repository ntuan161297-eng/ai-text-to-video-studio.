import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SceneCompositionEngine } from '../src/production/sceneCompositionEngine.js';
import { MotionDirector } from '../src/production/motionDirector.js';
import { ShotPlanner } from '../src/production/shotPlanner.js';
import { EntityAssetEngine } from '../src/production/entityAssetEngine.js';
import { ApprovedScriptPackage } from '../src/types/contentBrain.js';

describe('Milestone 9: Scene Composition, Visual Hierarchy & Motion Director', () => {
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
      whyItMatters: 'Giữ chân người xem',
      retentionFunction: 'Tạo tò mò',
      factIds: [],
      narration: 'DatBike Weaver++ vừa tạo nên một bước ngoặt thực sự.',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 6,
      displayCopy: { headline: 'DATBIKE: BƯỚC NGOẶT MỚI' },
      visualPromptSuggestion: 'Toàn cảnh xe DatBike',
    },
    beats: [
      {
        beatId: 2,
        purpose: 'setup',
        viewerQuestion: 'Nền tảng thế nào?',
        newInformation: 'Xe có thể sạc nhanh trong 3 giờ.',
        whyItMatters: 'Thông số thực tế',
        retentionFunction: 'Tiến trình',
        factIds: ['fact_001'],
        narration: 'Xe có thể sạc siêu nhanh trong 3 giờ với quãng đường di chuyển 200 km.',
        expectedEntities: ['DatBike Weaver++'],
        targetDurationSec: 8,
        displayCopy: { headline: 'SẠC SIÊU NHANH', metricBadge: '200 KM' },
        visualPromptSuggestion: 'Cận cảnh pin',
      },
    ],
    ending: {
      beatId: 3,
      purpose: 'ending',
      viewerQuestion: 'Giá trị gì?',
      newInformation: 'Giá trị bứt phá công nghệ',
      whyItMatters: 'Trả lại lời hứa',
      retentionFunction: 'Dư âm',
      factIds: [],
      narration: 'DatBike đã chứng minh xe điện Việt Nam hoàn toàn có thể cạnh tranh.',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 7,
      displayCopy: { headline: 'TỰ HÀO VIỆT NAM' },
      visualPromptSuggestion: 'Toàn cảnh xe điện trên đường',
    },
    cta: {
      beatId: 4,
      purpose: 'cta',
      viewerQuestion: 'Làm gì?',
      newInformation: 'Bình luận cảm nghĩ',
      whyItMatters: 'Tương tác',
      retentionFunction: 'Thuật toán',
      factIds: [],
      narration: 'Bạn nghĩ sao về mẫu xe này? Hãy để lại bình luận bên dưới nhé!',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 6,
      displayCopy: { headline: 'BẠN NGHĨ THẾ NÀO?' },
      visualPromptSuggestion: 'Màn hình CTA',
    },
    allBeats: [],
    fullNarration: 'DatBike Weaver++ vừa tạo nên bước ngoặt mới...',
    estimatedDuration: 27,
    approved: true,
    approvalReport: { reviewerScore: 95, zeroCriticalIssues: true, timestamp: '' },
  };

  mockApprovedPackage.allBeats = [
    mockApprovedPackage.opening,
    ...mockApprovedPackage.beats,
    mockApprovedPackage.ending,
    mockApprovedPackage.cta,
  ];

  it('should select purposeful archetypes (PRODUCT_HERO, STAT_CARD, KINETIC_TYPE)', () => {
    const { shotPlans } = ShotPlanner.planShots(mockApprovedPackage);
    const assetMap = EntityAssetEngine.resolveAssetsForShots({
      scriptPackage: mockApprovedPackage,
      shotPlans,
    });

    const scenes = SceneCompositionEngine.composeScenes({
      scriptPackage: mockApprovedPackage,
      shotPlans,
      assetMap,
    });

    assert.equal(scenes.length, mockApprovedPackage.allBeats.length);
    assert.equal(scenes[0].archetype, 'PRODUCT_HERO');
    assert.equal(scenes[1].archetype, 'STAT_CARD');
    assert.equal(scenes[3].archetype, 'KINETIC_TYPE');
  });

  it('should assign valid single primary motions to each shot', () => {
    assert.equal(MotionDirector.assignMotion('ESTABLISHING'), 'SLOW_PUSH_IN');
    assert.equal(MotionDirector.assignMotion('DATA_CARD'), 'NUMBER_COUNT_UP');
    assert.equal(MotionDirector.assignMotion('DYNAMIC_ACTION'), 'DYNAMIC_WHIP');
  });
});
