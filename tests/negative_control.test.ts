/**
 * SECTION 14: NEGATIVE CONTROL TEST SUITE
 * Intentionally injects critical failure modes:
 *   1. Gmail / Crawler / Login text
 *   2. Anime / Cartoon visual on factual news topic
 *   3. Wrong person / entity image
 *   4. Wrong location
 *   5. Screen paragraph of 40 words
 *   6. Narration longer than scene (audio clipping)
 *   7. Subtitle block overflow (> 9 words)
 *
 * Mandatory requirement: Quality Gate MUST FAIL ALL OF THEM.
 * If any single negative case passes, the quality system is NOT complete.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PreRenderQualityGate } from '../src/production/preRenderQualityGate.js';
import { MediaPolicyRouter } from '../src/production/mediaPolicyRouter.js';
import { AssetVerifier } from '../src/production/assetVerifier.js';
import { ApprovedScriptPackage } from '../src/types/contentBrain.js';
import { SceneCompositionModel, SubtitleBlock } from '../src/types/productionEngine.js';
import { TimelineScene } from '../src/production/timelineEngine.js';

function createBaseApprovedPackage(contentType: any = 'NEWS'): ApprovedScriptPackage {
  return {
    title: 'Bản Tin Thử Nghiệm',
    topic: 'Tin Tức Bóng Đá Việt Nam',
    targetDuration: 30,
    estimatedDuration: 30,
    contentType,
    primaryEntities: ['Đội tuyển Việt Nam', 'HLV Park Hang-seo'],
    selectedAngle: 'Phân tích chiến thuật',
    viewerPromise: 'Khám phá chiến thuật mới',
    hookStrategy: 'curiosity_gap',
    allBeats: [
      {
        beatId: 1,
        purpose: 'opening_hook',
        narration: 'Đội tuyển Việt Nam bước vào giai đoạn huấn luyện mới.',
        targetDurationSec: 5,
        wordCount: 11,
        displayCopy: {
          headline: 'CHIẾN THUẬT MỚI',
          supportingText: 'Đội hình ra quân',
        },
      },
    ],
    productionDirectives: {
      pace: 'fast',
      visualRhythm: 'cinematic',
      aspectRatio: '9:16',
      colorMood: 'vibrant',
      soundStyle: 'energetic',
      typographyStyle: 'bold_sans',
    },
    approvalReport: {
      passed: true,
      reviewerScore: 92,
      criticalIssues: 0,
      majorIssues: 0,
      minorIssues: 0,
      reviewerSummary: 'Kịch bản đạt chuẩn',
    },
  };
}

describe('Section 14: Negative Control Injections', () => {
  it('Negative 1: Injected Gmail / Crawler login text MUST FAIL PreRender Quality Gate', () => {
    const pkg = createBaseApprovedPackage('NEWS');
    const scenes: TimelineScene[] = [
      {
        id: 1,
        beatId: 1,
        headline: 'GMAIL INBOX 14',
        supportingText: 'Please sign in to continue reading',
        narration: 'Nội dung bình thường',
        startTimeSec: 0,
        durationSec: 5,
        audioDurationSec: 5,
        audioFilePath: 'dummy.mp3',
        assetPath: 'photo.jpg',
      },
    ];

    const compositions: SceneCompositionModel[] = [
      {
        beatId: 1,
        layoutArchetype: 'hero_title_card',
        headline: 'GMAIL INBOX 14',
        supportingText: 'Please sign in to continue reading',
        primaryAssetPath: 'photo.jpg',
      },
    ];

    const result = PreRenderQualityGate.inspect({
      scriptPackage: pkg,
      timelineScenes: scenes,
      compositions,
    });

    assert.strictEqual(result.passed, false, 'Gmail/login junk must FAIL PreRenderQualityGate');
    assert.strictEqual(result.noMetadataLeakage, false, 'noMetadataLeakage must be false');
    assert.ok(
      result.violations.some((v) => /crawler\/login/i.test(v) || /gmail/i.test(v)),
      'Violation must cite crawler/login garbage'
    );
  });

  it('Negative 2: Anime / Cartoon visual on factual news topic MUST FAIL PreRender Quality Gate', () => {
    const pkg = createBaseApprovedPackage('NEWS');
    const scenes: TimelineScene[] = [
      {
        id: 1,
        beatId: 1,
        headline: 'ĐỘI TUYỂN VIỆT NAM',
        supportingText: 'Tập luyện cường độ cao',
        narration: 'Nội dung bóng đá chuẩn.',
        startTimeSec: 0,
        durationSec: 5,
        audioDurationSec: 5,
        audioFilePath: 'dummy.mp3',
        assetPath: 'assets/anime_park_hang_seo.png',
      },
    ];

    const compositions: SceneCompositionModel[] = [
      {
        beatId: 1,
        layoutArchetype: 'hero_title_card',
        headline: 'ĐỘI TUYỂN VIỆT NAM',
        supportingText: 'Tập luyện cường độ cao',
        primaryAssetPath: 'assets/anime_park_hang_seo.png',
      },
    ];

    const result = PreRenderQualityGate.inspect({
      scriptPackage: pkg,
      timelineScenes: scenes,
      compositions,
    });

    assert.strictEqual(result.passed, false, 'Anime on factual news must FAIL PreRenderQualityGate');
    assert.strictEqual(result.noGenericCartoonsOnFactual, false, 'noGenericCartoonsOnFactual must be false');
    assert.ok(
      result.violations.some((v) => /hoạt hình\/anime/i.test(v)),
      'Violation must specifically identify cartoon/anime violation'
    );
  });

  it('Negative 3: Wrong person image MUST FAIL AssetVerifier', () => {
    const asset = AssetVerifier.verifyAsset({
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb-young-woman-fashion',
      entityName: 'HLV Park Hang-seo',
      sourceDomain: 'unsplash.com',
      expectedPurpose: 'Chân dung HLV Park Hang-seo',
      isFromOfficialSource: false,
    });

    assert.strictEqual(asset.isApproved, false, 'Wrong person image must be rejected');
    assert.strictEqual(asset.isRealEntityAsset, false, 'isRealEntityAsset must be false');
    assert.ok(asset.scores.entityMatch < 18, `Entity match must be low, got: ${asset.scores.entityMatch}`);
  });

  it('Negative 4: Wrong location MUST FAIL AssetVerifier', () => {
    const asset = AssetVerifier.verifyAsset({
      url: 'https://images.unsplash.com/photo-paris-france-eiffel-tower',
      entityName: 'Đèo Mã Pí Lèng Hà Giang',
      sourceDomain: 'unsplash.com',
      expectedPurpose: 'Khung cảnh đèo Mã Pí Lèng',
      isFromOfficialSource: false,
    });

    assert.strictEqual(asset.isApproved, false, 'Wrong location must be rejected');
    assert.strictEqual(asset.isRealEntityAsset, false, 'isRealEntityAsset must be false');
    assert.ok(asset.scores.entityMatch < 18, `Entity match for wrong location must be low, got ${asset.scores.entityMatch}`);
  });

  it('Negative 5: Screen text paragraph of 40 words MUST FAIL PreRender Quality Gate', () => {
    const pkg = createBaseApprovedPackage('REAL_PRODUCT');
    const paragraph40Words =
      'Xe máy điện này có khả năng di chuyển liên tục trên quãng đường cực kỳ dài lên tới hơn hai trăm kilomet cho mỗi một lần sạc đầy pin và mang lại khả năng tiết kiệm chi phí vận hành tối đa cho người sử dụng trong đô thị.';

    const scenes: TimelineScene[] = [
      {
        id: 1,
        beatId: 1,
        headline: 'ĐIỂM NỔI BẬT',
        supportingText: paragraph40Words,
        narration: 'Lời bình ngắn.',
        startTimeSec: 0,
        durationSec: 5,
        audioDurationSec: 5,
        audioFilePath: 'dummy.mp3',
        assetPath: 'photo.jpg',
      },
    ];

    const compositions: SceneCompositionModel[] = [
      {
        beatId: 1,
        layoutArchetype: 'hero_title_card',
        headline: 'ĐIỂM NỔI BẬT',
        supportingText: paragraph40Words,
        primaryAssetPath: 'photo.jpg',
      },
    ];

    const result = PreRenderQualityGate.inspect({
      scriptPackage: pkg,
      timelineScenes: scenes,
      compositions,
    });

    assert.strictEqual(result.passed, false, '40-word paragraph must FAIL PreRenderQualityGate');
    assert.strictEqual(result.noScreenParagraphs, false, 'noScreenParagraphs must be false');
    assert.ok(
      result.violations.some((v) => /vượt quá 12 từ/i.test(v)),
      'Violation must cite exceeding word limits'
    );
  });

  it('Negative 6: Narration longer than scene duration (audio clipping) MUST FAIL PreRender Quality Gate', () => {
    const pkg = createBaseApprovedPackage('NEWS');
    // Audio is 8.5s but scene is artificially set to 5.0s -> clips speech!
    const scenes: TimelineScene[] = [
      {
        id: 1,
        beatId: 1,
        headline: 'BẢN TIN NÓNG',
        supportingText: 'Cập nhật trực tiếp',
        narration: 'Đoạn thuyết minh rất dài vượt quá thời lượng khung hình cho phép.',
        startTimeSec: 0,
        durationSec: 5.0,
        audioDurationSec: 8.5,
        audioFilePath: 'dummy.mp3',
        assetPath: 'photo.jpg',
      },
    ];

    const compositions: SceneCompositionModel[] = [
      {
        beatId: 1,
        layoutArchetype: 'hero_title_card',
        headline: 'BẢN TIN NÓNG',
        supportingText: 'Cập nhật trực tiếp',
        primaryAssetPath: 'photo.jpg',
      },
    ];

    const result = PreRenderQualityGate.inspect({
      scriptPackage: pkg,
      timelineScenes: scenes,
      compositions,
    });

    assert.strictEqual(result.passed, false, 'Audio clipping must FAIL PreRenderQualityGate');
    assert.strictEqual(result.noNarrationClipping, false, 'noNarrationClipping must be false');
    assert.ok(
      result.violations.some((v) => /nhỏ hơn audio/i.test(v)),
      'Violation must cite audio clipping'
    );
  });

  it('Negative 7: Subtitle overflow (> 9 words per block) MUST FAIL PreRender Quality Gate', () => {
    const pkg = createBaseApprovedPackage('NEWS');
    const scenes: TimelineScene[] = [
      {
        id: 1,
        beatId: 1,
        headline: 'TIÊU ĐỀ CHUẨN',
        supportingText: 'Mô tả ngắn',
        narration: 'Lời bình chuẩn.',
        startTimeSec: 0,
        durationSec: 5,
        audioDurationSec: 5,
        audioFilePath: 'dummy.mp3',
        assetPath: 'photo.jpg',
      },
    ];

    const compositions: SceneCompositionModel[] = [
      {
        beatId: 1,
        layoutArchetype: 'hero_title_card',
        headline: 'TIÊU ĐỀ CHUẨN',
        supportingText: 'Mô tả ngắn',
        primaryAssetPath: 'photo.jpg',
      },
    ];

    const overflowingCaptions: SubtitleBlock[] = [
      {
        id: 1,
        beatId: 1,
        text: 'Khối phụ đề này chứa quá nhiều từ và chắc chắn sẽ bị tràn màn hình thiết bị di động của người xem',
        startSec: 0,
        endSec: 5,
        safeAreaChecked: false,
      },
    ];

    const result = PreRenderQualityGate.inspect({
      scriptPackage: pkg,
      timelineScenes: scenes,
      compositions,
      captions: overflowingCaptions,
    });

    assert.strictEqual(result.passed, false, 'Subtitle block > 9 words must FAIL PreRenderQualityGate');
    assert.strictEqual(result.subtitleTimestampsValid, false, 'subtitleTimestampsValid must be false');
    assert.ok(
      result.violations.some((v) => /Phụ đề ID 1 quá dài/i.test(v)),
      'Violation must cite subtitle overflow'
    );
  });
});
