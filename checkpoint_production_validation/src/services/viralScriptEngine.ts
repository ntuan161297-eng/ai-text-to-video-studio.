import { VerifiedFact } from './factLayer.js';

export interface HookOption {
  id: string;
  type: 'curiosity_gap' | 'problem_stakes' | 'contrarian_reveal';
  hookText: string;
  score: number;
  reason: string;
}

export interface StoryboardScene {
  sceneId: number;
  purpose: 'hook' | 'context' | 'key_insight_1' | 'pattern_interrupt' | 'key_insight_2' | 'surprise_contrast' | 'key_insight_3' | 'conclusion_payoff' | 'cta';
  voiceText: string;
  caption: string;
  badgeTag: string;
  headline: string;
  metricBadge: string;
  visualConcept: string;
  visualPrompt: string;
  visualType: 'photo' | 'b-roll' | 'map' | 'chart' | 'statistics' | 'kinetic_typography' | 'icon' | 'ui_mockup' | 'comparison' | 'quote' | 'generated_visual';
  sourceEvidence: string[];
  transition: '3d_flycam' | '3d_tilt' | 'cinematic_zoom' | 'dynamic_whip';
  estimatedDuration: number;
}

export interface ScriptPackage {
  title: string;
  chosenHook: HookOption;
  allHooks: HookOption[];
  scenes: StoryboardScene[];
  totalEstimatedDuration: number;
}

export class ViralScriptEngine {
  /**
   * Sinh 3 Hook độc đáo và chọn Hook có điểm viral / retention cao nhất (Phase 4)
   */
  public static generateHooks(topic: string, facts: VerifiedFact[], category: string): { chosenHook: HookOption; allHooks: HookOption[] } {
    const hooks: HookOption[] = [];

    if (category === 'travel') {
      hooks.push({
        id: 'hook_1',
        type: 'curiosity_gap',
        hookText: `Nếu bạn nghĩ ${topic} chỉ có nắng gió, thì 60 giây sau đây sẽ thay đổi hoàn toàn suy nghĩ của bạn!`,
        score: 95,
        reason: 'Tạo khoảng trống tò mò mạnh, phá bỏ định kiến thường thấy.',
      });
      hooks.push({
        id: 'hook_2',
        type: 'problem_stakes',
        hookText: `Muốn một chuyến đi vừa có biển xanh hoang sơ, vừa có non thiêng mây ngàn mà không đông đúc? Hãy đến ngay ${topic}!`,
        score: 90,
        reason: 'Đánh trúng nhu cầu tìm điểm đến nghỉ dưỡng trong lành, tránh chen chúc.',
      });
      hooks.push({
        id: 'hook_3',
        type: 'contrarian_reveal',
        hookText: `Đây là tọa độ du lịch sở hữu những kỷ lục bất ngờ của miền Trung mà không phải ai cũng biết!`,
        score: 88,
        reason: 'Kích thích khám phá những điều bí ẩn ít người biết.',
      });
    } else if (category === 'vehicle') {
      const priceFact = facts.find((f) => f.category === 'price')?.claim || 'mức giá khởi điểm cực sốc';
      hooks.push({
        id: 'hook_1',
        type: 'curiosity_gap',
        hookText: `Tại sao mẫu xe điện này lại khiến người Việt đổ xô đặt cọc chỉ sau vài giờ mở bán?`,
        score: 96,
        reason: 'Đặt câu hỏi kích thích tâm lý tò mò về hiện tượng sốt hàng.',
      });
      hooks.push({
        id: 'hook_2',
        type: 'problem_stakes',
        hookText: `Chi phí nuôi xe mỗi tháng rẻ hơn cả đi xe máy? Chiếc xe này đang chứng minh điều đó!`,
        score: 92,
        reason: 'So sánh trực quan về tài chính, chạm đúng nỗi lo chi phí của người dùng.',
      });
      hooks.push({
        id: 'hook_3',
        type: 'contrarian_reveal',
        hookText: `Với ${priceFact}, đây có thực sự là mẫu xe điện quốc dân đáng xuống tiền nhất năm nay?`,
        score: 89,
        reason: 'Nêu thẳng con số và kích thích người xem xem hết để có câu trả lời.',
      });
    } else {
      hooks.push({
        id: 'hook_1',
        type: 'curiosity_gap',
        hookText: `Những sự thật chưa từng được tiết lộ về ${topic} mà bạn cần biết ngay bây giờ!`,
        score: 92,
        reason: 'Tạo cảm giác cấp thiết và tò mò cao.',
      });
      hooks.push({
        id: 'hook_2',
        type: 'problem_stakes',
        hookText: `Bạn đã hiểu đúng về ${topic}? Hãy cùng khám phá sự thật ngay trong 60 giây sau đây!`,
        score: 88,
        reason: 'Kích thích phản xạ kiểm chứng thông tin của người xem.',
      });
      hooks.push({
        id: 'hook_3',
        type: 'contrarian_reveal',
        hookText: `Đây là bước ngoặt quan trọng về ${topic} mà giới chuyên môn đang theo dõi sát sao!`,
        score: 87,
        reason: 'Khẳng định tầm quan trọng và tính cập nhật của chủ đề.',
      });
    }

    hooks.sort((a, b) => b.score - a.score);
    return { chosenHook: hooks[0], allHooks: hooks };
  }

  /**
   * Xây dựng Storyboard hoàn chỉnh tuân thủ cấu trúc giữ chân người xem (Phase 4 & Phase 5)
   */
  public static buildStoryboard(
    prompt: string,
    coreTopic: string,
    category: string,
    targetDuration: number,
    facts: VerifiedFact[]
  ): ScriptPackage {
    const { chosenHook, allHooks } = this.generateHooks(coreTopic, facts, category);

    // Xác định số phân cảnh dựa trên thời lượng
    // 60s: 5 phân cảnh (~11-12s/scene, ~28-32 từ/scene)
    // 45s: 4 phân cảnh
    // 30s: 3 phân cảnh
    // 15s: 2 phân cảnh
    const sceneCount = targetDuration <= 20 ? 2 : targetDuration <= 35 ? 3 : targetDuration <= 50 ? 4 : 5;
    const estDurationPerScene = Math.round(targetDuration / sceneCount);

    const scenes: StoryboardScene[] = [];

    // Scene 1: HOOK (0 - 10s)
    scenes.push({
      sceneId: 1,
      purpose: 'hook',
      voiceText: chosenHook.hookText,
      caption: coreTopic.toUpperCase(),
      badgeTag: category === 'travel' ? '🏞️ ĐIỂM ĐẾN NỔI BẬT' : '⚡ TÂM ĐIỂM',
      headline: coreTopic.toUpperCase(),
      metricBadge: 'XEM NGAY',
      visualConcept: `Toàn cảnh góc rộng ngoạn mục sắc nét về ${coreTopic}`,
      visualPrompt: `cinematic wide shot of ${coreTopic}, majestic landscape, vibrant colors, 4k ultra detailed`,
      visualType: 'photo',
      sourceEvidence: [facts[0]?.sourceUrl || ''],
      transition: '3d_flycam',
      estimatedDuration: estDurationPerScene,
    });

    if (sceneCount >= 3) {
      // Scene 2: CONTEXT / KEY INSIGHT 1
      let insight1Voice = '';
      const locationOrFeatureFact = facts.find((f) => f.category === 'location' || f.category === 'specification' || f.category === 'culture');
      if (category === 'travel') {
        insight1Voice = `Nơi đây làm say lòng lữ khách với những bãi biển xanh trong vắt, những ngọn núi thiêng mây ngàn và quần thể danh lam thắng cảnh hữu tình.`;
      } else if (category === 'vehicle') {
        insight1Voice = `Thiết kế vuông vức cá tính, khoảng sáng gầm cao vượt trội và khả năng di chuyển linh hoạt trong mọi ngõ ngách đô thị.`;
      } else {
        insight1Voice = locationOrFeatureFact
          ? locationOrFeatureFact.claim
          : `${coreTopic} mang lại nhiều giá trị thiết thực và thu hút sự quan tâm lớn từ cộng đồng.`;
      }

      scenes.push({
        sceneId: 2,
        purpose: 'key_insight_1',
        voiceText: insight1Voice,
        caption: 'DANH THẮNG TRỨ DANH',
        badgeTag: category === 'travel' ? '🌊 DANH THẮNG' : '🔋 TÍNH NĂNG VƯỢT TRỘI',
        headline: category === 'travel' ? 'BIỂN XANH NON THIÊNG' : 'THIẾT KẾ CÁ TÍNH',
        metricBadge: category === 'travel' ? 'TOP CHECK-IN' : 'TIỆN NGHI CAO CẤP',
        visualConcept: `Góc quay cận cảnh chi tiết làm nổi bật đặc trưng của ${coreTopic}`,
        visualPrompt: `close-up detailed aesthetic photography of ${coreTopic} key sights, crystal clear water, mountain view`,
        visualType: category === 'travel' ? 'b-roll' : 'ui_mockup',
        sourceEvidence: [locationOrFeatureFact?.sourceUrl || ''],
        transition: '3d_tilt',
        estimatedDuration: estDurationPerScene,
      });
    }

    if (sceneCount >= 4) {
      // Scene 3: PATTERN INTERRUPT / KEY INSIGHT 2
      let insight2Voice = '';
      const statOrHistoryFact = facts.find((f) => f.category === 'history' || f.category === 'statistics' || f.category === 'price');
      if (category === 'travel') {
        insight2Voice = `Nhưng không chỉ có thiên nhiên, đây còn là vùng đất địa linh nhân kiệt với bề dày lịch sử, văn hóa ngàn năm và những câu hò ví giặm đằm thắm.`;
      } else if (category === 'vehicle') {
        insight2Voice = `Đặc biệt, quãng đường di chuyển ấn tượng sau mỗi lần sạc cùng chi phí vận hành siêu tiết kiệm giải quyết triệt để bài toán kinh tế hàng ngày.`;
      } else {
        insight2Voice = statOrHistoryFact
          ? statOrHistoryFact.claim
          : `Yếu tố cốt lõi giúp tạo nên sự khác biệt vượt trội chính là độ tin cậy và sự đổi mới không ngừng.`;
      }

      scenes.push({
        sceneId: 3,
        purpose: 'pattern_interrupt',
        voiceText: insight2Voice,
        caption: 'GIÁ TRỊ KHÁC BIỆT',
        badgeTag: category === 'travel' ? '🏛️ DI SẢN LỊCH SỬ' : '💰 CHI PHÍ & TẦM XA',
        headline: category === 'travel' ? 'ĐẤT ĐỊA LINH NHÂN KIỆT' : 'SIÊU TIẾT KIỆM',
        metricBadge: category === 'travel' ? 'DI SẢN QUÝ' : 'CHI PHÍ SIÊU THẤP',
        visualConcept: `Hình ảnh trực quan về văn hóa, di tích hoặc đồ họa số liệu ấn tượng`,
        visualPrompt: `cultural heritage site, historic architecture, golden light, dynamic camera motion`,
        visualType: 'statistics',
        sourceEvidence: [statOrHistoryFact?.sourceUrl || ''],
        transition: 'cinematic_zoom',
        estimatedDuration: estDurationPerScene,
      });
    }

    if (sceneCount >= 5) {
      // Scene 4: SURPRISE / CONTRAST / KEY INSIGHT 3
      let insight3Voice = '';
      const cultureFact = facts.find((f) => f.category === 'culture' || f.category === 'specification');
      if (category === 'travel') {
        insight3Voice = `Đến đây, bạn nhất định phải thưởng thức nền ẩm thực đậm đà với những món đặc sản nức tiếng do đôi bàn tay hào sảng của con người nơi đây tạo nên!`;
      } else if (category === 'vehicle') {
        insight3Voice = `Khoang lái trang bị màn hình giải trí sắc nét, không gian tối ưu cho 4 người ngồi và hệ sinh thái trạm sạc phủ khắp cả nước.`;
      } else {
        insight3Voice = cultureFact
          ? cultureFact.claim
          : `Không dừng lại ở đó, trải nghiệm thực tế còn mang lại sự hài lòng vượt mong đợi cho người dùng.`;
      }

      scenes.push({
        sceneId: 4,
        purpose: 'surprise_contrast',
        voiceText: insight3Voice,
        caption: 'TRẢI NGHIỆM ĐỘC BẢN',
        badgeTag: category === 'travel' ? '🍲 ẨM THỰC ĐẶC SẮC' : '📱 CÔNG NGHỆ THÔNG MINH',
        headline: category === 'travel' ? 'HƯƠNG VỊ ĐẬM ĐÀ' : 'TIỆN ÍCH HIỆN ĐẠI',
        metricBadge: category === 'travel' ? 'MÓN NGON PHẢI THỬ' : 'TRẢI NGHIỆM 5 SAO',
        visualConcept: `Đặc sản thơm ngon sống động hoặc tính năng tiện ích trung tâm`,
        visualPrompt: `mouth-watering authentic cuisine delicacies culinary presentation high contrast`,
        visualType: 'photo',
        sourceEvidence: [cultureFact?.sourceUrl || ''],
        transition: 'dynamic_whip',
        estimatedDuration: estDurationPerScene,
      });
    }

    // Final Scene: CONCLUSION / PAYOFF + CTA
    let ctaVoice = '';
    if (category === 'travel') {
      ctaVoice = `Một vùng đất sơn thủy hữu tình đang chờ đón bạn. Hãy lưu ngay video này, rủ bạn bè cùng lên lịch trình và theo dõi kênh để khám phá thêm nhiều điểm đến nhé!`;
    } else if (category === 'vehicle') {
      ctaVoice = `Với mức giá hấp dẫn và tiện ích vượt trội, bạn có muốn sở hữu mẫu xe này không? Hãy bình luận ý kiến của bạn và theo dõi kênh nhé!`;
    } else {
      ctaVoice = `Bạn nghĩ sao về điều này? Hãy để lại bình luận bên dưới, lưu video và bấm theo dõi kênh để cập nhật những thông tin mới nhất!`;
    }

    scenes.push({
      sceneId: scenes.length + 1,
      purpose: 'cta',
      voiceText: ctaVoice,
      caption: 'BẠN ĐÃ SẴN SÀNG?',
      badgeTag: '🌟 HÃY TRẢI NGHIỆM',
      headline: 'LÊN LỊCH TRÌNH NGAY',
      metricBadge: 'LIKE & SHARE',
      visualConcept: `Cảnh hoàng hôn tuyệt đẹp hoặc logo lời kêu gọi follow kênh`,
      visualPrompt: `stunning golden hour cinematic landscape view, inspiring travel vibe, 4k`,
      visualType: 'kinetic_typography',
      sourceEvidence: [],
      transition: '3d_flycam',
      estimatedDuration: estDurationPerScene,
    });

    // Cập nhật lại ID cho chuẩn tuần tự
    scenes.forEach((s, idx) => (s.sceneId = idx + 1));

    return {
      title: coreTopic.toUpperCase(),
      chosenHook,
      allHooks,
      scenes,
      totalEstimatedDuration: targetDuration,
    };
  }
}
