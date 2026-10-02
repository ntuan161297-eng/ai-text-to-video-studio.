import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CaptionDirector } from '../src/production/captionDirector.js';
import { TimelineEngine } from '../src/production/timelineEngine.js';
import { ShotPlanner } from '../src/production/shotPlanner.js';
import { EntityAssetEngine } from '../src/production/entityAssetEngine.js';
import { ApprovedScriptPackage } from '../src/types/contentBrain.js';
import { BeatAudioTiming } from '../src/types/productionEngine.js';

describe('Milestone 8: Voice-First Timeline, Audio Measurement & Anti-Padding', () => {
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
      narration: 'DatBike Weaver++ vừa tạo nên một bước ngoặt thực sự mà rất ít người để ý kỹ!',
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
        narration: 'Xe có thể sạc siêu nhanh trong 3 giờ với quãng đường di chuyển 200 km chỉ trong một lần sạc.',
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

  const mockTimings: BeatAudioTiming[] = [
    {
      beatId: 1,
      audioPath: '/tmp/beat_1.mp3',
      durationSec: 5.5,
      wordCount: 16,
      speakingRateWordsPerSec: 2.9,
      startSec: 0,
      endSec: 5.5,
    },
    {
      beatId: 2,
      audioPath: '/tmp/beat_2.mp3',
      durationSec: 7.2,
      wordCount: 20,
      speakingRateWordsPerSec: 2.77,
      startSec: 5.5,
      endSec: 12.7,
    },
    {
      beatId: 3,
      audioPath: '/tmp/beat_3.mp3',
      durationSec: 6.0,
      wordCount: 16,
      speakingRateWordsPerSec: 2.66,
      startSec: 12.7,
      endSec: 18.7,
    },
    {
      beatId: 4,
      audioPath: '/tmp/beat_4.mp3',
      durationSec: 5.0,
      wordCount: 14,
      speakingRateWordsPerSec: 2.8,
      startSec: 18.7,
      endSec: 23.7,
    },
  ];

  it('should generate chunked subtitle blocks aligned with actual audio timestamps', () => {
    const subtitles = CaptionDirector.generateCaptions(mockApprovedPackage, mockTimings);
    assert.ok(subtitles.length >= 4);

    for (const sub of subtitles) {
      const words = sub.text.split(/\s+/).filter(Boolean);
      assert.ok(words.length >= 3 && words.length <= 9);
      assert.ok(sub.endSec > sub.startSec);
    }
  });

  it('should build a zero-padding timeline where scene duration exactly matches audio duration', () => {
    const { shotPlans } = ShotPlanner.planShots(mockApprovedPackage);
    const assetMap = EntityAssetEngine.resolveAssetsForShots({
      scriptPackage: mockApprovedPackage,
      shotPlans,
    });

    const timeline = TimelineEngine.buildTimeline({
      scriptPackage: mockApprovedPackage,
      beatTimings: mockTimings,
      shotPlans,
      assetMap,
    });

    assert.equal(timeline.scenes.length, mockApprovedPackage.allBeats.length);
    assert.equal(timeline.totalDurationSec, 23.7);

    // Verify scene durations precisely match audio duration (zero silent padding!)
    for (let i = 0; i < timeline.scenes.length; i++) {
      const sc = timeline.scenes[i];
      const audioTiming = mockTimings[i];
      assert.equal(sc.durationSec, audioTiming.durationSec);
      assert.equal(sc.startTimeSec, audioTiming.startSec);
    }
  });
});
