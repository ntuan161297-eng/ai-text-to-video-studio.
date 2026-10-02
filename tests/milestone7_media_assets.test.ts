import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MediaPolicyRouter } from '../src/production/mediaPolicyRouter.js';
import { ShotPlanner } from '../src/production/shotPlanner.js';
import { AssetVerifier } from '../src/production/assetVerifier.js';
import { EntityAssetEngine } from '../src/production/entityAssetEngine.js';
import { ApprovedScriptPackage } from '../src/types/contentBrain.js';

describe('Milestone 7: Media Policy Router & Real Entity Asset Retrieval', () => {
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
      narration: 'DatBike Weaver++ vừa tạo nên bước ngoặt mới.',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 8,
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
        narration: 'Xe có thể sạc nhanh trong 3 giờ với quãng đường 200 km.',
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
      narration: 'DatBike đã chứng minh xe điện Việt Nam hoàn toàn có thể cạnh tranh sòng phẳng.',
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
      narration: 'Bạn nghĩ sao về mẫu xe này? Hãy để lại bình luận nhé!',
      expectedEntities: ['DatBike Weaver++'],
      targetDurationSec: 6,
      displayCopy: { headline: 'BẠN NGHĨ THẾ NÀO?' },
      visualPromptSuggestion: 'Màn hình CTA',
    },
    allBeats: [],
    fullNarration: 'DatBike Weaver++ vừa tạo nên bước ngoặt mới...',
    estimatedDuration: 29,
    approved: true,
    approvalReport: { reviewerScore: 95, zeroCriticalIssues: true, timestamp: '' },
  };

  mockApprovedPackage.allBeats = [
    mockApprovedPackage.opening,
    ...mockApprovedPackage.beats,
    mockApprovedPackage.ending,
    mockApprovedPackage.cta,
  ];

  it('should enforce REAL_ASSET_FIRST and reject anime/cartoon styles for factual products', () => {
    const policy = MediaPolicyRouter.getPolicy('REAL_PRODUCT');
    assert.equal(policy.requiresRealAsset, true);
    assert.equal(policy.allowGenerated, false);

    const styleCheck = MediaPolicyRouter.validateStyle('REAL_PRODUCT', '3d anime cartoon');
    assert.equal(styleCheck.isValid, false);
    assert.ok(styleCheck.reason?.includes('nghiêm cấm'));
  });

  it('should break beats into multi-shot cinematic plans (more shots than beats)', () => {
    const { totalShots, shotPlans } = ShotPlanner.planShots(mockApprovedPackage);
    assert.ok(totalShots > mockApprovedPackage.allBeats.length);
    assert.ok(shotPlans.some((s) => s.shotType === 'ESTABLISHING'));
    assert.ok(shotPlans.some((s) => s.shotType === 'DATA_CARD'));
  });

  it('should verify entity matching score and reject generic mismatched images', () => {
    const verified = AssetVerifier.verifyAsset({
      url: 'https://datbike.com/images/weaver-plus-side.jpg',
      entityName: 'DatBike Weaver++',
      sourceDomain: 'datbike.com',
      expectedPurpose: 'Toàn cảnh xe',
      isFromOfficialSource: true,
    });

    assert.equal(verified.isApproved, true);
    assert.equal(verified.isRealEntityAsset, true);
    assert.ok(verified.scores.entityMatch >= 25);
  });

  it('should fallback to clean semantic cards instead of random cartoons when real assets are missing', () => {
    const { shotPlans } = ShotPlanner.planShots(mockApprovedPackage);
    const assetMap = EntityAssetEngine.resolveAssetsForShots({
      scriptPackage: mockApprovedPackage,
      shotPlans,
      candidateImages: [], // No real images available
    });

    assert.equal(assetMap.size, shotPlans.length);
    const firstAsset = assetMap.get(shotPlans[0].shotId);
    assert.ok(firstAsset);
    assert.equal(firstAsset.isRealEntityAsset, false);
    assert.ok(!firstAsset.url.includes('unsplash'));
    assert.ok(firstAsset.url.startsWith('data:semantic/'));
  });
});
