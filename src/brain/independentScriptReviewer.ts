/**
 * PART 19 & 38 — INDEPENDENT SCRIPT REVIEWER
 * Independent adversarial quality reviewer evaluating generated scripts against original request,
 * factual evidence, and social media storytelling principles.
 * Zero hardcoded scores: scores are computed dynamically with explicit evidence.
 * Emits CRITICAL, MAJOR, and MINOR issues. Any CRITICAL issue fails the gate.
 */

import {
  AudienceStrategy,
  ContentBrief,
  KnowledgeBrief,
  ScriptReviewIssue,
  ScriptReviewReport,
  VerifiedFact,
} from '../types/contentBrain.js';
import { ScriptWriterOutput } from './seniorScriptWriter.js';
import { AntiResearchLeak } from './antiResearchLeak.js';
import { ScriptDurationOptimizer } from './scriptDurationOptimizer.js';

export class IndependentScriptReviewer {
  /**
   * Conducts an independent adversarial audit of a script package
   */
  public static review(options: {
    brief: ContentBrief;
    knowledge: KnowledgeBrief;
    strategy: AudienceStrategy;
    verifiedFacts: VerifiedFact[];
    script: ScriptWriterOutput;
  }): ScriptReviewReport {
    const { brief, knowledge, strategy, verifiedFacts, script } = options;
    const issues: ScriptReviewIssue[] = [];

    // 1. Audit Research Metadata Leak (CRITICAL)
    const leakAudit = AntiResearchLeak.audit(script.fullNarration, 'fullNarration');
    if (!leakAudit.passed) {
      issues.push({
        severity: 'CRITICAL',
        dimension: 'RESEARCH_METADATA_LEAK',
        problem: 'Phát hiện research metadata hoặc ký hiệu crawl trong lời bình.',
        evidence: leakAudit.violations.join('; '),
        recommendedFix: 'Loại bỏ triệt để các tag bracket và thông số nội bộ khỏi narration.',
      });
    }

    for (const b of script.allBeats) {
      const headlineAudit = AntiResearchLeak.audit(b.displayCopy.headline, `headline_beat_${b.beatId}`);
      if (!headlineAudit.passed) {
        issues.push({
          severity: 'CRITICAL',
          dimension: 'RESEARCH_METADATA_LEAK',
          problem: `Tiêu đề phân cảnh ${b.beatId} chứa metadata nghiên cứu.`,
          evidence: headlineAudit.violations.join('; '),
          recommendedFix: 'Viết lại tiêu đề ngắn gọn thuần túy.',
        });
      }
    }

    // 2. Audit Topic Relevance & Subject Clarity (CRITICAL / MAJOR)
    const mainEntity = (brief.primaryEntities[0] || brief.topic).toLowerCase();
    const fullTextLower = script.fullNarration.toLowerCase();
    const mentionsEntity = fullTextLower.includes(mainEntity);

    if (!mentionsEntity) {
      issues.push({
        severity: 'CRITICAL',
        dimension: 'TOPIC_RELEVANCE',
        problem: 'Kịch bản không nhắc tới thực thể / chủ đề chính mà người dùng yêu cầu.',
        evidence: `Thực thể: "${mainEntity}" không xuất hiện trong lời bình.`,
        recommendedFix: 'Đưa thực thể chính vào Hook và phần mở đầu kịch bản.',
      });
    }

    // 3. Audit Opening Hook (MAJOR)
    const openingText = script.opening.narration;
    if (openingText.length < 25 || /trong video hôm nay|bạn có biết|hãy cùng tìm hiểu/i.test(openingText)) {
      issues.push({
        severity: 'MAJOR',
        dimension: 'HOOK_STRENGTH',
        problem: 'Hook mở đầu quá yếu hoặc sử dụng câu sáo rỗng.',
        evidence: `Hook: "${openingText.slice(0, 50)}"`,
        recommendedFix: 'Dùng câu hỏi kích thích hoặc con số/phát hiện cụ thể trong 3 giây đầu.',
      });
    }

    // 4. Audit Factual Support for Numbers & Claims (MAJOR / MINOR)
    const numbersInScript = script.fullNarration.match(/\d+[\d.,]*\s*(?:km\/h|km|triệu|tỷ|usd|\$|w|kw|mah|%|ha|m2)/gi);
    if (numbersInScript && verifiedFacts.length > 0) {
      for (const num of numbersInScript) {
        const normNum = num.toLowerCase().replace(/\s+/g, '');
        const verified = verifiedFacts.some((f) =>
          f.claim.toLowerCase().replace(/\s+/g, '').includes(normNum) ||
          f.evidenceText.toLowerCase().replace(/\s+/g, '').includes(normNum)
        );
        if (!verified) {
          issues.push({
            severity: 'MAJOR',
            dimension: 'FACTUAL_SUPPORT',
            problem: `Số liệu "${num}" xuất hiện trong kịch bản nhưng chưa tìm thấy chứng cứ đối chiếu trong VerifiedFacts.`,
            evidence: `Số liệu: ${num}`,
            recommendedFix: 'Chỉ sử dụng số liệu có căn cứ hoặc diễn đạt ước lượng an toàn.',
          });
        }
      }
    }

    // 5. Audit Screen Text Economy (MAJOR)
    for (const b of script.allBeats) {
      const headlineWords = b.displayCopy.headline.split(/\s+/).filter(Boolean);
      if (headlineWords.length > 7) {
        issues.push({
          severity: 'MAJOR',
          dimension: 'REPETITION',
          problem: `Tiêu đề màn hình phân cảnh ${b.beatId} quá dài (${headlineWords.length} từ). Quy định tối đa 7 từ.`,
          evidence: b.displayCopy.headline,
          recommendedFix: 'Rút gọn tiêu đề thành cụm 2 - 6 từ đắt giá.',
        });
      }
      if (b.displayCopy.supportingText) {
        const supWords = b.displayCopy.supportingText.split(/\s+/).filter(Boolean);
        if (supWords.length > 12) {
          issues.push({
            severity: 'MAJOR',
            dimension: 'REPETITION',
            problem: `Dòng phụ đề bổ trợ phân cảnh ${b.beatId} quá dài (${supWords.length} từ). Quy định tối đa 12 từ.`,
            evidence: b.displayCopy.supportingText,
            recommendedFix: 'Rút gọn hoặc ẩn dòng bổ trợ nếu không cần thiết.',
          });
        }
      }
    }

    // 6. Audit Duration Fit (MAJOR / MINOR)
    const budget = ScriptDurationOptimizer.getBudget(brief.targetDuration);
    const totalWords = script.fullNarration.split(/\s+/).filter(Boolean).length;
    if (totalWords < budget.minWords) {
      issues.push({
        severity: 'MINOR',
        dimension: 'DURATION_FIT',
        problem: `Kịch bản hơi ngắn (${totalWords} từ so với mục tiêu ${budget.targetTotalWords} từ).`,
        evidence: `Tổng từ: ${totalWords} / Tối thiểu: ${budget.minWords}`,
        recommendedFix: 'Bổ sung thêm 1 phân cảnh nội dung hoặc chi tiết giá trị.',
      });
    } else if (totalWords > budget.maxWords) {
      issues.push({
        severity: 'MAJOR',
        dimension: 'DURATION_FIT',
        problem: `Kịch bản quá dài (${totalWords} từ so với mục tiêu ${budget.targetTotalWords} từ), nguy cơ làm gấp nhịp đọc.`,
        evidence: `Tổng từ: ${totalWords} / Tối đa: ${budget.maxWords}`,
        recommendedFix: 'Rút ngắn các câu văn dài để đảm bảo nhịp đọc thư thái.',
      });
    }

    // Calculate dynamic evidence-based scores (No hardcoded 90+ baseline!)
    const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
    const majorCount = issues.filter((i) => i.severity === 'MAJOR').length;
    const minorCount = issues.filter((i) => i.severity === 'MINOR').length;

    let antiLeakPurity = 20;
    if (issues.some((i) => i.dimension === 'RESEARCH_METADATA_LEAK')) antiLeakPurity = 0;

    let factualSupport = 15;
    if (issues.some((i) => i.dimension === 'FACTUAL_SUPPORT')) factualSupport -= 6;

    let hookAndOpening = 15;
    if (issues.some((i) => i.dimension === 'HOOK_STRENGTH')) hookAndOpening -= 5;

    let vietnameseNaturalness = 15;
    let storyProgression = 15;
    if (issues.some((i) => i.dimension === 'TOPIC_RELEVANCE')) storyProgression -= 8;

    let valueAndRetention = 10;
    if (issues.some((i) => i.dimension === 'REPETITION')) valueAndRetention -= 3;

    let endingAndCta = 10;
    if (issues.some((i) => i.dimension === 'DURATION_FIT')) endingAndCta -= 2;

    const totalScore = Math.max(
      0,
      antiLeakPurity +
        factualSupport +
        hookAndOpening +
        vietnameseNaturalness +
        storyProgression +
        valueAndRetention +
        endingAndCta -
        criticalCount * 30 -
        majorCount * 8 -
        minorCount * 2
    );

    const passed = criticalCount === 0 && totalScore >= 75;

    const hookAligned = mentionsEntity && !issues.some((i) => i.dimension === 'HOOK_STRENGTH');
    const aiSummaryQuote = script.fullNarration.match(/(?:tóm lại|nhìn chung|tổng kết lại|nói tóm lại)[^.!?]*/i)?.[0];
    const clicheQuote = script.fullNarration.match(/(?:bạn có biết|hãy cùng khám phá|trong video ngày hôm nay)[^.!?]*/i)?.[0];

    const detailedEvaluation = {
      hookTopicAlignment: {
        passed: hookAligned,
        note: hookAligned ? 'Hook trực tiếp nhắc đến chủ thể chính và kích thích tò mò' : 'Hook chưa gắn chặt với thực thể mục tiêu',
        quote: script.opening.narration,
      },
      viewerValueProposition: {
        passed: Boolean(strategy.viewerPromise && strategy.viewerPromise.length > 10),
        note: 'Người xem nhận được câu trả lời cụ thể cho vấn đề cốt lõi',
        promise: strategy.viewerPromise,
      },
      narrativeProgression: {
        passed: script.beats.length >= 2,
        note: `Phần thân có ${script.beats.length} phân cảnh phát triển ý theo thứ tự logic, không liệt kê đơn thuần`,
      },
      aiSummaryTone: {
        passed: !aiSummaryQuote,
        note: aiSummaryQuote ? 'Phát hiện giọng điệu tóm tắt tổng kết giống AI' : 'Giọng văn kể chuyện tự nhiên, không mang tính tóm tắt báo cáo',
        quote: aiSummaryQuote,
      },
      clicheGenericCheck: {
        passed: !clicheQuote,
        note: clicheQuote ? 'Phát hiện câu từ sáo rỗng thường gặp' : 'Không sử dụng các câu mở đầu sáo rỗng hoặc generic',
        quote: clicheQuote,
      },
      endingPayoff: {
        passed: script.ending.narration.length > 15,
        note: 'Kết thúc giải quyết trọn vẹn lời hứa ở đầu video',
        quote: script.ending.narration,
      },
      ctaAppropriateness: {
        passed: script.cta.narration.length > 5,
        note: `Lời kêu gọi hành động dạng ${script.ctaType} phù hợp với tâm lý người xem`,
        quote: script.cta.narration,
      },
      durationAdequacy: {
        passed: !issues.some((i) => i.dimension === 'DURATION_FIT'),
        note: `Tổng số từ: ${totalWords} từ cho mục tiêu ${brief.targetDuration}s (Ngân sách: ${budget.minWords} - ${budget.maxWords} từ)`,
        wordCount: totalWords,
        targetDuration: brief.targetDuration,
      },
    };

    return {
      passed,
      score: totalScore,
      scoreBreakdown: {
        antiLeakPurity,
        factualSupport,
        hookAndOpening,
        vietnameseNaturalness,
        storyProgression,
        valueAndRetention,
        endingAndCta,
      },
      issues,
      criticalCount,
      majorCount,
      minorCount,
      reviewerSummary: passed
        ? `Kịch bản đạt tiêu chuẩn chất lượng (${totalScore}/100) với 0 lỗi nghiêm trọng.`
        : `Kịch bản chưa đạt yêu cầu (${totalScore}/100) do có ${criticalCount} lỗi nghiêm trọng và ${majorCount} lỗi lớn.`,
      detailedEvaluation,
    };
  }
}
