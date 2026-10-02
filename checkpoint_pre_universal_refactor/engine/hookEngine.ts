import { CreativeBrief } from './creativeDirector.js';
import { VerifiedFact } from '../services/factLayer.js';

export type HookArchetype =
  | 'unexpected_fact'
  | 'contradiction'
  | 'consequence'
  | 'question'
  | 'strong_visual_opening'
  | 'comparison'
  | 'reveal'
  | 'problem'
  | 'curiosity_gap';

export interface HookScoreBreakdown {
  relevance: number;        // /20
  clarity: number;          // /15
  curiosity: number;        // /20
  specificity: number;      // /15
  credibility: number;      // /15
  visualPotential: number;  // /15
  totalScore: number;       // /100
}

export interface CandidateHook {
  id: string;
  archetype: HookArchetype;
  text: string;
  visualIdea: string;
  scoreBreakdown: HookScoreBreakdown;
  selectionRationale: string;
}

export class HookEngine {
  /**
   * Sinh tối thiểu 5 ứng viên Hook đa dạng cấu trúc và chấm điểm chọn ra Hook tối ưu nhất (Section 3)
   */
  public static generateAndSelectHook(
    rawTopic: string,
    brief: CreativeBrief,
    facts: VerifiedFact[]
  ): { selectedHook: CandidateHook; allCandidates: CandidateHook[] } {
    const candidates: CandidateHook[] = [];
    const factSnippet = facts[0]?.claim || '';
    
    // Làm sạch chủ thể
    let coreTopic = rawTopic.trim();
    if (coreTopic.toLowerCase().startsWith('nói về ') || coreTopic.toLowerCase().includes('bạn chưa biết')) {
      coreTopic = coreTopic
        .replace(/^(?:hãy\s+)?(?:nói|kể|chia sẻ)\s+về\s+/i, '')
        .replace(/^(?:những\s+)?(?:điều|sự thật|bí mật)\s+(?:có thể\s+)?(?:bạn\s+)?(?:chưa biết\s+)?về\s+/i, '')
        .replace(/\s*(?:mà rất ít người để ý|mà bạn chưa biết)\s*$/i, '')
        .trim();
    }

    // 1. Archetype: Unexpected Fact / Insight
    let unexpFactText = '';
    if (factSnippet && factSnippet.length > 20 && !factSnippet.includes('...')) {
      const cleanSnippet = factSnippet.replace(/^[0-9.-]+\s*/, '').trim();
      unexpFactText = `Bạn có biết: ${cleanSnippet}`;
    } else {
      unexpFactText = `Có một sự thật đặc biệt về ${coreTopic} mà rất ít người để ý đến.`;
    }

    candidates.push({
      id: 'hook_unexpected_fact',
      archetype: 'unexpected_fact',
      text: unexpFactText,
      visualIdea: `Cận cảnh chi tiết đắt giá nhất của ${coreTopic} xuất hiện với ánh sáng tương phản cao`,
      scoreBreakdown: this.scoreHook(unexpFactText, coreTopic, facts, 19, 15, 19, 14, 15, 15),
      selectionRationale: 'Dẫn dắt trực diện bằng thông tin thực tế cuốn hút, kích thích tò mò ngay giây đầu.',
    });

    // 2. Archetype: Question
    const questionText = `Điều gì đã khiến ${coreTopic} trở thành cái tên thu hút sự chú ý đặc biệt hiện nay?`;
    candidates.push({
      id: 'hook_question',
      archetype: 'question',
      text: questionText,
      visualIdea: `Toàn cảnh góc quay rộng mở đầu với camera pan mạnh tạo cảm giác choáng ngợp`,
      scoreBreakdown: this.scoreHook(questionText, coreTopic, facts, 19, 15, 18, 13, 14, 14),
      selectionRationale: 'Đặt câu hỏi kích hoạt sự chú ý ngay từ giây đầu tiên, nhịp điệu tự nhiên.',
    });

    // 3. Archetype: Curiosity Gap
    const curiosityText = `Những điểm đắt giá nhất về ${coreTopic} mà không phải ai cũng biết!`;
    candidates.push({
      id: 'hook_curiosity_gap',
      archetype: 'curiosity_gap',
      text: curiosityText,
      visualIdea: `Hình ảnh thực thể với ánh sáng tương phản cao và hiệu ứng phóng to cinematic zoom`,
      scoreBreakdown: this.scoreHook(curiosityText, coreTopic, facts, 19, 14, 19, 13, 13, 14),
      selectionRationale: 'Tạo khoảng trống thông tin cuốn hút, hứa hẹn giá trị rõ ràng cho người xem.',
    });

    // 4. Archetype: Comparison / Contrast
    const comparisonText = `Khác xa với những suy nghĩ thông thường, thực tế về ${coreTopic} sẽ khiến bạn bất ngờ.`;
    candidates.push({
      id: 'hook_comparison',
      archetype: 'comparison',
      text: comparisonText,
      visualIdea: `Chia đôi màn hình (split-screen) đối chiếu hai khía cạnh đối lập`,
      scoreBreakdown: this.scoreHook(comparisonText, coreTopic, facts, 18, 14, 17, 13, 14, 15),
      selectionRationale: 'Cấu trúc so sánh giúp khán giả dễ hình dung và kích thích phản biện.',
    });

    // 5. Archetype: Reveal / Strong Visual Opening
    const revealText = `Toàn bộ những chi tiết đặc biệt và chân thực nhất của ${coreTopic} được hé lộ ngay sau đây.`;
    candidates.push({
      id: 'hook_reveal',
      archetype: 'reveal',
      text: revealText,
      visualIdea: `Góc máy flycam từ trên cao lướt nhanh vào tâm điểm của thực thể`,
      scoreBreakdown: this.scoreHook(revealText, coreTopic, facts, 19, 14, 15, 13, 15, 15),
      selectionRationale: 'Mở màn đĩnh đạc, phù hợp với các chủ đề mang tính uy tín, trang trọng hoặc du lịch.',
    });

    // Chấm điểm và sắp xếp theo tổng điểm giảm dần
    candidates.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);
    const selectedHook = candidates[0];

    return {
      selectedHook,
      allCandidates: candidates,
    };
  }

  /**
   * HookScorer đánh giá 6 khía cạnh chuẩn mực
   */
  private static scoreHook(
    text: string,
    coreTopic: string,
    facts: VerifiedFact[],
    rel: number,
    cla: number,
    cur: number,
    spe: number,
    cre: number,
    vis: number
  ): HookScoreBreakdown {
    // Điều chỉnh điểm nếu có từ khoá rác hoặc quá dài/ngắn
    let relevance = rel;
    let clarity = cla;
    let curiosity = cur;
    let specificity = spe;
    let credibility = cre;
    let visualPotential = vis;

    const words = text.split(/\s+/).length;
    if (words > 25) clarity -= 2;
    if (words < 8) specificity -= 2;

    // Không dùng mẫu sáo rỗng
    if (/bạn có biết/i.test(text) || /trong video hôm nay/i.test(text)) {
      curiosity -= 4;
      credibility -= 2;
    }

    const totalScore = relevance + clarity + curiosity + specificity + credibility + visualPotential;

    return {
      relevance,
      clarity,
      curiosity,
      specificity,
      credibility,
      visualPotential,
      totalScore,
    };
  }
}
