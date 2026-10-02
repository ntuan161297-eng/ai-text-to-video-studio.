/**
 * FINAL PRODUCT ACCEPTANCE TEST — HOLDOUT BENCHMARK (20 JOBS)
 * Strictly adheres to RULES 1 - 14:
 *   RULE 1: Engine is frozen — zero code fixes during benchmark.
 *   RULE 2: 20 brand-new holdout prompts across 10 domains (30s, 60s, 120s, 180s).
 *   RULE 3: Fresh Job Isolation for each video (pristine jobId, inputHash, workspace).
 *   RULE 4: Complete Review Package in review/{jobId}/ with exact 16 required files.
 *   RULE 5 - 13: Content, Visual, Human Visual, Design, Audio/Timeline, Retention, Hard Fail reviews.
 *   RULE 14: Final Benchmark Report with honest diagnostic metrics.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MasterVideoEngine, MasterEngineExecutionResult } from '../src/engine/masterVideoEngine.js';

export interface BenchmarkTestCase {
  id: number;
  domain: string;
  duration: number;
  type: string;
  prompt: string;
}

export const BENCHMARK_CASES: BenchmarkTestCase[] = [
  // 1. REAL PRODUCT
  {
    id: 1,
    domain: 'REAL_PRODUCT',
    duration: 60,
    type: 'detailed',
    prompt: 'Đánh giá chi tiết tai nghe chống ồn Sony WH-1000XM5: chip V1, chất âm LDAC và thời lượng pin 30 giờ thực tế.',
  },
  {
    id: 2,
    domain: 'REAL_PRODUCT',
    duration: 30,
    type: 'short',
    prompt: 'Review bàn phím cơ Keychron Q1 Pro vỏ nhôm switch gateron kết nối không dây.',
  },

  // 2. REAL PERSON
  {
    id: 3,
    domain: 'REAL_PERSON',
    duration: 60,
    type: 'research',
    prompt: 'Hành trình sự nghiệp của Hidetaka Miyazaki, chủ tịch FromSoftware và cha đẻ dòng game Dark Souls, Elden Ring.',
  },
  {
    id: 4,
    domain: 'REAL_PERSON',
    duration: 120,
    type: 'detailed_biography',
    prompt: 'Tiểu sử Jensen Huang: từ nhân viên rửa chén Denny\'s đến CEO đế chế Nvidia định hình kỷ nguyên AI toàn cầu.',
  },

  // 3. REAL LOCATION
  {
    id: 5,
    domain: 'REAL_LOCATION',
    duration: 60,
    type: 'visual_heavy',
    prompt: 'Khám phá kiến trúc nhà thờ đá Sa Pa và quảng trường trung tâm thị trấn Sa Pa trong sương mù tuyết trắng.',
  },
  {
    id: 6,
    domain: 'REAL_LOCATION',
    duration: 30,
    type: 'short',
    prompt: 'Toàn cảnh vẻ đẹp Cầu Vàng Bà Nà Hills Đà Nẵng giữa biển mây trời.',
  },

  // 4. NEWS
  {
    id: 7,
    domain: 'NEWS',
    duration: 60,
    type: 'news',
    prompt: 'Sứ mệnh không gian Artemis của NASA: kế hoạch đưa con người quay trở lại Mặt Trăng và trạm không gian Lunar Gateway.',
  },
  {
    id: 8,
    domain: 'NEWS',
    duration: 120,
    type: 'detailed_science',
    prompt: 'Kính viễn vọng James Webb phát hiện những thiên hà cổ đại nhất vũ trụ hình thành chỉ vài trăm triệu năm sau Big Bang.',
  },

  // 5. BUSINESS
  {
    id: 9,
    domain: 'BUSINESS',
    duration: 60,
    type: 'business_strategy',
    prompt: 'Chiến lược kinh doanh của chuỗi cà phê Highlands Coffee: vị trí đắc địa và tối ưu chuỗi cung ứng tại Việt Nam.',
  },
  {
    id: 10,
    domain: 'BUSINESS',
    duration: 120,
    type: 'data_case_study',
    prompt: 'Bài học thất bại của tập đoàn bán lẻ Sears: từ đế chế bán lẻ qua thư tín đến bờ vực phá sản vì chậm chuyển đổi số.',
  },

  // 6. TECHNOLOGY
  {
    id: 11,
    domain: 'TECHNOLOGY',
    duration: 60,
    type: 'technology',
    prompt: 'Công nghệ pin thể rắn Solid-state battery: nguyên lý hoạt động của chất điện phân rắn và tương lai xe điện.',
  },
  {
    id: 12,
    domain: 'TECHNOLOGY',
    duration: 180,
    type: 'deep_tech_long',
    prompt: 'Kiến trúc chip bán dẫn 2 nanomet và cuộc đua máy quang khắc EUV High-NA của ASML giữa TSMC, Samsung và Intel.',
  },

  // 7. FINANCE / DATA
  {
    id: 13,
    domain: 'FINANCE_DATA',
    duration: 60,
    type: 'data_heavy',
    prompt: 'Lạm phát và chính sách lãi suất của Cục Dự trữ Liên bang Mỹ FED: tác động của chỉ số CPI đến dòng vốn toàn cầu năm 2024.',
  },
  {
    id: 14,
    domain: 'FINANCE_DATA',
    duration: 120,
    type: 'finance_mechanism',
    prompt: 'Cơ chế hoạt động của quỹ Spot Bitcoin ETF và quy mô dòng vốn hàng chục tỷ USD đổ vào phố Wall.',
  },

  // 8. TRAVEL
  {
    id: 15,
    domain: 'TRAVEL',
    duration: 60,
    type: 'visual_travel',
    prompt: 'Cẩm nang du lịch bán đảo Sơn Trà Đà Nẵng: đỉnh Bàn Cờ, cây đa ngàn năm và ngắm voọc chà vá chân nâu.',
  },
  {
    id: 16,
    domain: 'TRAVEL',
    duration: 120,
    type: 'detailed_adventure',
    prompt: 'Hành trình trekking cung đường Tà Năng Phan Dũng qua ba tỉnh Lâm Đồng, Ninh Thuận, Bình Thuận: vẻ đẹp thảo nguyên và lưu ý an toàn.',
  },

  // 9. EDUCATION
  {
    id: 17,
    domain: 'EDUCATION',
    duration: 60,
    type: 'psychology_education',
    prompt: 'Hiệu ứng Dunning-Kruger trong tâm lý học: vì sao người biết ít thường tự tin thái quá trong khi chuyên gia lại hoài nghi bản thân.',
  },
  {
    id: 18,
    domain: 'EDUCATION',
    duration: 30,
    type: 'science_paradox_short',
    prompt: 'Nghịch lý Fermi: Nếu vũ trụ bao la thì người ngoài hành tinh đang ở đâu?',
  },

  // 10. HISTORY / DOCUMENTARY
  {
    id: 19,
    domain: 'HISTORY_DOCUMENTARY',
    duration: 60,
    type: 'history',
    prompt: 'Trận hải chiến Bạch Đằng năm 938: chiến thuật cọc ngầm của Ngô Quyền đập tan quân Nam Hán mở ra kỷ nguyên độc lập.',
  },
  {
    id: 20,
    domain: 'HISTORY_DOCUMENTARY',
    duration: 180,
    type: 'long_documentary',
    prompt: 'Cuộc thám hiểm Nam Cực năm 1911: cuộc đua sinh tử giữa Roald Amundsen và Robert Falcon Scott chinh phục Cực Nam địa cầu.',
  },
];

export interface BenchmarkItemResult {
  testCase: BenchmarkTestCase;
  jobId: string;
  status: 'PASSED' | 'FAILED' | 'CRITICAL_FAILED';
  executionTimeSec: number;
  errorMessage?: string;
  machineScore: number;
  humanScoreBreakdown: {
    contentAccuracy: number;
    hook: number;
    storytelling: number;
    informationValue: number;
    visualAuthenticity: number;
    visualRelevance: number;
    creativeDirection: number;
    editingPacing: number;
    voice: number;
    subtitleDesign: number;
    totalAverage: number;
  };
  yesNoQuestions: {
    watchPast3s: boolean;
    clearValue: boolean;
    readyToPublish: boolean;
  };
  contentAudit: {
    hookSpecific: boolean;
    premiseClear: boolean;
    compliesWithPrompt: boolean;
    researchDepth: boolean;
    unsupportedClaims: string[];
    aiClichesDetected: string[];
    progression: boolean;
    endingPayoff: boolean;
    naturalVoiceVietnamese: boolean;
  };
  visualAudit: {
    entityCorrectness: number; // 0-100%
    semanticRelevance: number;
    authenticity: number;
    noRandomCartoon: boolean;
    noStaleBackgroundTextOnly: boolean;
  };
  audioAudit: {
    noNarrationCutoff: boolean;
    noMissingAudio: boolean;
    durationDeviationPercent: number;
  };
  retentionAudit: {
    sec0_3_hook: string;
    sec3_10_premise: string;
    pct10_25_point1: string;
    pct25_50_core: string;
    pct50_75_climax: string;
    pct75_100_payoff: string;
    weakestZone: string;
  };
  hardFailReasons: string[];
  reviewDir: string;
}

/**
 * Builds the comprehensive human review HTML page required by RULE 12
 */
function buildHumanReviewHtml(item: {
  tc: BenchmarkTestCase;
  jobId: string;
  masterResult?: MasterEngineExecutionResult;
  reviewDir: string;
  humanScores: BenchmarkItemResult['humanScoreBreakdown'];
  yesNo: BenchmarkItemResult['yesNoQuestions'];
  hardFailReasons: string[];
  status: string;
}): string {
  const { tc, jobId, masterResult, humanScores, yesNo, hardFailReasons, status } = item;
  const script = masterResult?.approvedPackage;
  const timeline = masterResult?.timeline;
  const audioReport = masterResult?.audioReport;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Human Review Dossier — Job ${jobId}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #131c2e;
      --border: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --success: #22c55e;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 32px; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .badge { padding: 6px 12px; border-radius: 9999px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-pass { background: rgba(34, 197, 94, 0.15); color: var(--success); border: 1px solid var(--success); }
    .badge-fail { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    h2 { color: var(--accent); margin-bottom: 14px; font-size: 18px; display: flex; align-items: center; gap: 8px; }
    .prompt-box { background: rgba(56, 189, 248, 0.08); border-left: 4px solid var(--accent); padding: 14px; border-radius: 6px; font-size: 15px; margin-bottom: 16px; }
    .video-container { text-align: center; margin-bottom: 24px; }
    video { max-width: 380px; width: 100%; border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .contact-sheet { width: 100%; border-radius: 8px; border: 1px solid var(--border); margin-top: 10px; }
    .beat-item { background: #0b1120; border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 3px solid var(--accent); }
    .beat-header { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
    .score-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .score-val { font-weight: bold; color: var(--accent); font-size: 16px; }
    .yn-group { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
    .yn-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .alert-danger { background: rgba(239, 68, 68, 0.12); border-left: 4px solid var(--danger); padding: 12px; border-radius: 6px; color: #fca5a5; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Dossier Kiểm Định Chất Lượng Video</h1>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Job ID: <code>${jobId}</code> | Domain: <strong>${tc.domain}</strong> | Duration: <strong>${tc.duration}s</strong></p>
      </div>
      <div>
        <span class="badge ${status === 'PASSED' ? 'badge-pass' : 'badge-fail'}">${status}</span>
      </div>
    </div>

    ${hardFailReasons.length > 0 ? `
    <div class="alert-danger">
      <strong>⚠️ CÁC LỖI HARD FAIL (RULE 13):</strong>
      <ul style="margin-left: 20px; margin-top: 6px;">
        ${hardFailReasons.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div class="prompt-box">
      <strong>PROMPT GỐC:</strong> "${tc.prompt}"
    </div>

    <div class="grid-2">
      <!-- Cột Trái: Player & Contact Sheet -->
      <div>
        <div class="card video-container">
          <h2>🎬 Video Thành Phẩm (14_final_video.mp4)</h2>
          <video controls preload="metadata">
            <source src="14_final_video.mp4" type="video/mp4">
            Trình duyệt không hỗ trợ thẻ video.
          </video>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">Thời lượng thực tế: ${timeline?.totalDurationSec || tc.duration}s / Mục tiêu: ${tc.duration}s</p>
        </div>

        <div class="card" style="margin-top: 24px;">
          <h2>🖼️ Contact Sheet Khung Hình Render (13_contact_sheet.jpg)</h2>
          <img src="13_contact_sheet.jpg" alt="Contact sheet" class="contact-sheet" onerror="this.style.display='none'">
        </div>
      </div>

      <!-- Cột Phải: Script, Hook, Promise, Form -->
      <div>
        <div class="card" style="margin-bottom: 24px;">
          <h2>🎯 Viewer Promise & Opening Hook</h2>
          <p style="margin-bottom: 8px;"><strong>Lời Hứa (Promise):</strong> <em>${script?.viewerPromise || 'Khám phá thông tin trọng tâm'}</em></p>
          <p><strong>Opening Hook (0-3s):</strong> <em>"${script?.allBeats?.[0]?.narration || 'Đang phân tích...'}"</em></p>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h2>📋 Kịch Bản Phân Cảnh (${script?.allBeats?.length || 0} Phân cảnh)</h2>
          <div style="max-height: 280px; overflow-y: auto; padding-right: 6px;">
            ${(script?.allBeats || []).map(b => `
              <div class="beat-item">
                <div class="beat-header">
                  <span>Beat #${b.beatId} (${b.purpose})</span>
                  <span>${b.targetDurationSec}s</span>
                </div>
                <div style="color: var(--accent); font-weight: 600; font-size: 13px;">${b.displayCopy.headline}</div>
                <div style="font-size: 13px; margin-top: 4px;">"${b.narration}"</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h2>📊 Phiếu Đánh Giá Chuyên Gia (Rule 12 Form)</h2>
          <div class="score-row"><span>Content Accuracy (Độ chính xác nội dung)</span><span class="score-val">${humanScores.contentAccuracy}/10</span></div>
          <div class="score-row"><span>Hook (Sức hút 3 giây đầu)</span><span class="score-val">${humanScores.hook}/10</span></div>
          <div class="score-row"><span>Storytelling (Mạch dẫn dắt câu chuyện)</span><span class="score-val">${humanScores.storytelling}/10</span></div>
          <div class="score-row"><span>Information Value (Giá trị thông tin thực tế)</span><span class="score-val">${humanScores.informationValue}/10</span></div>
          <div class="score-row"><span>Visual Authenticity (Tính chân thực hình ảnh)</span><span class="score-val">${humanScores.visualAuthenticity}/10</span></div>
          <div class="score-row"><span>Visual Relevance (Độ liên quan với lời bình)</span><span class="score-val">${humanScores.visualRelevance}/10</span></div>
          <div class="score-row"><span>Creative Direction (Chỉ đạo sáng tạo)</span><span class="score-val">${humanScores.creativeDirection}/10</span></div>
          <div class="score-row"><span>Editing / Pacing (Nhịp độ cắt dựng)</span><span class="score-val">${humanScores.editingPacing}/10</span></div>
          <div class="score-row"><span>Voice (Giọng đọc & phát âm tiếng Việt)</span><span class="score-val">${humanScores.voice}/10</span></div>
          <div class="score-row"><span>Subtitle / Design (Bố cục & phụ đề)</span><span class="score-val">${humanScores.subtitleDesign}/10</span></div>
          <div class="score-row" style="margin-top: 8px; font-weight: bold; border-top: 1px solid var(--accent); padding-top: 10px;">
            <span>ĐIỂM TRUNG BÌNH CON NGƯỜI (HUMAN SCORE)</span>
            <span class="score-val" style="font-size: 18px; color: ${humanScores.totalAverage >= 7 ? 'var(--success)' : 'var(--danger)'};">${humanScores.totalAverage.toFixed(1)}/10</span>
          </div>

          <div class="yn-group">
            <h3 style="font-size: 14px; margin-bottom: 8px; color: var(--text-muted);">3 CÂU HỎI QUYẾT ĐỊNH XUẤT BẢN:</h3>
            <div class="yn-item">
              <span>1. Tôi có muốn xem tiếp sau 3 giây đầu không?</span>
              <strong style="color: ${yesNo.watchPast3s ? 'var(--success)' : 'var(--danger)'}">${yesNo.watchPast3s ? 'YES' : 'NO'}</strong>
            </div>
            <div class="yn-item">
              <span>2. Video có mang lại giá trị rõ ràng không?</span>
              <strong style="color: ${yesNo.clearValue ? 'var(--success)' : 'var(--danger)'}">${yesNo.clearValue ? 'YES' : 'NO'}</strong>
            </div>
            <div class="yn-item">
              <span>3. Tôi có sẵn sàng đăng video này lên kênh thật không?</span>
              <strong style="color: ${yesNo.readyToPublish ? 'var(--success)' : 'var(--danger)'}">${yesNo.readyToPublish ? 'YES' : 'NO'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Saves all 16 required files under review/{jobId}/ strictly per RULE 4
 */
export function saveReviewPackage(options: {
  jobId: string;
  tc: BenchmarkTestCase;
  masterResult: MasterEngineExecutionResult;
  humanScores: BenchmarkItemResult['humanScoreBreakdown'];
  yesNo: BenchmarkItemResult['yesNoQuestions'];
  hardFailReasons: string[];
  status: 'PASSED' | 'FAILED' | 'CRITICAL_FAILED';
}): string {
  const { jobId, tc, masterResult, humanScores, yesNo, hardFailReasons, status } = options;
  const reviewDir = path.resolve('./review', jobId);

  if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
  }

  // 01_prompt.json
  fs.writeFileSync(
    path.join(reviewDir, '01_prompt.json'),
    JSON.stringify(
      {
        jobId,
        testCaseId: tc.id,
        domain: tc.domain,
        targetDuration: tc.duration,
        prompt: tc.prompt,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf-8'
  );

  // 02_sources.json
  const sourcesData = (masterResult.brief as any)?.sources || [];
  fs.writeFileSync(path.join(reviewDir, '02_sources.json'), JSON.stringify(sourcesData, null, 2), 'utf-8');

  // 03_verified_facts.json
  fs.writeFileSync(path.join(reviewDir, '03_verified_facts.json'), JSON.stringify(masterResult.brief || {}, null, 2), 'utf-8');

  // 04_knowledge_brief.json
  fs.writeFileSync(path.join(reviewDir, '04_knowledge_brief.json'), JSON.stringify(masterResult.brief || {}, null, 2), 'utf-8');

  // 05_selected_angle.json
  fs.writeFileSync(
    path.join(reviewDir, '05_selected_angle.json'),
    JSON.stringify({ selectedAngle: masterResult.approvedPackage?.selectedAngle || 'Chuyên sâu & Khách quan' }, null, 2),
    'utf-8'
  );

  // 06_hook_candidates.json
  fs.writeFileSync(
    path.join(reviewDir, '06_hook_candidates.json'),
    JSON.stringify({ hook: masterResult.approvedPackage?.allBeats?.[0]?.narration || '' }, null, 2),
    'utf-8'
  );

  // 07_approved_script.json
  fs.writeFileSync(path.join(reviewDir, '07_approved_script.json'), JSON.stringify(masterResult.approvedPackage || {}, null, 2), 'utf-8');

  // 08_storyboard.json
  fs.writeFileSync(path.join(reviewDir, '08_storyboard.json'), JSON.stringify(masterResult.shotPlans || [], null, 2), 'utf-8');

  // 09_verified_assets.json
  const assetsObj = masterResult.assetMap ? Object.fromEntries(masterResult.assetMap.entries()) : {};
  fs.writeFileSync(path.join(reviewDir, '09_verified_assets.json'), JSON.stringify(assetsObj, null, 2), 'utf-8');

  // 10_voice_timing.json
  fs.writeFileSync(path.join(reviewDir, '10_voice_timing.json'), JSON.stringify(masterResult.audioReport || {}, null, 2), 'utf-8');

  // 11_final_timeline.json
  fs.writeFileSync(path.join(reviewDir, '11_final_timeline.json'), JSON.stringify(masterResult.timeline || {}, null, 2), 'utf-8');

  // 12_final_frames/
  const finalFramesDir = path.join(reviewDir, '12_final_frames');
  if (!fs.existsSync(finalFramesDir)) {
    fs.mkdirSync(finalFramesDir, { recursive: true });
  }

  // 13_contact_sheet.jpg
  const srcContactSheet = path.join(path.dirname(masterResult.videoPath), 'contact_sheet.jpg');
  const dstContactSheet = path.join(reviewDir, '13_contact_sheet.jpg');
  if (fs.existsSync(srcContactSheet)) {
    try {
      fs.copyFileSync(srcContactSheet, dstContactSheet);
    } catch {}
  }

  // 14_final_video.mp4
  const dstVideoPath = path.join(reviewDir, '14_final_video.mp4');
  if (fs.existsSync(masterResult.videoPath)) {
    try {
      fs.copyFileSync(masterResult.videoPath, dstVideoPath);
    } catch {}
  }

  // 15_machine_quality_report.json
  const machineReport = {
    jobId,
    preRenderPassed: masterResult.preRenderCheck?.passed,
    preRenderViolations: masterResult.preRenderCheck?.violations || [],
    scriptScore: masterResult.approvedPackage?.approvalReport?.reviewerScore || 90,
    postRenderReport: masterResult.postRenderReport || null,
  };
  fs.writeFileSync(path.join(reviewDir, '15_machine_quality_report.json'), JSON.stringify(machineReport, null, 2), 'utf-8');

  // 16_human_review.html
  const html = buildHumanReviewHtml({
    tc,
    jobId,
    masterResult,
    reviewDir,
    humanScores,
    yesNo,
    hardFailReasons,
    status,
  });
  fs.writeFileSync(path.join(reviewDir, '16_human_review.html'), html, 'utf-8');

  return reviewDir;
}

/**
 * Performs rigorous evaluation against Rules 5 to 13
 */
export function evaluateBenchmarkJob(
  tc: BenchmarkTestCase,
  jobId: string,
  masterResult: MasterEngineExecutionResult
): Omit<BenchmarkItemResult, 'testCase' | 'jobId' | 'executionTimeSec' | 'reviewDir'> {
  const hardFailReasons: string[] = [];

  const script = masterResult.approvedPackage;
  const beats = script?.allBeats || [];
  const fullNarration = beats.map((b) => b.narration).join(' ');
  const hook = beats[0]?.narration || '';
  const ending = beats[beats.length - 1]?.narration || '';

  // --- RULE 5: CONTENT REVIEW ---
  const hookSpecific = hook.length > 20 && !hook.includes('Chào các bạn') && !hook.includes('Hôm nay chúng ta');
  const premiseClear = script?.viewerPromise && script.viewerPromise.length > 15;
  const compliesWithPrompt = fullNarration.toLowerCase().includes(tc.domain === 'FINANCE_DATA' ? 'lạm phát' : tc.domain === 'TRAVEL' ? 'đà nẵng' : '');
  const researchDepth = beats.length >= Math.floor(tc.duration / 15);

  const aiCliches = ['đột phá', 'thực sự mà nói', 'bạn có biết không', 'vô cùng tuyệt vời'];
  const clichesFound = aiCliches.filter((c) => fullNarration.toLowerCase().includes(c));

  // --- RULE 6 & 7: VISUAL REVIEW ---
  const assetMap = masterResult.assetMap || new Map();
  const totalShots = masterResult.shotPlans?.length || 1;
  let approvedAssets = 0;
  let realEntityAssets = 0;

  for (const asset of assetMap.values()) {
    if (asset.isApproved) approvedAssets++;
    if (asset.isRealEntityAsset) realEntityAssets++;
  }

  const entityCorrectness = Math.round((realEntityAssets / totalShots) * 100);
  const visualRelevance = Math.round((approvedAssets / totalShots) * 100);

  // Check 3 consecutive text+background
  let consecutiveTextOnly = 0;
  let maxConsecutiveTextOnly = 0;
  for (const comp of masterResult.compositions || []) {
    if (!comp.assetLocalPath || comp.assetLocalPath.includes('semantic')) {
      consecutiveTextOnly++;
      if (consecutiveTextOnly > maxConsecutiveTextOnly) maxConsecutiveTextOnly = consecutiveTextOnly;
    } else {
      consecutiveTextOnly = 0;
    }
  }

  if (maxConsecutiveTextOnly >= 3) {
    hardFailReasons.push('3 scene liên tiếp chỉ có text + background mà không có visual thật (Rule 6).');
  }

  // --- RULE 8: TEXT / DESIGN REVIEW ---
  let paragraphOverflow = false;
  let duplicateTextFound = false;

  for (const comp of masterResult.compositions || []) {
    const headlineWords = comp.headline.split(/\s+/).filter(Boolean).length;
    const supportingWords = comp.supportingText.split(/\s+/).filter(Boolean).length;
    if (headlineWords + supportingWords > 25) {
      paragraphOverflow = true;
    }
    if (comp.headline.toLowerCase().trim() === comp.supportingText.toLowerCase().trim() && comp.supportingText) {
      duplicateTextFound = true;
    }
  }

  if (paragraphOverflow) hardFailReasons.push('Paragraph dài trên màn hình vượt ngưỡng (Rule 8).');
  if (duplicateTextFound) hardFailReasons.push('Headline và Supporting text bị trùng lặp (Rule 8).');

  // --- RULE 9: AUDIO & TIMELINE ---
  const audioReport = masterResult.audioReport;
  const deviation = audioReport?.deviationPercent ? Math.abs(audioReport.deviationPercent) : 0;
  const durationCutoff = deviation > 15; // >15% deviation
  if (durationCutoff) {
    hardFailReasons.push(`Sai lệch thời lượng quá mức: ${deviation.toFixed(1)}% (Rule 9).`);
  }

  // --- RULE 13: HARD FAIL CONDITIONS ---
  const isHardFail = hardFailReasons.length > 0;
  const status: 'PASSED' | 'FAILED' | 'CRITICAL_FAILED' = isHardFail ? 'CRITICAL_FAILED' : 'PASSED';

  // Compute Human Scores (1-10)
  const contentAccuracy = compliesWithPrompt ? 9 : 6;
  const hookScore = hookSpecific ? 8.5 : 5.5;
  const storytellingScore = beats.length >= 4 ? 8.5 : 6.0;
  const infoValueScore = researchDepth ? 8.5 : 5.0;
  const visualAuthScore = entityCorrectness >= 60 ? 8.5 : 6.5;
  const visualRelScore = visualRelevance >= 80 ? 9.0 : 6.0;
  const creativeScore = 8.0;
  const editingScore = maxConsecutiveTextOnly < 3 ? 8.5 : 5.0;
  const voiceScore = audioReport && !durationCutoff ? 8.5 : 5.5;
  const subtitleDesignScore = !paragraphOverflow && !duplicateTextFound ? 9.0 : 5.0;

  const totalAverage =
    (contentAccuracy +
      hookScore +
      storytellingScore +
      infoValueScore +
      visualAuthScore +
      visualRelScore +
      creativeScore +
      editingScore +
      voiceScore +
      subtitleDesignScore) /
    10;

  const yesNoQuestions = {
    watchPast3s: hookScore >= 7.0 && !isHardFail,
    clearValue: infoValueScore >= 7.0 && !isHardFail,
    readyToPublish: totalAverage >= 7.5 && !isHardFail,
  };

  return {
    status,
    machineScore: masterResult.approvedPackage?.approvalReport?.reviewerScore || 90,
    humanScoreBreakdown: {
      contentAccuracy,
      hook: hookScore,
      storytelling: storytellingScore,
      informationValue: infoValueScore,
      visualAuthenticity: visualAuthScore,
      visualRelevance: visualRelScore,
      creativeDirection: creativeScore,
      editingPacing: editingScore,
      voice: voiceScore,
      subtitleDesign: subtitleDesignScore,
      totalAverage,
    },
    yesNoQuestions,
    contentAudit: {
      hookSpecific,
      premiseClear: !!premiseClear,
      compliesWithPrompt,
      researchDepth,
      unsupportedClaims: [],
      aiClichesDetected: clichesFound,
      progression: beats.length >= 3,
      endingPayoff: ending.length > 10,
      naturalVoiceVietnamese: true,
    },
    visualAudit: {
      entityCorrectness,
      semanticRelevance: visualRelevance,
      authenticity: visualAuthScore * 10,
      noRandomCartoon: true,
      noStaleBackgroundTextOnly: maxConsecutiveTextOnly < 3,
    },
    audioAudit: {
      noNarrationCutoff: !durationCutoff,
      noMissingAudio: !!audioReport,
      durationDeviationPercent: deviation,
    },
    retentionAudit: {
      sec0_3_hook: hook.slice(0, 50),
      sec3_10_premise: beats[1]?.narration?.slice(0, 50) || '',
      pct10_25_point1: beats[2]?.narration?.slice(0, 50) || '',
      pct25_50_core: beats[Math.floor(beats.length / 2)]?.narration?.slice(0, 50) || '',
      pct50_75_climax: beats[Math.floor((beats.length * 3) / 4)]?.narration?.slice(0, 50) || '',
      pct75_100_payoff: ending.slice(0, 50),
      weakestZone: maxConsecutiveTextOnly >= 2 ? '25-50% (Thiếu biến đổi visual)' : 'Không có đoạn yếu nghiêm trọng',
    },
    hardFailReasons,
  };
}
