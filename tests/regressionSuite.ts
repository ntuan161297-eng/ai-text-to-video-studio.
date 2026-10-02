import { ResearchEngine, SourceDocument } from '../src/services/researchEngine.js';
import { FactLayer, VerifiedFact } from '../src/services/factLayer.js';
import { ViralScriptEngine, ScriptPackage } from '../src/services/viralScriptEngine.js';
import { RetentionEditor, ContentReviewer, QualityScorer, QualityScoreBreakdown } from '../src/services/qualityControlEngine.js';

export interface TestCase {
  id: string;
  name: string;
  category: string;
  prompt: string;
  url?: string;
  expectedDuration: number;
}

export const REGRESSION_TEST_CASES: TestCase[] = [
  {
    id: 'tc_01_real_estate',
    name: 'Bất động sản',
    category: 'real_estate',
    prompt: 'Phân tích tiềm năng đầu tư căn hộ chung cư cao cấp phía Tây Hà Nội',
    expectedDuration: 60,
  },
  {
    id: 'tc_02_finance',
    name: 'Tài chính',
    category: 'finance',
    prompt: 'Xu hướng lãi suất ngân hàng và biến động giá vàng năm 2026',
    expectedDuration: 60,
  },
  {
    id: 'tc_03_tech',
    name: 'Công nghệ',
    category: 'tech',
    prompt: 'Đánh giá chip xử lý AI thế hệ mới trên smartphone flagship',
    expectedDuration: 45,
  },
  {
    id: 'tc_04_business',
    name: 'Doanh nghiệp',
    category: 'business',
    prompt: 'Chiến lược mở rộng chuỗi bán lẻ của các tập đoàn tiêu dùng hàng đầu',
    expectedDuration: 45,
  },
  {
    id: 'tc_05_travel',
    name: 'Địa điểm / Du lịch',
    category: 'travel',
    prompt: 'Tạo video giới thiệu về Du lịch Hà Tĩnh',
    expectedDuration: 60,
  },
  {
    id: 'tc_06_education',
    name: 'Giáo dục',
    category: 'education',
    prompt: '5 kỹ năng tư duy phản biện và tự học hiệu quả cho sinh viên',
    expectedDuration: 45,
  },
  {
    id: 'tc_07_product',
    name: 'Sản phẩm',
    category: 'vehicle',
    prompt: 'Đánh giá xe ô tô điện VinFast VF 3 thực tế',
    expectedDuration: 60,
  },
  {
    id: 'tc_08_news',
    name: 'Tin tức',
    category: 'news',
    prompt: 'Bản tin tiến độ dự án đường sắt cao tốc Bắc Nam',
    expectedDuration: 45,
  },
  {
    id: 'tc_09_statistics',
    name: 'Dữ liệu thống kê',
    category: 'business',
    prompt: 'Thống kê tăng trưởng kim ngạch xuất khẩu nông sản Việt Nam',
    expectedDuration: 45,
  },
  {
    id: 'tc_10_article_url',
    name: 'URL bài viết',
    category: 'travel',
    prompt: 'Khám phá Nhà thờ Đổ Hải Lý chứng tích biến đổi khí hậu',
    url: 'https://vnexpress.net/nha-tho-do-hai-ly-la-chung-tich-bien-doi-khi-hau-dau-tien-cua-viet-nam-5122807.html',
    expectedDuration: 60,
  },
];

import { PipelineCoordinator } from '../src/engine/pipelineCoordinator.js';

export async function runRegressionTest(): Promise<{
  passedCount: number;
  failedCount: number;
  total: number;
  results: Array<{
    id: string;
    name: string;
    score: number;
    passed: boolean;
    reasons: string[];
    criticalIssues: number;
  }>;
}> {
  console.log('🧪 BẮT ĐẦU CHẠY BỘ REGRESSION TEST VỚI PIPELINE COORDINATOR (10 DOMAIN TEST CASES)...\n');

  const results: any[] = [];
  let passedCount = 0;

  for (const tc of REGRESSION_TEST_CASES) {
    const startTime = Date.now();
    console.log(`▶️ [Test ${tc.id}] ${tc.name}: "${tc.prompt}"...`);

    try {
      const pipelineResult = await PipelineCoordinator.execute({
        jobId: `test_${tc.id}`,
        prompt: tc.prompt,
        targetDuration: tc.expectedDuration,
        url: tc.url,
        profile: 'BALANCED',
        extractedContext: `${tc.prompt} là chủ đề trọng tâm được phân tích chi tiết với số liệu thực tế từ các nguồn uy tín hàng đầu.`,
        articleTitle: tc.name,
      });

      const passed = pipelineResult.qualityScore.passedProductionGate;
      if (passed) passedCount++;

      console.log(`   🏁 ContentType: ${pipelineResult.brief.contentType} | Hook: ${pipelineResult.selectedHook.archetype} | Arc: ${pipelineResult.storyboard.arcType}`);
      console.log(`   🏁 Điểm: ${pipelineResult.qualityScore.totalScore}/100 | Critical Issues: ${pipelineResult.reviewResult.criticalIssuesCount} | Kết quả: ${passed ? '✅ PASS' : '❌ FAIL'} (${Date.now() - startTime}ms)`);

      results.push({
        id: tc.id,
        name: tc.name,
        score: pipelineResult.qualityScore.totalScore,
        passed,
        reasons: pipelineResult.qualityScore.reasons,
        criticalIssues: pipelineResult.reviewResult.criticalIssuesCount,
      });
    } catch (err: any) {
      console.error(`   ❌ Lỗi ngoại lệ trong test ${tc.id}:`, err.message);
      results.push({
        id: tc.id,
        name: tc.name,
        score: 0,
        passed: false,
        reasons: [err.message],
        criticalIssues: 1,
      });
    }
  }

  const failedCount = REGRESSION_TEST_CASES.length - passedCount;
  console.log(`\n======================================================`);
  console.log(`📊 KẾT QUẢ REGRESSION TEST: ${passedCount}/${REGRESSION_TEST_CASES.length} TEST CASES ĐẠT CHUẨN (${(passedCount / REGRESSION_TEST_CASES.length * 100).toFixed(0)}%)`);
  console.log(`======================================================\n`);

  return {
    passedCount,
    failedCount,
    total: REGRESSION_TEST_CASES.length,
    results,
  };
}

if (process.argv[1]?.includes('regressionSuite')) {
  runRegressionTest();
}
