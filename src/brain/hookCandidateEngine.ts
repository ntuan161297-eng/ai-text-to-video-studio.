/**
 * PART 10 — HOOK ENGINE
 * Generates at least 5 candidate hooks using distinct psychological mechanisms:
 *   specific_fact, question, consequence, contradiction, comparison, reveal, problem, visual_hook, direct_value.
 * Strictly bans generic clichés ("Bạn có biết...", "Trong video hôm nay...", "Hãy cùng tìm hiểu...").
 * Ensures instant subject clarity in 0-3 seconds and aligns with payoff.
 */

import {
  ContentBrief,
  CreativeAngleCandidate,
  HookCandidate,
  KnowledgeBrief,
} from '../types/contentBrain.js';
import { AntiResearchLeak } from './antiResearchLeak.js';

export class HookCandidateEngine {
  private static readonly FORBIDDEN_CLICHES = [
    /bạn có biết/i,
    /trong video hôm nay/i,
    /hãy cùng tìm hiểu/i,
    /nếu bạn nghĩ/i,
    /đây là điều bạn không thể bỏ qua/i,
    /chào mừng các bạn/i,
    /hôm nay chúng ta sẽ/i,
  ];

  /**
   * Generates at least 5 candidate hooks with diverse psychological mechanisms
   */
  public static generateHooks(
    brief: ContentBrief,
    knowledge: KnowledgeBrief,
    selectedAngle: CreativeAngleCandidate
  ): { allHooks: HookCandidate[]; selectedHook: HookCandidate } {
    const mainEntity = brief.primaryEntities[0] || brief.topic;
    const cleanTopic = AntiResearchLeak.sanitize(brief.topic);
    const keyStat = knowledge.usefulNumbers[0] || '';
    const factHint = knowledge.surprisingFacts[0] || knowledge.importantFacts[0] || '';

    const candidates: HookCandidate[] = [];

    // Mechanism 1: SPECIFIC FACT / Con số biết nói
    if (keyStat) {
      candidates.push({
        id: 'hook_stat',
        mechanism: 'specific_fact',
        hookText: `Con số ${keyStat} này của ${mainEntity} đang khiến cả thị trường phải nhìn nhận lại!`,
        screenHeadline: `${mainEntity}: ${keyStat}`.toUpperCase(),
        visualIdea: `Thẻ số liệu kích thước cực lớn ${keyStat} xuất hiện với hiệu ứng số tăng nhanh trên nền đen huyền bí`,
        retentionRationale: 'Đưa ra con số định lượng gây sốc ngay giây đầu tiên, buộc người xem tò mò nguồn gốc.',
        score: 93,
      });
    } else {
      candidates.push({
        id: 'hook_fact',
        mechanism: 'specific_fact',
        hookText: `${mainEntity} vừa tạo nên một bước ngoặt thực sự mà rất ít người để ý kỹ!`,
        screenHeadline: `${mainEntity}: BƯỚC NGOẶT MỚI`.toUpperCase(),
        visualIdea: `Cú máy zoom cận cảnh trực diện vào biểu tượng trung tâm của ${mainEntity}`,
        retentionRationale: 'Tạo cảm giác phát hiện độc quyền (insider insight).',
        score: 88,
      });
    }

    // Mechanism 2: CONTRADICTION / Đập tan ngộ nhận
    candidates.push({
      id: 'hook_contradiction',
      mechanism: 'contradiction',
      hookText: `Đa số đều nghĩ ${mainEntity} chỉ bình thường, cho đến khi tận mắt thấy điều này!`,
      screenHeadline: 'SỰ THẬT BẤT NGỜ'.toUpperCase(),
      visualIdea: `Chuyển cảnh nhanh giữa màn hình mờ nghi vấn sang hình ảnh thực tế sắc nét góc rộng`,
      retentionRationale: 'Tạo khoảng cách nhận thức (curiosity gap) giữa định kiến và thực tế.',
      score: 95,
    });

    // Mechanism 3: DIRECT VALUE PROPOSITION / Lợi ích trực tiếp
    candidates.push({
      id: 'hook_direct_value',
      mechanism: 'direct_value',
      hookText: `Chỉ mất 60 giây, bạn sẽ hiểu trọn vẹn tại sao ${mainEntity} lại được săn đón nhiều đến vậy!`,
      screenHeadline: `${mainEntity}: CÓ GÌ ĐẶC BIỆT?`.toUpperCase(),
      visualIdea: `Toàn cảnh sống động của ${mainEntity} với chuyển động flycam mượt mà từ trên cao`,
      retentionRationale: 'Lời hứa giá trị trực diện, súc tích, người xem biết rõ lý do cần xem tiếp.',
      score: 89,
    });

    // Mechanism 4: REVEAL / Hé lộ bí mật
    candidates.push({
      id: 'hook_reveal',
      mechanism: 'reveal',
      hookText: `Sự thật đằng sau ${mainEntity} sẽ khiến bạn phải thay đổi hoàn toàn suy nghĩ!`,
      screenHeadline: 'BÍ MẬT ĐÃ ĐƯỢC HÉ LỘ'.toUpperCase(),
      visualIdea: `Ánh sáng chuyển động quét qua làm bộc lộ chi tiết ẩn sắc nét của sản phẩm/địa danh`,
      retentionRationale: 'Tạo sự hồi hộp kích thích hormone dopamine giữ chân trong 3 giây vàng.',
      score: 91,
    });

    // Mechanism 5: QUESTION / Câu hỏi nhức nhối
    candidates.push({
      id: 'hook_question',
      mechanism: 'question',
      hookText: `Liệu ${mainEntity} có thực sự xuất sắc như những gì người ta đang đồn thổi?`,
      screenHeadline: `${mainEntity}: SỰ THẬT LÀ GÌ?`.toUpperCase(),
      visualIdea: `Góc máy nghiêng kịch tính 3D tilt vào trung tâm đối tượng`,
      retentionRationale: 'Đặt người xem vào vai trò quan sát viên đi tìm câu trả lời công bằng.',
      score: 92,
    });

    // Filter out any accidental cliché
    const validCandidates = candidates.filter((c) => {
      return !this.FORBIDDEN_CLICHES.some((cliche) => cliche.test(c.hookText));
    });

    // Sort by score
    validCandidates.sort((a, b) => b.score - a.score);

    return {
      allHooks: validCandidates,
      selectedHook: validCandidates[0],
    };
  }
}
