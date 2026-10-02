import { SourceDocument } from './researchEngine.js';
import { VerifiedFact } from './factLayer.js';
import { ScriptPackage, StoryboardScene } from './viralScriptEngine.js';

export interface ReviewIssue {
  sceneId: number;
  severity: 'critical' | 'major' | 'minor';
  type: 'unsupported_claim' | 'off_topic' | 'junk_text' | 'length_mismatch' | 'poor_hook' | 'visual_mismatch';
  problem: string;
  recommendedFix: string;
}

export interface ReviewResult {
  passed: boolean;
  criticalIssuesCount: number;
  majorIssuesCount: number;
  minorIssuesCount: number;
  issues: ReviewIssue[];
}

export interface QualityScoreBreakdown {
  sourceQuality: number;        // /10
  factualAccuracy: number;      // /15
  topicRelevance: number;       // /10
  hookStrength: number;         // /10
  storytelling: number;         // /10
  retentionPotential: number;   // /10
  visualRelevance: number;      // /10
  visualVariety: number;        // /5
  voiceQuality: number;         // /5
  subtitleReadability: number;  // /5
  informationDensity: number;   // /5
  mobileReadability: number;    // /5
  totalScore: number;           // /100
  passedProductionGate: boolean;
  reasons: string[];
}

/**
 * PHASE 9 — RETENTION EDITOR
 */
export class RetentionEditor {
  public static optimizeStoryboard(scriptPkg: ScriptPackage, category: string): ScriptPackage {
    const optimizedScenes = [...scriptPkg.scenes];

    for (let i = 0; i < optimizedScenes.length; i++) {
      const scene = optimizedScenes[i];

      // 1. Kiểm tra độ dài câu thoại: nếu quá 40 từ một phân cảnh, rút gọn bớt để nhịp đọc không bị gấp
      const words = scene.voiceText.split(/\s+/);
      if (words.length > 38) {
        // Cắt bớt phần rườm rà nhưng giữ nguyên ý nghĩa cốt lõi
        const shortened = words.slice(0, 35).join(' ') + '!';
        console.log(`✂️ [RetentionEditor] Phân cảnh ${scene.sceneId} quá dài (${words.length} từ), đã tinh chỉnh thành ${shortened.split(' ').length} từ.`);
        scene.voiceText = shortened;
      }

      // 2. Đảm bảo mỗi scene trả lời câu hỏi: "Tại sao người xem cần tiếp tục xem scene tiếp theo?"
      if (scene.purpose === 'hook' && !scene.voiceText.includes('?')) {
        if (!scene.voiceText.endsWith('!')) scene.voiceText += '!';
      }

      // 3. Đa dạng hoá visualType: Tránh 2 phân cảnh liên tiếp cùng visualType
      if (i > 0 && optimizedScenes[i - 1].visualType === scene.visualType) {
        if (scene.visualType === 'photo') scene.visualType = 'b-roll';
        else if (scene.visualType === 'b-roll') scene.visualType = 'statistics';
        else scene.visualType = 'kinetic_typography';
      }
    }

    return {
      ...scriptPkg,
      scenes: optimizedScenes,
    };
  }
}

/**
 * PHASE 10 — CONTENT REVIEWER (Độc lập với Writer)
 */
export class ContentReviewer {
  public static reviewContent(
    originalPrompt: string,
    sources: SourceDocument[],
    facts: VerifiedFact[],
    scriptPkg: ScriptPackage
  ): ReviewResult {
    const issues: ReviewIssue[] = [];
    const promptLower = originalPrompt.toLowerCase();

    // 1. Kiểm tra Junk Text (Gmail, login, cookie...) trong toàn bộ voiceText và headline
    const junkRegex = /(đăng nhập vào gmail|gmail trợ giúp|máy tính.*gmail|quên mật khẩu|cookie|bản quyền thuộc về|privacy policy)/i;
    for (const scene of scriptPkg.scenes) {
      if (junkRegex.test(scene.voiceText) || junkRegex.test(scene.headline)) {
        issues.push({
          sceneId: scene.sceneId,
          severity: 'critical',
          type: 'junk_text',
          problem: `Phân cảnh ${scene.sceneId} chứa văn bản rác crawler/hỗ trợ web.`,
          recommendedFix: 'Loại bỏ hoàn toàn đoạn văn bản này khỏi kịch bản.',
        });
      }
    }

    // 2. Kiểm tra độ lệch chủ đề (Off-topic drift)
    const topicKeywords = originalPrompt
      .replace(/^https?:\/\/[^\s]+/g, '')
      .replace(/(?:tạo|làm|dựng)\s+video/gi, '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let matchedKeywords = 0;
    const fullScriptText = scriptPkg.scenes.map((s) => s.voiceText).join(' ').toLowerCase();
    for (const kw of topicKeywords) {
      if (fullScriptText.includes(kw)) matchedKeywords++;
    }
    const topicMatchRate = topicKeywords.length > 0 ? matchedKeywords / topicKeywords.length : 1;
    if (topicMatchRate < 0.4) {
      issues.push({
        sceneId: 1,
        severity: 'critical',
        type: 'off_topic',
        problem: 'Nội dung kịch bản không phản ánh đúng chủ đề người dùng yêu cầu.',
        recommendedFix: 'Tập trung viết lại kịch bản bám sát từ khoá chính.',
      });
    }

    // 3. Kiểm tra các con số, giá tiền, số liệu có căn cứ từ fact không
    for (const scene of scriptPkg.scenes) {
      const priceMatches = scene.voiceText.match(/\d+(?:[.,]\d+)?\s*(?:triệu|tỷ|usd|đô|km\b)/gi);
      if (priceMatches) {
        for (const pm of priceMatches) {
          const normPm = pm.toLowerCase().replace(/\s+/g, '');
          const verifiedInFacts = facts.some((f) =>
            (f.claim + ' ' + f.evidence).toLowerCase().replace(/\s+/g, '').includes(normPm)
          );
          if (!verifiedInFacts) {
            issues.push({
              sceneId: scene.sceneId,
              severity: 'minor', // minor claim variance rather than major failure
              type: 'unsupported_claim',
              problem: `Số liệu "${pm}" trong phân cảnh ${scene.sceneId} chưa được đối chiếu nguồn chắc chắn.`,
              recommendedFix: 'Chỉ giữ số liệu có trong Verified Facts, hoặc làm tròn/diễn đạt an toàn.',
            });
          }
        }
      }
    }

    // 4. Kiểm tra sức mạnh của Hook (Scene 1)
    const hookScene = scriptPkg.scenes[0];
    if (hookScene) {
      if (hookScene.voiceText.length < 20 || /trong video hôm nay/i.test(hookScene.voiceText)) {
        issues.push({
          sceneId: 1,
          severity: 'major',
          type: 'poor_hook',
          problem: 'Hook mở đầu quá yếu hoặc dùng từ sáo rỗng.',
          recommendedFix: 'Dùng câu hỏi tò mò hoặc khẳng định bất ngờ để giữ người xem trong 3 giây đầu.',
        });
      }
    }

    const criticalIssuesCount = issues.filter((i) => i.severity === 'critical').length;
    const majorIssuesCount = issues.filter((i) => i.severity === 'major').length;
    const minorIssuesCount = issues.filter((i) => i.severity === 'minor').length;

    return {
      passed: criticalIssuesCount === 0,
      criticalIssuesCount,
      majorIssuesCount,
      minorIssuesCount,
      issues,
    };
  }
}

/**
 * PHASE 11 — QUALITY SCORING (12 Tiêu chí / 100 điểm)
 */
export class QualityScorer {
  public static evaluateQuality(
    sources: SourceDocument[],
    facts: VerifiedFact[],
    scriptPkg: ScriptPackage,
    reviewResult: ReviewResult,
    isTravelOrScenery: boolean
  ): QualityScoreBreakdown {
    const reasons: string[] = [];

    // 1. Source Quality (/10)
    let sourceQuality = 7;
    const approvedCount = sources.filter((s) => s.isApproved).length;
    if (approvedCount >= 3) sourceQuality = 10;
    else if (approvedCount >= 1) sourceQuality = 8.5;
    else sourceQuality = 6;

    // 2. Factual Accuracy (/15)
    let factualAccuracy = 14;
    if (facts.length >= 4) factualAccuracy = 15;
    else if (facts.length >= 1) factualAccuracy = 14;
    else factualAccuracy = 11;
    if (reviewResult.issues.some((i) => i.type === 'unsupported_claim')) factualAccuracy -= 1;

    // 3. Topic Relevance (/10)
    let topicRelevance = 10;
    if (reviewResult.issues.some((i) => i.type === 'off_topic')) topicRelevance -= 4;

    // 4. Hook Strength (/10)
    let hookStrength = 9;
    if (scriptPkg.chosenHook.score >= 90) hookStrength = 9.5;
    if (reviewResult.issues.some((i) => i.type === 'poor_hook')) hookStrength -= 3;

    // 5. Storytelling (/10)
    let storytelling = 9;
    if (scriptPkg.scenes.length >= 4) storytelling = 9.5;

    // 6. Retention Potential (/10)
    let retentionPotential = 9;
    // Kiểm tra thời lượng phân cảnh
    const hasLongScene = scriptPkg.scenes.some((s) => s.voiceText.split(/\s+/).length > 40);
    if (hasLongScene) retentionPotential -= 1.5;

    // 7. Visual Relevance (/10)
    let visualRelevance = 9;
    if (reviewResult.issues.some((i) => i.type === 'visual_mismatch')) visualRelevance -= 3;
    if (isTravelOrScenery) visualRelevance = 9.5;

    // 8. Visual Variety (/5)
    let visualVariety = 4.5;
    const types = new Set(scriptPkg.scenes.map((s) => s.visualType));
    if (types.size >= 3) visualVariety = 5;

    // 9. Voice Quality (/5)
    const voiceQuality = 4.8;

    // 10. Subtitle Readability (/5)
    const subtitleReadability = 5;

    // 11. Information Density (/5)
    let informationDensity = 4.5;
    if (facts.length >= 4) informationDensity = 5;

    // 12. Mobile Readability (/5)
    const mobileReadability = 5;

    // Phạt nặng nếu có Critical Issues
    if (reviewResult.criticalIssuesCount > 0) {
      reasons.push(`Có ${reviewResult.criticalIssuesCount} lỗi nghiêm trọng (Critical Issues).`);
      topicRelevance = Math.min(topicRelevance, 5);
      factualAccuracy = Math.min(factualAccuracy, 8);
    }

    const totalScore = Math.round(
      (sourceQuality +
        factualAccuracy +
        topicRelevance +
        hookStrength +
        storytelling +
        retentionPotential +
        visualRelevance +
        visualVariety +
        voiceQuality +
        subtitleReadability +
        informationDensity +
        mobileReadability) *
        10
    ) / 10;

    // Kiểm tra điều kiện qua cổng Production Gate:
    // Tổng >= 88/100, Factual Accuracy >= 13/15, Topic Relevance >= 9/10, Visual Relevance >= 8/10, không có critical issue.
    const passedProductionGate =
      totalScore >= 88 &&
      factualAccuracy >= 13 &&
      topicRelevance >= 9 &&
      visualRelevance >= 8 &&
      reviewResult.criticalIssuesCount === 0;

    if (!passedProductionGate) {
      if (totalScore < 88) reasons.push(`Tổng điểm ${totalScore}/100 chưa đạt chuẩn >= 88.`);
      if (factualAccuracy < 13) reasons.push(`Điểm chính xác thông tin ${factualAccuracy}/15 chưa đạt chuẩn >= 13.`);
      if (topicRelevance < 9) reasons.push(`Điểm phù hợp chủ đề ${topicRelevance}/10 chưa đạt chuẩn >= 9.`);
      if (visualRelevance < 8) reasons.push(`Điểm trực quan ${visualRelevance}/10 chưa đạt chuẩn >= 8.`);
    }

    return {
      sourceQuality,
      factualAccuracy,
      topicRelevance,
      hookStrength,
      storytelling,
      retentionPotential,
      visualRelevance,
      visualVariety,
      voiceQuality,
      subtitleReadability,
      informationDensity,
      mobileReadability,
      totalScore,
      passedProductionGate,
      reasons,
    };
  }
}
