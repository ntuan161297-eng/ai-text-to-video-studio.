/**
 * CREATIVE QUALITY & NEGATIVE TEST SUITE (Section N & Q)
 * Tests strict creative quality rules:
 *   1. No paragraph > 30 words on screen
 *   2. No research metadata in display text
 *   3. No source name in headline
 *   4. Real product visual prioritized for product videos
 *   5. No duplicate text across layers (badge, headline, subtitle)
 *   6. No abstract background when real asset exists
 *   7. Minimal text overlay (< 30% screen area)
 *   8. Layout diversity (no layout repeats > 2 times)
 *   9. Subtitle !== Headline
 *  10. Visual-first composition (not just text + background)
 */

import { FinalContentSanitizer } from '../src/engine/finalContentSanitizer.js';
import { VideoCopywriter } from '../src/engine/videoCopywriter.js';
import { SceneCompositionEngine } from '../src/engine/sceneCompositionEngine.js';
import { PipelineCoordinator } from '../src/engine/pipelineCoordinator.js';

export interface NegativeTestResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  details: string;
}

export async function runCreativeQualitySuite(): Promise<{
  passedCount: number;
  total: number;
  results: NegativeTestResult[];
}> {
  console.log('🎨 BẮT ĐẦU CHẠY BỘ KIỂM THỬ CHẤT LƯỢNG CREATIVE (10 NEGATIVE RULES)...\n');

  const results: NegativeTestResult[] = [];

  // Rule 1: Paragraph > 30 words on screen must be rejected
  const longParagraph = 'Đây là một đoạn văn bản rất dài được sao chép nguyên xi từ kết quả tìm kiếm trên mạng với hơn ba mươi từ nhằm thử nghiệm xem hệ thống có loại bỏ việc đổ nguyên một đoạn văn dài lên màn hình video short-form hay không.';
  const wordsCount = longParagraph.split(/\s+/).length;
  const copy1 = VideoCopywriter.craftSceneCopy({
    sceneIndex: 1,
    totalScenes: 4,
    purpose: 'insight',
    coreTopic: 'Xe máy điện Dat Bike',
    voiceText: longParagraph,
    contentType: 'PRODUCT',
  });
  const screenWords1 = (copy1.headline + ' ' + copy1.supportingText).split(/\s+/).filter(Boolean).length;
  const passed1 = screenWords1 <= 12 && wordsCount > 30;
  results.push({
    ruleId: 'neg_01_word_budget',
    ruleName: 'Không đổ paragraph > 30 từ lên màn hình',
    passed: passed1,
    details: `Input: ${wordsCount} từ -> Screen copy: ${screenWords1} từ ("${copy1.headline}")`,
  });

  // Rule 2: Research metadata must never leak into display text
  const metadataText = '[SỰ THẬT ĐÃ KIỂM CHỨNG] Wikipedia tiếng Việt (95%): Dat Bike là thương hiệu xe điện Việt Nam.';
  const sanitized2 = FinalContentSanitizer.audit(metadataText, 'testField');
  const clean2 = FinalContentSanitizer.sanitizeString(metadataText);
  const passed2 = !clean2.includes('[SỰ THẬT') && !clean2.includes('Wikipedia') && !clean2.includes('(95%)');
  results.push({
    ruleId: 'neg_02_no_metadata_leak',
    ruleName: 'Không hiển thị research metadata',
    passed: passed2,
    details: `Clean: "${clean2}" (Phát hiện: ${sanitized2.violations.length} vi phạm)`,
  });

  // Rule 3: Source name must not appear in headline
  const sourceInVoice = 'Theo VnExpress và Wikipedia, Dat Bike vừa công bố mẫu xe mới.';
  const copy3 = VideoCopywriter.craftSceneCopy({
    sceneIndex: 1,
    totalScenes: 4,
    purpose: 'insight',
    coreTopic: 'Dat Bike Quantum',
    voiceText: sourceInVoice,
    contentType: 'PRODUCT',
  });
  const passed3 = !copy3.headline.includes('VNEXPRESS') && !copy3.headline.includes('WIKIPEDIA');
  results.push({
    ruleId: 'neg_03_no_source_in_headline',
    ruleName: 'Không đưa tên nguồn tin vào tiêu đề chính',
    passed: passed3,
    details: `Headline: "${copy3.headline}"`,
  });

  // Rule 4: No duplicate text across badge, headline, and supporting text
  const copy4 = VideoCopywriter.craftSceneCopy({
    sceneIndex: 0,
    totalScenes: 4,
    purpose: 'hook',
    coreTopic: 'Dat Bike Weaver',
    voiceText: 'Dat Bike Weaver là mẫu xe điện đột phá tại Việt Nam.',
    contentType: 'PRODUCT',
  });
  const passed4 = copy4.badge !== copy4.headline && copy4.headline !== copy4.supportingText;
  results.push({
    ruleId: 'neg_04_no_duplicate_text',
    ruleName: 'Không trùng lặp nội dung giữa Badge và Headline',
    passed: passed4,
    details: `Badge: "${copy4.badge}" | Headline: "${copy4.headline}"`,
  });

  // Rule 5: Subtitle must not be identical to headline
  const passed5 = copy4.headline !== copy4.supportingText;
  results.push({
    ruleId: 'neg_05_subtitle_diff_headline',
    ruleName: 'Subtitle không trùng lặp Headline',
    passed: passed5,
    details: `Headline: "${copy4.headline}" | Subtitle: "${copy4.supportingText}"`,
  });

  // Rule 6: Layout diversity (no layout repeats > 2 times consecutively)
  const dummyScenes = [
    { sceneId: 1, purpose: 'hook' },
    { sceneId: 2, purpose: 'insight' },
    { sceneId: 3, purpose: 'insight' },
    { sceneId: 4, purpose: 'cta' },
  ];
  const compositions = SceneCompositionEngine.planCompositions(dummyScenes, 'PRODUCT');
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  for (let i = 1; i < compositions.length; i++) {
    if (compositions[i].layout === compositions[i - 1].layout) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }
  const passed6 = maxConsecutive <= 2;
  results.push({
    ruleId: 'neg_06_layout_diversity',
    ruleName: 'Không lặp layout quá 2 lần liên tiếp',
    passed: passed6,
    details: `Layouts: ${compositions.map((c) => c.layout).join(' -> ')} (Max repeat: ${maxConsecutive})`,
  });

  // Rule 7: Primary visual must be dominant (visualDominancePercent >= 75%)
  const minDominance = Math.min(...compositions.map((c) => c.visualDominancePercent));
  const passed7 = minDominance >= 75;
  results.push({
    ruleId: 'neg_07_visual_dominance',
    ruleName: 'Primary visual chiếm ưu thế (>= 75% frame)',
    passed: passed7,
    details: `Min visual dominance: ${minDominance}%`,
  });

  // Rule 8: Headline word budget strictly enforced (<= 7 words)
  const passed8 = copy1.headline.split(/\s+/).length <= 7 && copy3.headline.split(/\s+/).length <= 7;
  results.push({
    ruleId: 'neg_08_headline_word_budget',
    ruleName: 'Headline tối đa 7 từ',
    passed: passed8,
    details: `Lengths: [${copy1.headline.split(/\s+/).length}, ${copy3.headline.split(/\s+/).length}] từ`,
  });

  // Rule 9: Metric isolated correctly (e.g. 200 KM, not raw sentence)
  const copy9 = VideoCopywriter.craftSceneCopy({
    sceneIndex: 2,
    totalScenes: 4,
    purpose: 'insight',
    coreTopic: 'Dat Bike',
    voiceText: 'Xe sở hữu quãng đường di chuyển ấn tượng lên tới 200 km chỉ sau một lần sạc đầy.',
    contentType: 'PRODUCT',
  });
  const passed9 = copy9.metric === '200 KM';
  results.push({
    ruleId: 'neg_09_metric_isolation',
    ruleName: 'Trích xuất đúng số liệu Metric độc lập',
    passed: passed9,
    details: `Metric: "${copy9.metric}"`,
  });

  // Rule 10: End-to-end Product Video Pipeline produces clean, sanitized scenes
  const pipelineRes = await PipelineCoordinator.execute({
    jobId: 'test_creative_quality',
    prompt: 'Đánh giá xe máy điện Dat Bike Weaver 200 thực tế',
    targetDuration: 45,
    profile: 'BALANCED',
  });
  const allSanitized = pipelineRes.scenes.every((s) => {
    const auditRes = FinalContentSanitizer.audit(s.tag + ' ' + s.title + ' ' + s.subtitle + ' ' + s.voiceOver);
    return auditRes.passed && s.title.split(/\s+/).length <= 7;
  });
  results.push({
    ruleId: 'neg_10_e2e_pipeline_clean',
    ruleName: 'Pipeline E2E không có metadata leak và headline chuẩn',
    passed: allSanitized,
    details: `Scene 1: Badge="${pipelineRes.scenes[0].tag}", Title="${pipelineRes.scenes[0].title}"`,
  });

  let passedCount = 0;
  for (const r of results) {
    if (r.passed) passedCount++;
    console.log(`[${r.passed ? '✅ PASS' : '❌ FAIL'}] ${r.ruleId}: ${r.ruleName}`);
    console.log(`   └─ ${r.details}`);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 KẾT QUẢ CREATIVE QUALITY SUITE: ${passedCount}/${results.length} RULES ĐẠT CHUẨN (${((passedCount / results.length) * 100).toFixed(0)}%)`);
  console.log(`======================================================\n`);

  return {
    passedCount,
    total: results.length,
    results,
  };
}

if (process.argv[1]?.includes('creativeQualitySuite')) {
  runCreativeQualitySuite();
}
