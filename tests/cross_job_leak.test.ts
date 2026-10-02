import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

process.env.TEST_OFFLINE_MODE = 'true';
import { JobIsolation } from '../src/engine/jobIsolation.js';
import { InputUnderstandingEngine } from '../src/brain/inputUnderstandingEngine.js';
import { ResearchQueryPlanner } from '../src/brain/researchQueryPlanner.js';
import { KnowledgeBriefBuilder } from '../src/brain/knowledgeBriefBuilder.js';
import { ContentStrategist } from '../src/brain/contentStrategist.js';
import { CreativeAngleEngine } from '../src/brain/creativeAngleEngine.js';
import { HookCandidateEngine } from '../src/brain/hookCandidateEngine.js';
import { SeniorScriptWriter } from '../src/brain/seniorScriptWriter.js';
import { IndependentScriptReviewer } from '../src/brain/independentScriptReviewer.js';
import { ScriptQualityGate } from '../src/brain/scriptQualityGate.js';
import { ShotPlanner } from '../src/production/shotPlanner.js';
import { EntityAssetEngine } from '../src/production/entityAssetEngine.js';
import { TimelineEngine } from '../src/production/timelineEngine.js';
import { CaptionDirector } from '../src/production/captionDirector.js';
import { SceneCompositionEngine } from '../src/production/sceneCompositionEngine.js';
import { PreRenderQualityGate } from '../src/production/preRenderQualityGate.js';
import { FactVerificationEngine } from '../src/brain/factVerificationEngine.js';
import { ObservabilityLogger } from '../src/production/observabilityLogger.js';
import { downloadRealisticVisuals } from '../src/utils/realisticVisuals.js';
import { VoiceDirector } from '../src/production/voiceDirector.js';

interface PipelineRunResult {
  jobId: string;
  inputHash: string;
  workspace: any;
  brief: any;
  factResult: any;
  approvedPackage: any;
  timeline: any;
  captions: any;
  compositions: any;
  manifest: any;
  artifactsDir: string;
}

/**
 * Executes the complete 20-stage pipeline in memory and disk up to render manifest,
 * verifying strict isolation and provenance.
 */
async function runIsolatedPipeline(prompt: string, customJobId?: string): Promise<PipelineRunResult> {
  const jobId = customJobId || `job_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const testRoot = path.resolve('./temp/test-runs');
  
  const workspace = JobIsolation.initWorkspace({
    jobId,
    prompt,
    duration: 60,
    baseTempDir: testRoot,
    baseOutputDir: testRoot,
  });

  // Stage 1: Input Understanding
  const brief = InputUnderstandingEngine.analyze(prompt, { duration: 60 });
  JobIsolation.registerJobEntities(jobId, prompt, brief.primaryEntities);

  // Stage 2: Query Planning
  const queryPlan = ResearchQueryPlanner.plan(brief);

  // Stage 3: Simulated Research & Verified Facts
  const syntheticSources = [
    {
      url: `https://example.com/test-${jobId}`,
      title: `${brief.topic} - Tổng quan chuyên sâu`,
      domain: 'example.com',
      relevanceScore: 90,
      extractedSnippet: `Thông tin xác thực về ${brief.topic}. Các đặc điểm chính bao gồm thông số và phân tích chi tiết.`,
      cleanedContent: `Nội dung cốt lõi của ${brief.topic} được nghiên cứu độc lập.`,
    },
  ];

  const factResult = FactVerificationEngine.verifyFacts(syntheticSources, brief.primaryEntities);
  JobIsolation.assertNoContamination({
    currentJobId: jobId,
    currentPrompt: prompt,
    currentEntities: brief.primaryEntities,
    contentToCheck: factResult.facts.map((f: any) => f.claim).join(' '),
    stageName: '07_verified_facts',
  });

  // Stage 4: Knowledge Brief
  const knowledgeBrief = KnowledgeBriefBuilder.build(brief, factResult.facts);

  // Stage 5: Content Strategy
  const strategy = ContentStrategist.formulateStrategy(brief, knowledgeBrief);

  // Stage 6: Creative Angle
  const { allAngles, selectedAngle } = CreativeAngleEngine.generateAngles(brief, knowledgeBrief, strategy);

  // Stage 7: Hooks
  const { allHooks, selectedHook } = HookCandidateEngine.generateHooks(brief, knowledgeBrief, selectedAngle);

  // Stage 8: Script Draft
  const scriptDraft = SeniorScriptWriter.writeScript({
    brief,
    knowledge: knowledgeBrief,
    strategy,
    selectedAngle,
    selectedHook,
    verifiedFacts: factResult.facts,
  });

  // Stage 9: Script Review
  const scriptReview = IndependentScriptReviewer.review({
    brief,
    knowledge: knowledgeBrief,
    strategy,
    verifiedFacts: factResult.facts,
    script: scriptDraft,
  });

  // Stage 10: Script Approval
  const gateResult = ScriptQualityGate.processGate({
    brief,
    knowledge: knowledgeBrief,
    strategy,
    verifiedFacts: factResult.facts,
    script: scriptDraft,
  });
  const approvedPackage = gateResult.approvedPackage!;

  // Content Contamination Assertion on Approved Script
  const allScriptNarration = approvedPackage.allBeats.map((b: any) => b.narration).join(' ');
  JobIsolation.assertNoContamination({
    currentJobId: jobId,
    currentPrompt: prompt,
    currentEntities: brief.primaryEntities,
    contentToCheck: allScriptNarration,
    stageName: '14_approved_script',
  });

  // Stage 11: Visual Assets Isolation
  const downloadedVisuals = await downloadRealisticVisuals(
    prompt,
    4,
    workspace.assetsDir,
    undefined,
    undefined,
    jobId,
    brief.contentType.toLowerCase()
  );

  // Stage 12: Shot Planning & Asset Resolution
  const { shotPlans } = ShotPlanner.planShots(approvedPackage);

  const downloadedList = Array.isArray(downloadedVisuals) ? downloadedVisuals : (downloadedVisuals as any).visuals || [];
  const assetMap = EntityAssetEngine.resolveAssetsForShots({
    scriptPackage: approvedPackage,
    shotPlans,
    candidateImages: downloadedList,
  });

  // Stage 13: Voice synthesis
  const audioReport = await VoiceDirector.synthesizeBeats({
    scriptPackage: approvedPackage,
    outputDir: workspace.audioDir,
    jobId,
    syntheticAudio: true,
  });

  // Stage 14: Timeline & Captions & Compositions
  const timeline = TimelineEngine.buildTimeline({
    scriptPackage: approvedPackage,
    beatTimings: audioReport.beatTimings,
    shotPlans,
    assetMap,
  });

  const captions = CaptionDirector.generateCaptions(
    approvedPackage,
    audioReport.beatTimings
  );

  const compositions = SceneCompositionEngine.composeScenes({
    scriptPackage: approvedPackage,
    shotPlans,
    assetMap,
  });

  // Stage 15: Quality Gate
  const preRenderCheck = PreRenderQualityGate.inspect({
    scriptPackage: approvedPackage,
    timelineScenes: timeline.scenes,
    compositions,
    captions,
  });
  assert.ok(preRenderCheck.passed, `PreRenderQualityGate failed: ${preRenderCheck.violations.join('; ')}`);

  // Stage 16: Render Manifest creation
  const manifestAssets = timeline.scenes.map((ts: any, idx: number) => {
    const asset = assetMap.get(ts?.shotId || `shot_${ts?.beatId}`);
    return {
      sceneId: idx + 1,
      shotId: ts?.shotId || `shot_${idx + 1}`,
      filePath: asset?.localPath || '',
      entityName: asset?.entityName || '',
      isRealEntityAsset: !!asset?.isRealEntityAsset,
    };
  });

  const manifestVoiceFiles = audioReport.beatTimings.map((bt: any) => ({
    beatId: bt.beatId,
    filePath: bt.audioPath,
    durationSec: bt.durationSec,
  }));

  const manifestCaptions = captions.map((c: any) => ({
    beatId: c.beatId,
    text: c.text,
    startSec: c.startSec,
    endSec: c.endSec,
  }));

  const manifest = JobIsolation.createRenderManifest(workspace, {
    title: approvedPackage.title,
    targetDuration: timeline.totalDurationSec,
    scriptArtifact: path.join(workspace.artifactsDir, 'approved_script.json'),
    storyboardArtifact: path.join(workspace.artifactsDir, '17_timeline.json'),
    assets: manifestAssets,
    voiceFiles: manifestVoiceFiles,
    captions: manifestCaptions,
    expectedEntities: brief.primaryEntities,
  });

  // Stage 17: Save discrete artifacts
  const artifactsDir = ObservabilityLogger.saveArtifacts(
    jobId,
    {
      '01_input': workspace.snapshot,
      '02_content_brief': brief,
      '07_verified_facts': factResult.facts,
      '14_approved_script': approvedPackage,
      '15_storyboard': timeline,
      '19_voice': audioReport,
      '21_caption': captions,
      '22_composition': compositions,
    },
    workspace.outputDir,
    workspace.inputHash
  );

  return {
    jobId,
    inputHash: workspace.inputHash,
    workspace,
    brief,
    factResult,
    approvedPackage,
    timeline,
    captions,
    compositions,
    manifest,
    artifactsDir,
  };
}

describe('P0 Cross-Job Content Contamination & Isolation Suite', () => {
  it('Requirement 1 & 16: Sequential Trace A -> B exhibits ZERO contamination', async () => {
    const promptA = 'Tạo video 60 giây về xe máy điện.';
    const promptB = 'Tạo video 60 giây về các hành tinh trong hệ Mặt Trời.';

    console.log('[Test] Running Sequential Job A...');
    const resA = await runIsolatedPipeline(promptA);

    console.log('[Test] Running Sequential Job B without restarting...');
    const resB = await runIsolatedPipeline(promptB);

    // 1. Verify Job IDs are completely distinct
    assert.notStrictEqual(resA.jobId, resB.jobId);
    assert.notStrictEqual(resA.inputHash, resB.inputHash);

    // 2. Verify Job B approved script contains ZERO Job A entities
    const jobAEntities = ['xe máy', 'datbike', 'pin', 'trạm sạc', 'quãng đường', 'động cơ điện', 'vinfast'];
    const jobBScriptText = resB.approvedPackage.allBeats.map((b: any) => b.narration).join(' ').toLowerCase();

    for (const ent of jobAEntities) {
      assert.ok(
        !jobBScriptText.includes(ent),
        `Contamination detected: Job B script contains Job A entity "${ent}"`
      );
    }

    // 3. Verify Job B assets belong ONLY to Job B directory
    assert.ok(resB.manifest.assets.length > 0);
    for (const asset of resB.manifest.assets) {
      if (asset.filePath) {
        assert.ok(
          asset.filePath.includes(resB.jobId),
          `Asset path "${asset.filePath}" does not belong to Job B "${resB.jobId}"`
        );
        assert.ok(
          !asset.filePath.includes(resA.jobId),
          `Asset path "${asset.filePath}" contains Job A jobId "${resA.jobId}"`
        );
      }
    }

    // 4. Verify Job B voice files belong ONLY to Job B directory and contain Job B narration
    assert.ok(resB.manifest.voiceFiles.length > 0);
    for (const vf of resB.manifest.voiceFiles) {
      assert.ok(
        vf.filePath.includes(resB.jobId),
        `Voice file "${vf.filePath}" does not belong to Job B "${resB.jobId}"`
      );
      assert.ok(
        !vf.filePath.includes(resA.jobId),
        `Voice file "${vf.filePath}" contains Job A jobId "${resA.jobId}"`
      );
    }

    // 5. Verify RenderManifest and InputSnapshot provenance
    const snapshotPathB = path.join(resB.workspace.artifactsDir, '00_input_snapshot.json');
    assert.ok(fs.existsSync(snapshotPathB), 'Job B 00_input_snapshot.json must exist');
    const snapshotB = JSON.parse(fs.readFileSync(snapshotPathB, 'utf-8'));
    assert.strictEqual(snapshotB.jobId, resB.jobId);
    assert.strictEqual(snapshotB.inputHash, resB.inputHash);
    assert.strictEqual(snapshotB.originalPrompt, promptB);

    assert.strictEqual(resB.manifest.jobId, resB.jobId);
    assert.strictEqual(resB.manifest.inputHash, resB.inputHash);
  });

  it('Requirement 16: Reverse Sequential Trace B -> A exhibits ZERO contamination', async () => {
    const promptB = 'Tạo video 60 giây về các hành tinh trong hệ Mặt Trời.';
    const promptA = 'Tạo video 60 giây về xe máy điện.';

    const resB = await runIsolatedPipeline(promptB);
    const resA = await runIsolatedPipeline(promptA);

    const solarEntities = ['hành tinh', 'mặt trời', 'sao hỏa', 'sao kim', 'sao mộc', 'vũ trụ', 'thiên văn'];
    const jobAScriptText = resA.approvedPackage.allBeats.map((b: any) => b.narration).join(' ').toLowerCase();

    for (const ent of solarEntities) {
      assert.ok(
        !jobAScriptText.includes(ent),
        `Contamination detected: Job A script contains Job B entity "${ent}"`
      );
    }
  });

  it('Requirement 15: Concurrent 3 Jobs (C, D, E) run concurrently without cross-talk', async () => {
    const promptC = 'Bất động sản Hà Nội xu hướng đầu tư';
    const promptD = 'Trí tuệ nhân tạo trong y tế chẩn đoán hình ảnh';
    const promptE = 'Du lịch Nhật Bản mùa hoa anh đào';

    console.log('[Test] Launching 3 Concurrent Jobs (C, D, E)...');
    const [resC, resD, resE] = await Promise.all([
      runIsolatedPipeline(promptC),
      runIsolatedPipeline(promptD),
      runIsolatedPipeline(promptE),
    ]);

    // Unique Job IDs & Input Hashes
    const jobIds = new Set([resC.jobId, resD.jobId, resE.jobId]);
    assert.strictEqual(jobIds.size, 3, 'All 3 concurrent jobs must have unique jobIds');

    const hashes = new Set([resC.inputHash, resD.inputHash, resE.inputHash]);
    assert.strictEqual(hashes.size, 3, 'All 3 concurrent jobs must have unique inputHashes');

    // Cross-check: Job C has no Medical AI or Japan Travel entities
    const textC = resC.approvedPackage.allBeats.map((b: any) => b.narration).join(' ').toLowerCase();
    assert.ok(!textC.includes('chẩn đoán') && !textC.includes('hoa anh đào'));

    // Cross-check: Job D has no Real Estate or Japan Travel entities
    const textD = resD.approvedPackage.allBeats.map((b: any) => b.narration).join(' ').toLowerCase();
    assert.ok(!textD.includes('bất động sản') && !textD.includes('hoa anh đào'));

    // Cross-check: Job E has no Medical AI or Real Estate entities
    const textE = resE.approvedPackage.allBeats.map((b: any) => b.narration).join(' ').toLowerCase();
    assert.ok(!textE.includes('bất động sản') && !textE.includes('bệnh viện') && !textE.includes('y tế'));

    // Verify all file paths in manifests are strictly partitioned
    for (const res of [resC, resD, resE]) {
      for (const a of res.manifest.assets) {
        if (a.filePath) assert.ok(a.filePath.includes(res.jobId));
      }
      for (const v of res.manifest.voiceFiles) {
        assert.ok(v.filePath.includes(res.jobId));
      }
    }
  });

  it('Requirement 8: ContentContaminationDetector catches foreign entity injection and FAILS', () => {
    const currentJobId = 'job_test_detector_02';
    const currentPrompt = 'Tạo video 60 giây về các hành tinh trong hệ Mặt Trời.';
    const currentEntities = ['Hệ Mặt Trời', 'Sao Hỏa', 'Sao Kim'];

    // Register a previous job with electric bike entities
    JobIsolation.registerJobEntities('job_prev_bike_01', 'Xe máy điện DatBike', [
      'DatBike',
      'Xe máy điện',
      'Pin Lithium',
    ]);

    // Test text with injected foreign entity "DatBike"
    const contaminatedText = 'Sao Hỏa có quỹ đạo đặc biệt và DatBike đang phát triển động cơ mạnh mẽ.';

    assert.throws(
      () => {
        JobIsolation.assertNoContamination({
          currentJobId,
          currentPrompt,
          currentEntities,
          contentToCheck: contaminatedText,
          stageName: '14_approved_script',
        });
      },
      (err: any) => {
        return (
          err instanceof Error &&
          err.message.includes('CRITICAL CROSS_JOB_CONTAMINATION') &&
          err.message.includes('DatBike')
        );
      },
      'ContentContaminationDetector MUST block job when foreign entity is present'
    );
  });

  it('Requirement 7: Provenance Verification FAILS on mismatched jobId or hash', () => {
    const testFile = path.resolve('./temp/test_provenance_check.json');
    const dir = path.dirname(testFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const wrapped = JobIsolation.wrapWithProvenance(
      { test: 'data' },
      { jobId: 'job_orig_123', inputHash: 'hash_abc_123' },
      '01_test'
    );
    fs.writeFileSync(testFile, JSON.stringify(wrapped), 'utf-8');

    // Valid check
    assert.strictEqual(JobIsolation.verifyProvenance(testFile, 'job_orig_123', 'hash_abc_123'), true);

    // Mismatched jobId
    assert.strictEqual(JobIsolation.verifyProvenance(testFile, 'job_foreign_999', 'hash_abc_123'), false);

    // Mismatched inputHash
    assert.strictEqual(JobIsolation.verifyProvenance(testFile, 'job_orig_123', 'hash_tampered_000'), false);
  });
});
