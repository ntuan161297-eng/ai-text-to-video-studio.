import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

process.env.TEST_OFFLINE_MODE = 'true';
import { JobIsolation } from '../src/engine/jobIsolation.js';
import { RevisionIntentClassifier } from '../src/engine/revisionIntentClassifier.js';
import { RevisionEngine } from '../src/engine/revisionEngine.js';
import { MasterVideoEngine } from '../src/engine/masterVideoEngine.js';
import { VideoVersionRecord } from '../src/types/jobContext.js';
import { getDatabase } from '../src/database/db.js';

describe('CRITICAL STATE & REVISION ARCHITECTURE TEST SUITE', () => {

  // =========================================================================
  // TEST 1: CREATE_NEW A ("DatBike") then CREATE_NEW B ("Hệ Mặt Trời")
  // Assert: B không có entity/content/assets của A.
  // =========================================================================
  it('TEST 1: CREATE_NEW A then CREATE_NEW B has ZERO cross-contamination', async () => {
    const jobAId = `job_test1_a_${uuidv4().slice(0, 8)}`;
    const promptA = 'Tạo video giới thiệu xe máy điện DatBike Weaver hiệu năng vượt trội pin siêu trâu';
    const workspaceA = JobIsolation.initWorkspace({
      jobId: jobAId,
      prompt: promptA,
      duration: 60,
    });

    const briefA = { primaryEntities: ['DatBike', 'Weaver', 'xe máy điện', 'pin'] };
    JobIsolation.registerJobEntities(jobAId, promptA, briefA.primaryEntities);

    // Job B: completely different topic
    const jobBId = `job_test1_b_${uuidv4().slice(0, 8)}`;
    const promptB = 'Khám phá các hành tinh kỳ vĩ trong Hệ Mặt Trời từ Sao Thủy đến Sao Hải Vương';
    const workspaceB = JobIsolation.initWorkspace({
      jobId: jobBId,
      prompt: promptB,
      duration: 60,
    });

    const briefB = { primaryEntities: ['Hệ Mặt Trời', 'Sao Thủy', 'Sao Hỏa', 'Sao Mộc', 'Sao Thổ'] };
    JobIsolation.registerJobEntities(jobBId, promptB, briefB.primaryEntities);

    // Assert isolated workspaces
    assert.notStrictEqual(workspaceA.jobId, workspaceB.jobId);
    assert.notStrictEqual(workspaceA.inputHash, workspaceB.inputHash);
    assert.notStrictEqual(workspaceA.tempDir, workspaceB.tempDir);

    // Assert Job B content checks
    const sampleContentB = JSON.stringify({
      topic: 'Hệ Mặt Trời',
      narration: 'Sao Mộc là hành tinh lớn nhất trong Hệ Mặt Trời với bão đỏ khổng lồ.',
      facts: ['Sao Hỏa có bề mặt màu đỏ', 'Sao Thổ có vành đai tráng lệ'],
    });

    // Should PASS with no error
    assert.doesNotThrow(() => {
      JobIsolation.assertNoContamination({
        currentJobId: jobBId,
        currentPrompt: promptB,
        currentEntities: briefB.primaryEntities,
        contentToCheck: sampleContentB,
        stageName: '07_verified_facts',
      });
    });

    // Content containing entity from A into B must be caught and rejected!
    const contaminatedContent = JSON.stringify({
      topic: 'Hệ Mặt Trời',
      narration: 'Sao Hỏa là hành tinh đỏ, DatBike có tốc độ cực nhanh.',
    });

    assert.throws(
      () => {
        JobIsolation.assertNoContamination({
          currentJobId: jobBId,
          currentPrompt: promptB,
          currentEntities: briefB.primaryEntities,
          contentToCheck: contaminatedContent,
          stageName: '07_verified_facts',
        });
      },
      /CRITICAL CROSS_JOB_CONTAMINATION/
    );
  });

  // =========================================================================
  // TEST 2: REVISE A: "Đổi hình scene 2"
  // Assert: A v2 giữ script của A v1 nhưng thay visual; v1 phải giữ nguyên.
  // =========================================================================
  it('TEST 2: REVISE A preserves v1 and regenerates only visual in v2 (Copy-On-Write)', async () => {
    const videoId = `video_${uuidv4().slice(0, 8)}`;
    const basePrompt = 'Đánh giá DatBike Weaver 200';

    const v1ApprovedScript = {
      title: 'ĐÁNH GIÁ DATBIKE WEAVER 200',
      allBeats: [
        { beatId: 1, narration: 'DatBike Weaver 200 là mẫu xe điện đột phá của startup Việt Nam.' },
        { beatId: 2, narration: 'Khung xe chắc chắn với động cơ điện công suất lớn 6000W.' },
        { beatId: 3, narration: 'Quãng đường di chuyển ấn tượng lên tới 200km cho một lần sạc.' },
      ],
    };

    const v1AudioReport = {
      totalDurationSec: 45,
      beatTimings: [
        { beatId: 1, durationSec: 15, audioPath: '/audio/beat_1.wav' },
        { beatId: 2, durationSec: 15, audioPath: '/audio/beat_2.wav' },
        { beatId: 3, durationSec: 15, audioPath: '/audio/beat_3.wav' },
      ],
    };

    const v1Assets = {
      shot_1: { entityName: 'DatBike Weaver', url: 'https://example.com/weaver1.jpg', isApproved: true },
      shot_2: { entityName: 'Động cơ sai hình', url: 'https://example.com/wrong_motor.jpg', isApproved: false },
      shot_3: { entityName: 'Pin 200km', url: 'https://example.com/battery.jpg', isApproved: true },
    };

    const v1Record: VideoVersionRecord = {
      id: `ver_${videoId}_v1`,
      videoId,
      versionNumber: 1,
      parentVersionId: null,
      originalPrompt: basePrompt,
      approvedScript: v1ApprovedScript,
      storyboard: { totalDuration: 45 },
      assets: v1Assets,
      audioReport: v1AudioReport,
      outputUrl: `http://localhost:4000/output/${videoId}/v1/final.mp4`,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    // User feedback: "Đổi hình scene 2 dùng sai hình, giữ nguyên kịch bản và giọng đọc"
    const feedback = 'Đổi hình scene 2 dùng sai hình, giữ nguyên kịch bản và giọng đọc';
    const analysis = RevisionIntentClassifier.analyzeFeedback(feedback);

    assert.strictEqual(analysis.detectedScope, 'VISUAL');
    assert.strictEqual(analysis.unaffectedStages.includes('14_approved_script'), true);
    assert.strictEqual(analysis.unaffectedStages.includes('19_voice'), true);
    assert.strictEqual(analysis.affectedStages.includes('18_verified_assets'), true);

    // Initialize Copy-on-Write workspace for v2
    const revisionWs = RevisionEngine.initRevisionWorkspace({
      baseVersion: v1Record,
      feedback,
      scope: analysis.detectedScope,
    });

    assert.strictEqual(revisionWs.jobContext.versionNumber, 2);
    assert.strictEqual(revisionWs.jobContext.baseVersionId, v1Record.id);
    assert.strictEqual(revisionWs.jobContext.operation, 'REVISE_EXISTING');
    assert.strictEqual(revisionWs.versionOutputDir.includes('v2'), true);

    // Prepare revision data
    const prep = RevisionEngine.prepareRevisionData(v1Record, 'VISUAL');
    assert.strictEqual(prep.mustRegenerate.script, false);
    assert.strictEqual(prep.mustRegenerate.voice, false);
    assert.strictEqual(prep.mustRegenerate.visuals, true);

    // Script and Voice are reused identically from v1
    assert.deepStrictEqual(prep.reusedScript, v1ApprovedScript);
    assert.deepStrictEqual(prep.reusedAudioReport, v1AudioReport);

    // v1 data remains completely immutable!
    assert.strictEqual(v1Record.versionNumber, 1);
    assert.strictEqual(v1Record.outputUrl, `http://localhost:4000/output/${videoId}/v1/final.mp4`);
  });

  // =========================================================================
  // TEST 3: Sau REVISE A, CREATE_NEW C: "Ẩm thực Huế"
  // Assert: C không chứa: DatBike, scene của A, research A, feedback A.
  // =========================================================================
  it('TEST 3: CREATE_NEW C after REVISE A is completely free from A entities and feedback', async () => {
    const jobCId = `job_test3_c_${uuidv4().slice(0, 8)}`;
    const promptC = 'Khám phá ẩm thực Huế với bún bò Huế, bánh bèo, bánh nậm và chè heo quay';
    const workspaceC = JobIsolation.initWorkspace({
      jobId: jobCId,
      prompt: promptC,
      duration: 60,
    });

    const briefC = { primaryEntities: ['ẩm thực Huế', 'bún bò Huế', 'bánh bèo', 'bánh nậm', 'chè heo quay'] };
    JobIsolation.registerJobEntities(jobCId, promptC, briefC.primaryEntities);

    // Verify workspace C is pristine
    assert.strictEqual(workspaceC.jobId, jobCId);
    assert.strictEqual(workspaceC.snapshot.originalPrompt, promptC);

    const validContentC = JSON.stringify({
      topic: 'Ẩm thực Huế',
      scenes: [
        { beat: 1, text: 'Bún bò Huế cay nồng với nước dùng đậm đà hương sả ruốc.' },
        { beat: 2, text: 'Bánh bèo chén nhỏ tôm chấy giòn tan chấm nước mắm ớt.' },
      ],
    });

    assert.doesNotThrow(() => {
      JobIsolation.assertNoContamination({
        currentJobId: jobCId,
        currentPrompt: promptC,
        currentEntities: briefC.primaryEntities,
        contentToCheck: validContentC,
        stageName: '14_approved_script',
      });
    });

    // Leak test: If any DatBike or Weaver or revision feedback leaks into C:
    const leakedContentC = JSON.stringify({
      topic: 'Ẩm thực Huế',
      scenes: [
        { beat: 1, text: 'Bún bò Huế ngon tuyệt, DatBike Weaver đi ăn bún bò.' },
      ],
    });

    assert.throws(
      () => {
        JobIsolation.assertNoContamination({
          currentJobId: jobCId,
          currentPrompt: promptC,
          currentEntities: briefC.primaryEntities,
          contentToCheck: leakedContentC,
          stageName: '14_approved_script',
        });
      },
      /CRITICAL CROSS_JOB_CONTAMINATION/
    );
  });

  // =========================================================================
  // TEST 4: Revision Intent Classifier Scope & Dependency Resolution
  // Assert: Scopes are accurately identified without full pipeline re-run.
  // =========================================================================
  it('TEST 4: RevisionIntentClassifier maps accurately across all scopes', () => {
    const cases = [
      { text: 'Ảnh scene 3 sai, đổi hình khác', expectedScope: 'VISUAL', scriptRegen: false, visualRegen: true },
      { text: 'Voice đọc quá nhanh, phát âm lại đoạn cuối', expectedScope: 'VOICE', scriptRegen: false, visualRegen: false, voiceRegen: true },
      { text: 'Hook chưa thu hút, viết lại lời mở đầu', expectedScope: 'SCRIPT', scriptRegen: true, visualRegen: true, voiceRegen: true },
      { text: 'Caption quá dài, chia nhỏ phụ đề', expectedScope: 'CAPTION', scriptRegen: false, visualRegen: false, captionRegen: true },
      { text: 'Video này nhìn tổng thể chưa ổn, làm lại từ đầu', expectedScope: 'FULL', scriptRegen: true, visualRegen: true, voiceRegen: true },
    ];

    for (const c of cases) {
      const result = RevisionIntentClassifier.analyzeFeedback(c.text);
      assert.strictEqual(result.detectedScope, c.expectedScope, `Failed for text: "${c.text}"`);

      const deps = RevisionEngine.prepareRevisionData({
        id: 'ver_test',
        videoId: 'vid_test',
        versionNumber: 1,
        parentVersionId: null,
        originalPrompt: 'test',
        status: 'completed',
        createdAt: new Date().toISOString(),
      }, result.detectedScope);

      if (c.scriptRegen !== undefined) {
        assert.strictEqual(deps.mustRegenerate.script, c.scriptRegen, `Script regen mismatch for ${c.expectedScope}`);
      }
      if (c.visualRegen !== undefined) {
        assert.strictEqual(deps.mustRegenerate.visuals, c.visualRegen, `Visual regen mismatch for ${c.expectedScope}`);
      }
    }
  });

  // =========================================================================
  // TEST 5: Database Video Version Lifecycle & Isolation
  // Assert: LocalJson / Postgres DB preserves v1 on revision and links parentVersionId
  // =========================================================================
  it('TEST 5: Database creates v1, then v2 linked by parentVersionId, preserving v1', async () => {
    const db = await getDatabase();
    const videoId = `vid_unit_${uuidv4().slice(0, 8)}`;

    // Create Video
    await db.createVideo({
      id: videoId,
      user_id: 'user_1',
      prompt: 'Xe điện VinFast',
      duration: 60,
      aspect_ratio: '9:16',
      voice: 'vi-VN-HoaiMyNeural',
      style: 'realistic',
      caption_enabled: true,
      bgm_enabled: true,
      engine: 'hyperframes',
    });

    // Version 1
    const v1 = await db.createVersion({
      id: `ver_${videoId}_v1`,
      videoId,
      versionNumber: 1,
      parentVersionId: null,
      originalPrompt: 'Xe điện VinFast',
      status: 'completed',
      outputUrl: `http://localhost:4000/output/${videoId}/v1/final.mp4`,
      createdAt: new Date().toISOString(),
      approvedScript: { headline: 'VINFAST VF9' },
    });

    assert.strictEqual(v1.versionNumber, 1);
    assert.strictEqual(v1.parentVersionId, null);

    // Version 2 (Revision)
    const v2 = await db.createVersion({
      id: `ver_${videoId}_v2`,
      videoId,
      versionNumber: 2,
      parentVersionId: v1.id,
      originalPrompt: 'Xe điện VinFast',
      feedback: 'Chỉnh sửa phụ đề',
      revisionScope: 'CAPTION',
      status: 'completed',
      outputUrl: `http://localhost:4000/output/${videoId}/v2/final.mp4`,
      createdAt: new Date().toISOString(),
      approvedScript: v1.approvedScript, // copy-on-write reference
    });

    assert.strictEqual(v2.versionNumber, 2);
    assert.strictEqual(v2.parentVersionId, v1.id);
    assert.strictEqual(v2.revisionScope, 'CAPTION');

    // Fetch all versions for this video
    const allVersions = await db.getVersionsByVideoId(videoId);
    assert.strictEqual(allVersions.length, 2);
    assert.strictEqual(allVersions[0].versionNumber, 1);
    assert.strictEqual(allVersions[1].versionNumber, 2);

    // Check v1 was NOT modified or overwritten
    const v1Fetched = await db.getVersionById(v1.id);
    assert.strictEqual(v1Fetched?.outputUrl, `http://localhost:4000/output/${videoId}/v1/final.mp4`);
    assert.strictEqual(v1Fetched?.versionNumber, 1);

    // Latest version is v2
    const latest = await db.getLatestVersionByVideoId(videoId);
    assert.strictEqual(latest?.versionNumber, 2);
    assert.strictEqual(latest?.id, v2.id);
  });
});
