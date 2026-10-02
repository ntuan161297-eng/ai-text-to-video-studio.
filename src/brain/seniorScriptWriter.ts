/**
 * PARTS 12 - 18 — SENIOR SCRIPT WRITER
 * Writes natural, conversational spoken Vietnamese social video scripts.
 * Adheres strictly to: 1 sentence ≈ 1 idea, no raw research leakage, no template clichés.
 * Solves pacing and progression: Hook -> Setup -> Progression -> Reveal/Payoff -> Ending -> CTA.
 */

import {
  AudienceStrategy,
  ContentBrief,
  CtaType,
  CreativeAngleCandidate,
  HookCandidate,
  KnowledgeBrief,
  ScriptBeat,
  VerifiedFact,
} from '../types/contentBrain.js';
import { DurationBudget, ScriptDurationOptimizer } from './scriptDurationOptimizer.js';
import { AntiResearchLeak } from './antiResearchLeak.js';

export interface ScriptWriterOutput {
  title: string;
  opening: ScriptBeat;
  beats: ScriptBeat[];
  ending: ScriptBeat;
  cta: ScriptBeat;
  allBeats: ScriptBeat[];
  fullNarration: string;
  estimatedDurationSec: number;
  ctaType: CtaType;
}

export class SeniorScriptWriter {
  /**
   * Generates a complete, publication-ready script from high-level creative inputs
   */
  public static writeScript(options: {
    brief: ContentBrief;
    knowledge: KnowledgeBrief;
    strategy: AudienceStrategy;
    selectedAngle: CreativeAngleCandidate;
    selectedHook: HookCandidate;
    verifiedFacts: VerifiedFact[];
    customBudget?: DurationBudget;
  }): ScriptWriterOutput {
    const { brief, knowledge, strategy, selectedAngle, selectedHook, verifiedFacts, customBudget } = options;

    const mainEntity = brief.primaryEntities[0] || brief.topic;
    const cleanTopic = AntiResearchLeak.sanitize(brief.topic);
    const budget = customBudget || ScriptDurationOptimizer.getBudget(brief.targetDuration);

    const beats: ScriptBeat[] = [];
    const secPerBeat = Math.max(7, Math.round(budget.targetDurationSec / budget.targetBeatCount));

    // 1. BEAT 1: OPENING HOOK (0 - 3/5s)
    const openingBeat: ScriptBeat = {
      beatId: 1,
      purpose: 'opening_hook',
      viewerQuestion: `Tại sao ${mainEntity} lại quan trọng vào lúc này?`,
      newInformation: selectedHook.hookText,
      whyItMatters: 'Thu hút sự chú ý ngay lập tức và đưa ra lý do người xem phải dừng ngón tay lướt.',
      retentionFunction: 'Tạo khoảng cách tò mò (curiosity gap) và khẳng định rõ chủ đề ngay 3 giây đầu.',
      factIds: [],
      narration: selectedHook.hookText,
      expectedEntities: [mainEntity],
      targetDurationSec: secPerBeat,
      displayCopy: {
        headline: selectedHook.screenHeadline,
        supportingText: 'Khám phá sự thật đắt giá',
      },
      visualPromptSuggestion: selectedHook.visualIdea,
    };
    beats.push(openingBeat);

    // 2. MIDDLE BEATS: SETUP & VALUE PROGRESSION
    const middleBeatCount = Math.max(1, budget.targetBeatCount - 3); // excluding opening, ending, cta
    const factsPool = [...verifiedFacts];

    for (let i = 0; i < middleBeatCount; i++) {
      const beatIdx = i + 2;
      const fact = factsPool[i % factsPool.length];
      const cleanClaim = fact ? AntiResearchLeak.sanitize(fact.claim) : '';

      let narration = '';
      let headline = '';
      let purpose: ScriptBeat['purpose'] = 'body_progression';
      let whyItMatters = '';
      let viewerQuestion = '';
      let visualIdea = '';

      if (i === 0) {
        // Setup / Bối cảnh khởi đầu
        purpose = 'setup';
        viewerQuestion = `${mainEntity} có nguồn gốc hoặc vị thế thế nào?`;
        narration = cleanClaim && cleanClaim.length > 30
          ? `${cleanClaim}`
          : `Khi nhìn vào ${mainEntity}, điểm khiến giới chuyên môn chú ý trước hết là nền tảng thiết kế vượt trội và tính thực tiễn cao.`;
        headline = 'NỀN TẢNG ĐẶC BIỆT';
        whyItMatters = 'Cung cấp cơ sở vững chắc làm đòn bẩy cho điểm bứt phá tiếp theo.';
        visualIdea = `Góc máy trung cảnh chuyên nghiệp làm nổi bật diện mạo và định vị của ${mainEntity}`;
      } else if (i === 1) {
        // Core Breakthrough / Đột phá cốt lõi
        purpose = 'body_progression';
        viewerQuestion = `Điểm đột phá nhất về thông số hoặc giá trị là gì?`;
        narration = cleanClaim && cleanClaim.length > 30
          ? `Mấu chốt nằm ở chỗ, ${cleanClaim.replace(/^[A-ZĐ]/, (c) => c.toLowerCase())}`
          : `Yếu tố cốt lõi thay đổi cuộc chơi chính là khả năng tối ưu hóa hiệu năng, mang lại trải nghiệm hoàn toàn khác biệt.`;
        headline = 'ĐỘT PHÁ CỐT LÕI';
        whyItMatters = 'Cung cấp thông tin giá trị mới, trả lời câu hỏi cốt lõi của người xem.';
        visualIdea = `Góc quay cận cảnh chi tiết kỹ thuật hoặc công trình thực tế với chuyển động lướt mượt mà`;
      } else {
        // Evidence / Re-hook / Bằng chứng xác thực
        purpose = 'rehook_reveal';
        viewerQuestion = `Bằng chứng thực tế nào chứng minh điều đó?`;
        narration = cleanClaim && cleanClaim.length > 30
          ? `Minh chứng rõ nhất là ${cleanClaim.replace(/^[A-ZĐ]/, (c) => c.toLowerCase())}`
          : `Các kiểm nghiệm thực tế đã chứng minh đây không chỉ là lời hứa, mà là năng lực đã được định lượng rõ ràng.`;
        headline = 'CHỨNG CỨ XÁC THỰC';
        whyItMatters = 'Củng cố niềm tin tuyệt đối bằng dữ liệu kiểm chứng.';
        visualIdea = `Thẻ đồ họa trực quan hiển thị thông số hoặc bản đồ dữ liệu thực tế`;
      }

      beats.push({
        beatId: beatIdx,
        purpose,
        viewerQuestion,
        newInformation: narration,
        whyItMatters,
        retentionFunction: 'Đẩy tiến trình câu chuyện tiến về phía trước, giữ người xem theo dõi diễn biến.',
        factIds: fact ? [fact.id] : [],
        narration,
        expectedEntities: [mainEntity],
        targetDurationSec: secPerBeat,
        displayCopy: {
          headline,
          supportingText: fact?.isSensitiveNumber ? 'Số liệu kiểm chứng' : undefined,
          metricBadge: fact?.isSensitiveNumber ? knowledge.usefulNumbers[i] : undefined,
        },
        visualPromptSuggestion: visualIdea,
      });
    }

    // 3. ENDING PAYOFF (Trả lại lời hứa cho người xem)
    const endingBeatId = beats.length + 1;
    const endingNarration = `Tựu trung lại, ${mainEntity} đã chứng minh một điều rõ ràng: khi giá trị thực tế gặp đúng thời điểm, sự bứt phá là điều tất yếu.`;
    const endingBeat: ScriptBeat = {
      beatId: endingBeatId,
      purpose: 'ending',
      viewerQuestion: `Bài học hoặc kết luận lớn nhất đọng lại là gì?`,
      newInformation: strategy.mainTakeaway,
      whyItMatters: 'Hoàn tất trọn vẹn lời hứa ban đầu (viewerPromise) và thỏa mãn sự tò mò của người xem.',
      retentionFunction: 'Để lại dư âm sâu sắc, khuyến khích suy ngẫm và kết nối thương hiệu.',
      factIds: [],
      narration: endingNarration,
      expectedEntities: [mainEntity],
      targetDurationSec: secPerBeat,
      displayCopy: {
        headline: 'GIÁ TRỊ CHIẾN LƯỢC',
        supportingText: 'Đột phá tương lai',
      },
      visualPromptSuggestion: `Góc máy góc rộng điện ảnh toàn cảnh của ${mainEntity} với ánh sáng hoàng hôn sang trọng`,
    };
    beats.push(endingBeat);

    // 4. NATURAL CALL TO ACTION
    let ctaType: CtaType = 'COMMENT';
    let ctaNarration = '';
    let ctaHeadline = 'Ý KIẾN CỦA BẠN';

    switch (brief.contentType) {
      case 'REAL_PRODUCT':
        ctaType = 'COMMENT';
        ctaNarration = `Bạn đánh giá thế nào về mức giá và khả năng vận hành của ${mainEntity}? Hãy chia sẻ cảm nghĩ ở phần bình luận nhé!`;
        ctaHeadline = 'BẠN NGHĨ THẾ NÀO?';
        break;

      case 'TRAVEL':
      case 'REAL_LOCATION':
        ctaType = 'SAVE';
        ctaNarration = `Hãy lưu ngay video này vào cẩm nang du lịch và chia sẻ cho người bạn muốn đồng hành đến ${cleanTopic}!`;
        ctaHeadline = 'LƯU & CHIA SẺ NGAY';
        break;

      case 'FINANCE':
      case 'BUSINESS':
      case 'TECH':
        ctaType = 'FOLLOW';
        ctaNarration = `Bấm theo dõi kênh để cập nhật những phân tích sắc bén và xu hướng thị trường mới nhất mỗi ngày!`;
        ctaHeadline = 'THEO DÕI KÊNH';
        break;

      default:
        ctaType = 'COMMENT';
        ctaNarration = `Theo bạn, điều gì ở ${mainEntity} để lại ấn tượng mạnh nhất? Để lại bình luận bên dưới nhé!`;
        ctaHeadline = 'BÌNH LUẬN NGAY';
        break;
    }

    const ctaBeat: ScriptBeat = {
      beatId: beats.length + 1,
      purpose: 'cta',
      viewerQuestion: 'Người xem nên hành động gì tiếp theo?',
      newInformation: ctaNarration,
      whyItMatters: 'Thúc đẩy tương tác tự nhiên mà không phá vỡ cảm xúc của cái kết.',
      retentionFunction: 'Tối ưu hóa thuật toán tương tác mạng xã hội.',
      factIds: [],
      narration: ctaNarration,
      expectedEntities: [mainEntity],
      targetDurationSec: 6,
      displayCopy: {
        headline: ctaHeadline,
        supportingText: 'Thảo luận cùng cộng đồng',
      },
      visualPromptSuggestion: 'Màn hình kết thúc tối giản với các biểu tượng tương tác chuẩn mobile safe area',
    };
    beats.push(ctaBeat);

    // Re-index all beats cleanly
    beats.forEach((b, idx) => (b.beatId = idx + 1));

    const middleBeats = beats.filter((b) => b.purpose !== 'opening_hook' && b.purpose !== 'ending' && b.purpose !== 'cta');
    const fullNarration = beats.map((b) => b.narration).join(' ');
    const totalWords = fullNarration.split(/\s+/).filter(Boolean).length;
    const estimatedDurationSec = parseFloat((totalWords / ScriptDurationOptimizer.SPEAKING_RATE_WPS).toFixed(1));

    return {
      title: `${mainEntity}: ${selectedHook.screenHeadline}`,
      opening: openingBeat,
      beats: middleBeats,
      ending: endingBeat,
      cta: ctaBeat,
      allBeats: beats,
      fullNarration,
      estimatedDurationSec,
      ctaType,
    };
  }
}
