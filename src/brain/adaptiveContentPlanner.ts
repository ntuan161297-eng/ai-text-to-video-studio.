/**
 * ADAPTIVE CONTENT PLANNER
 * Replaces ContentStrategist, CreativeAngleEngine, and HookCandidateEngine.
 * Designs a dynamic ContentStructurePlan tailored uniquely for each request.
 * Does NOT force viral hooks, rigid story arcs, or default CTAs.
 */

import {
  UserIntentSpec,
  TopicContract,
  KnowledgeBrief,
  ContentStructurePlan,
} from '../types/universalContracts.js';

export class AdaptiveContentPlanner {
  /**
   * Plans the dynamic narrative structure and flow per request
   */
  public static planContent(
    intentSpec: UserIntentSpec,
    topicContract: TopicContract,
    knowledge: KnowledgeBrief
  ): ContentStructurePlan {
    const subject = topicContract.coreTopic;
    const duration = intentSpec.requestedDurationSeconds;

    // 1. Determine Narrative Flow based on Content Mode & User Goal
    let narrativeFlow: ContentStructurePlan['narrativeFlow'] = 'LINEAR';
    let openingStyle: ContentStructurePlan['openingStyle'] = 'DIRECT_STATEMENT';
    let endingStrategy: ContentStructurePlan['endingStrategy'] = 'SUMMARY';
    let structureReason = `Xây dựng mạch trình bày mạch lạc, tập trung truyền đạt giá trị cốt lõi về ${subject}.`;

    if (intentSpec.contentMode === 'NEWS') {
      narrativeFlow = 'INVERTED_PYRAMID'; // Tin tức: Thông tin quan trọng nhất lên đầu
      openingStyle = 'DIRECT_STATEMENT';
      endingStrategy = 'DIRECT_SIGN_OFF';
      structureReason = 'Mô hình tháp ngược giúp truyền đạt sự kiện mới nhất ngay lập tức.';
    } else if (intentSpec.contentMode === 'TUTORIAL') {
      narrativeFlow = 'STEP_BY_STEP';
      openingStyle = 'DIRECT_STATEMENT';
      endingStrategy = 'CONCLUSION';
      structureReason = 'Tiến trình từng bước giúp người xem dễ dàng ghi nhớ và thực hành.';
    } else if (intentSpec.contentMode === 'EXPLAINER') {
      narrativeFlow = 'STEP_BY_STEP';
      openingStyle = 'QUESTION';
      endingStrategy = 'CONCLUSION';
      structureReason = 'Bắt đầu từ câu hỏi gợi mở, sau đó phân tích logic từng tầng nguyên lý.';
    } else if (intentSpec.contentMode === 'PRODUCT_REVIEW') {
      narrativeFlow = 'COMPARATIVE';
      openingStyle = knowledge.meaningfulNumbers.length > 0 ? 'KEY_FACT' : 'DIRECT_STATEMENT';
      endingStrategy = 'SUMMARY';
      structureReason = 'Đối chiếu giữa kỳ vọng, thông số thực tế và đánh giá khách quan.';
    } else if (intentSpec.contentMode === 'TRAVEL_CULTURE') {
      narrativeFlow = 'LINEAR';
      openingStyle = 'SCENE_SETTING';
      endingStrategy = 'SUMMARY';
      structureReason = 'Dẫn dắt cảm xúc người xem qua các nét đẹp cảnh quan và di sản văn hóa.';
    } else if (intentSpec.contentMode === 'DOCUMENTARY') {
      narrativeFlow = 'STORY_DRIVEN';
      openingStyle = 'SCENE_SETTING';
      endingStrategy = 'CONCLUSION';
      structureReason = 'Mạch kể tài liệu lịch sử theo dòng thời gian với chứng cứ xác thực.';
    }

    // 2. Decide if Hook is needed (Only for broad entertainment or if requested, otherwise direct)
    const needHook = intentSpec.userGoal === 'ENTERTAIN' || intentSpec.userGoal === 'PROMOTE';

    // 3. Decide if CTA is needed (Opt-in if requested or short-form social video)
    const userWantsCta = intentSpec.userConstraints.some((c) => /cta|kêu gọi|bình luận|follow|chia sẻ|theo dõi|lưu video/i.test(c));
    const needCta = userWantsCta || intentSpec.userGoal === 'PROMOTE' || intentSpec.targetAspectRatio === '9:16';
    const ctaMessage = needCta
      ? 'Hãy lưu lại video này, để lại bình luận chia sẻ cảm nhận của bạn và ấn theo dõi kênh để đón xem những nội dung tiếp theo nhé!'
      : undefined;

    // 4. Calculate dynamic section count based on duration
    let sectionCount = 3;
    if (duration <= 20) sectionCount = 2;
    else if (duration <= 35) sectionCount = 3;
    else if (duration <= 50) sectionCount = 4;
    else if (duration <= 75) sectionCount = 5;
    else if (duration <= 100) sectionCount = 6;
    else if (duration <= 130) sectionCount = 7;
    else sectionCount = Math.min(10, Math.round(duration / 16));

    const avgSecPerSection = Math.round(duration / sectionCount);
    const sections: ContentStructurePlan['sections'] = [];

    for (let i = 0; i < sectionCount; i++) {
      const isFirst = i === 0;
      const isLast = i === sectionCount - 1;
      let purpose = 'Phát triển luận điểm chính';

      if (isFirst) {
        purpose = needHook ? 'Mở đầu thu hút sự chú ý' : 'Khẳng định chủ đề và luận điểm mở đầu';
      } else if (isLast) {
        purpose = needCta
          ? 'Đúc kết giá trị cốt lõi và kêu gọi người xem lưu video, để lại bình luận và ấn theo dõi kênh'
          : 'Tổng kết thông điệp cốt lõi';
      } else if (i === 1) {
        purpose = 'Cung cấp bối cảnh và dữ kiện nền tảng';
      } else if (i === 2) {
        purpose = 'Phân tích điểm nổi bật hoặc thông số kiểm chứng';
      } else {
        purpose = 'Làm sâu sắc thêm luận cứ với bằng chứng thực tế';
      }

      // Allocate target seconds ensuring the sum matches requested duration
      const targetSec = isLast
        ? duration - (sectionCount - 1) * avgSecPerSection
        : avgSecPerSection;

      sections.push({
        sectionIndex: i + 1,
        purpose,
        contentCore: knowledge.strongestFacts[i % Math.max(1, knowledge.strongestFacts.length)]?.claim || subject,
        targetSeconds: targetSec,
      });
    }

    return {
      structureReason,
      requestedSeconds: duration,
      narrationBudgetWords: Math.round(duration * 2.65),
      intentionalVisualPauseBudgetSeconds: 0,
      narrativeFlow,
      needHook,
      openingStyle,
      needCta,
      ctaMessage,
      sections,
      endingStrategy,
    };
  }
}
