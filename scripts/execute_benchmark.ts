/**
 * BENCHMARK HARNESS EXECUTION SCRIPT
 * Sequentially executes all 20 Holdout Benchmark cases through MasterVideoEngine.
 * Enforces:
 *   - Fresh Job Isolation (RULE 3)
 *   - Zero engine edits (RULE 1)
 *   - Complete Review Package (RULE 4)
 *   - Evaluation & Diagnostic Scoring (RULES 5-13)
 *   - Final Benchmark Report (RULE 14)
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  BENCHMARK_CASES,
  BenchmarkItemResult,
  evaluateBenchmarkJob,
  saveReviewPackage,
} from './run_holdout_benchmark.js';
import { MasterVideoEngine } from '../src/engine/masterVideoEngine.js';

async function runBenchmark() {
  console.log(`\n================================================================================`);
  console.log(`🚀 FINAL PRODUCT ACCEPTANCE TEST — HOLDOUT BENCHMARK (20 JOBS)`);
  console.log(`   RULE 1: Engine is FROZEN. Zero code modifications.`);
  console.log(`   RULE 3: Fresh Job Isolation for each video.`);
  console.log(`   RULE 4: Saving Complete Review Package under review/{jobId}/.`);
  console.log(`================================================================================\n`);

  const results: BenchmarkItemResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < BENCHMARK_CASES.length; i++) {
    const tc = BENCHMARK_CASES[i];
    const jobId = `job_bench_${String(tc.id).padStart(2, '0')}_${tc.domain.toLowerCase()}_${uuidv4().slice(0, 6)}`;
    const jobStartTime = Date.now();

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${i + 1}/20] Chạy Case #${tc.id}: [${tc.domain}] (${tc.duration}s) - ${tc.type}`);
    console.log(`       Job ID: ${jobId}`);
    console.log(`       Prompt: "${tc.prompt}"`);

    // Thư mục output và temp độc lập tuyệt đối
    const tempDir = path.resolve('./temp/video-jobs', jobId);
    const outputDir = path.resolve('./output/benchmark', jobId);
    const finalMp4Path = path.join(outputDir, `video_${jobId}.mp4`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Chạy qua MasterVideoEngine hoàn toàn không can thiệp code
      const masterResult = await MasterVideoEngine.execute({
        jobId,
        prompt: tc.prompt,
        targetDuration: tc.duration,
        outputDir: tempDir,
        finalVideoPath: finalMp4Path,
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        bgm: true,
        onProgress: (stage, percent, msg) => {
          if (percent % 25 === 0 || percent === 100) {
            console.log(`       [${percent}%] (${stage}): ${msg}`);
          }
        },
      });

      const execTimeSec = Math.round((Date.now() - jobStartTime) / 1000);

      // Đánh giá kiểm định theo các tiêu chí Rules 5 - 13
      const evaluation = evaluateBenchmarkJob(tc, jobId, masterResult);

      // Lưu 16 files Review Package
      const reviewDir = saveReviewPackage({
        jobId,
        tc,
        masterResult,
        humanScores: evaluation.humanScoreBreakdown,
        yesNo: evaluation.yesNoQuestions,
        hardFailReasons: evaluation.hardFailReasons,
        status: evaluation.status,
      });

      const itemResult: BenchmarkItemResult = {
        testCase: tc,
        jobId,
        status: evaluation.status,
        executionTimeSec: execTimeSec,
        machineScore: evaluation.machineScore,
        humanScoreBreakdown: evaluation.humanScoreBreakdown,
        yesNoQuestions: evaluation.yesNoQuestions,
        contentAudit: evaluation.contentAudit,
        visualAudit: evaluation.visualAudit,
        audioAudit: evaluation.audioAudit,
        retentionAudit: evaluation.retentionAudit,
        hardFailReasons: evaluation.hardFailReasons,
        reviewDir,
      };

      results.push(itemResult);

      console.log(`       ✅ Trạng thái: ${evaluation.status} | Human Score: ${evaluation.humanScoreBreakdown.totalAverage.toFixed(1)}/10 | Time: ${execTimeSec}s`);
      if (evaluation.hardFailReasons.length > 0) {
        console.log(`       ⚠️ Hard Fails: ${evaluation.hardFailReasons.join('; ')}`);
      }
    } catch (err: any) {
      const execTimeSec = Math.round((Date.now() - jobStartTime) / 1000);
      console.error(`       ❌ CRITICAL FAIL: ${err.message}`);

      const itemResult: BenchmarkItemResult = {
        testCase: tc,
        jobId,
        status: 'CRITICAL_FAILED',
        executionTimeSec: execTimeSec,
        errorMessage: err.message,
        machineScore: 0,
        humanScoreBreakdown: {
          contentAccuracy: 1,
          hook: 1,
          storytelling: 1,
          informationValue: 1,
          visualAuthenticity: 1,
          visualRelevance: 1,
          creativeDirection: 1,
          editingPacing: 1,
          voice: 1,
          subtitleDesign: 1,
          totalAverage: 1.0,
        },
        yesNoQuestions: {
          watchPast3s: false,
          clearValue: false,
          readyToPublish: false,
        },
        contentAudit: {
          hookSpecific: false,
          premiseClear: false,
          compliesWithPrompt: false,
          researchDepth: false,
          unsupportedClaims: [err.message],
          aiClichesDetected: [],
          progression: false,
          endingPayoff: false,
          naturalVoiceVietnamese: false,
        },
        visualAudit: {
          entityCorrectness: 0,
          semanticRelevance: 0,
          authenticity: 0,
          noRandomCartoon: false,
          noStaleBackgroundTextOnly: false,
        },
        audioAudit: {
          noNarrationCutoff: false,
          noMissingAudio: false,
          durationDeviationPercent: 100,
        },
        retentionAudit: {
          sec0_3_hook: 'N/A',
          sec3_10_premise: 'N/A',
          pct10_25_point1: 'N/A',
          pct25_50_core: 'N/A',
          pct50_75_climax: 'N/A',
          pct75_100_payoff: 'N/A',
          weakestZone: 'Pipeline crash',
        },
        hardFailReasons: [err.message],
        reviewDir: path.resolve('./review', jobId),
      };

      results.push(itemResult);
    }
  }

  // =========================================================================
  // RULE 14: TỔNG HỢP FINAL BENCHMARK REPORT
  // =========================================================================
  const totalVideos = results.length;
  const passedVideos = results.filter((r) => r.status === 'PASSED').length;
  const criticalFailedVideos = results.filter((r) => r.status === 'CRITICAL_FAILED').length;
  const failedVideos = totalVideos - passedVideos;

  // Pass rate by domain
  const domainStats: Record<string, { total: number; passed: number }> = {};
  for (const r of results) {
    const d = r.testCase.domain;
    if (!domainStats[d]) domainStats[d] = { total: 0, passed: 0 };
    domainStats[d].total++;
    if (r.status === 'PASSED') domainStats[d].passed++;
  }

  // Pass rate by duration
  const durationStats: Record<number, { total: number; passed: number }> = {};
  for (const r of results) {
    const dur = r.testCase.duration;
    if (!durationStats[dur]) durationStats[dur] = { total: 0, passed: 0 };
    durationStats[dur].total++;
    if (r.status === 'PASSED') durationStats[dur].passed++;
  }

  // Subsystem failure counts
  let contentFailures = 0;
  let researchFailures = 0;
  let visualFailures = 0;
  let audioFailures = 0;
  let timelineFailures = 0;
  let creativeFailures = 0;

  for (const r of results) {
    if (r.status !== 'PASSED') {
      const msg = (r.hardFailReasons || []).join(' ').toLowerCase() + ' ' + (r.errorMessage || '').toLowerCase();
      if (msg.includes('kịch bản') || msg.includes('script') || msg.includes('nội dung')) contentFailures++;
      if (msg.includes('nguồn') || msg.includes('research') || msg.includes('fact')) researchFailures++;
      if (msg.includes('visual') || msg.includes('ảnh') || msg.includes('hình')) visualFailures++;
      if (msg.includes('voice') || msg.includes('tts') || msg.includes('audio') || msg.includes('tiếng')) audioFailures++;
      if (msg.includes('thời lượng') || msg.includes('timeline') || msg.includes('duration')) timelineFailures++;
      if (msg.includes('layout') || msg.includes('duplicate') || msg.includes('creative')) creativeFailures++;
    }
  }

  // Human scores
  const allHumanScores = results.map((r) => r.humanScoreBreakdown.totalAverage).sort((a, b) => a - b);
  const medianHumanScore = allHumanScores[Math.floor(allHumanScores.length / 2)] || 0;
  const lowestHumanScore = allHumanScores[0] || 0;

  // Best 3 and Worst 3
  const sortedByScore = [...results].sort(
    (a, b) => b.humanScoreBreakdown.totalAverage - a.humanScoreBreakdown.totalAverage
  );
  const best3 = sortedByScore.slice(0, 3);
  const worst3 = sortedByScore.slice(-3).reverse();

  const report = {
    benchmarkDate: new Date().toISOString(),
    totalVideos,
    passedVideos,
    failedVideos,
    criticalFailedVideos,
    passRatePercent: ((passedVideos / totalVideos) * 100).toFixed(1) + '%',
    domainStats,
    durationStats,
    subsystemFailures: {
      contentFailures,
      researchFailures,
      visualFailures,
      audioFailures,
      timelineFailures,
      creativeFailures,
    },
    medianHumanScore: medianHumanScore.toFixed(1),
    lowestHumanScore: lowestHumanScore.toFixed(1),
    best3: best3.map((b) => ({
      caseId: b.testCase.id,
      domain: b.testCase.domain,
      prompt: b.testCase.prompt,
      score: b.humanScoreBreakdown.totalAverage.toFixed(1),
      jobId: b.jobId,
      reviewHtml: `review/${b.jobId}/16_human_review.html`,
    })),
    worst3: worst3.map((w) => ({
      caseId: w.testCase.id,
      domain: w.testCase.domain,
      prompt: w.testCase.prompt,
      score: w.humanScoreBreakdown.totalAverage.toFixed(1),
      jobId: w.jobId,
      reasons: w.hardFailReasons,
      reviewHtml: `review/${w.jobId}/16_human_review.html`,
    })),
    results,
  };

  // Write report to disk
  fs.writeFileSync('./review/final_benchmark_report.json', JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n================================================================================`);
  console.log(`📊 FINAL BENCHMARK SUMMARY (RULE 14)`);
  console.log(`   Total Videos: ${totalVideos}`);
  console.log(`   Passed: ${passedVideos} | Failed: ${failedVideos} | Critical Failed: ${criticalFailedVideos}`);
  console.log(`   Pass Rate: ${report.passRatePercent}`);
  console.log(`   Median Human Score: ${report.medianHumanScore}/10 | Lowest: ${report.lowestHumanScore}/10`);
  console.log(`================================================================================\n`);

  return report;
}

runBenchmark().catch((err) => {
  console.error('Fatal benchmark execution error:', err);
  process.exit(1);
});
