/**
 * REVISION INTENT CLASSIFIER & DEPENDENCY GRAPH (Section 5, 6, 14)
 * Intelligently classifies user feedback without vague guesses:
 *   - Classifies RevisionScope: VISUAL | VOICE | SCRIPT | CAPTION | FULL
 *   - Maps Dependency Graph to execute Copy-On-Write without wasteful re-runs
 *   - Separates diagnostic feedback vs actual revision request vs new video request
 */

import { RevisionScope, FeedbackAnalysisResult } from '../types/jobContext.js';

export class RevisionIntentClassifier {
  /**
   * Analyzes feedback text and determines whether it is feedback-only or revision request,
   * along with the exact revision scope and dependency stages.
   */
  public static analyzeFeedback(feedbackText: string): FeedbackAnalysisResult {
    const text = (feedbackText || '').trim().toLowerCase();

    // 1. Detect if user is asking for a completely NEW video
    const newVideoPatterns = [
      /tạo video mới/i,
      /làm video khác/i,
      /làm một video khác/i,
      /chuyển sang chủ đề/i,
      /video mới về/i,
      /create new video/i,
    ];
    if (newVideoPatterns.some((pattern) => pattern.test(text))) {
      return {
        intent: 'NEW_VIDEO_REQUEST',
        detectedScope: 'FULL',
        issuesIdentified: ['Yêu cầu tạo video mới hoàn toàn cho chủ đề khác'],
        affectedStages: ['ALL'],
        unaffectedStages: [],
        explanation: 'Người dùng yêu cầu tạo video mới, cần khởi động CREATE_NEW với blank state.',
      };
    }

    // 2. Detect Revision Scope
    const visualPatterns = [
      /ảnh/i,
      /hình/i,
      /hình ảnh/i,
      /visual/i,
      /broll/i,
      /giao diện/i,
      /cảnh quay/i,
      /đổi hình/i,
      /sai hình/i,
      /ảnh scene/i,
      /ảnh phân cảnh/i,
      /chụp ảnh/i,
    ];

    const voicePatterns = [
      /voice/i,
      /giọng/i,
      /giọng đọc/i,
      /đọc nhanh/i,
      /đọc chậm/i,
      /phát âm/i,
      /âm thanh/i,
      /ngữ điệu/i,
      /mic/i,
      /audio/i,
      /cụt tiếng/i,
    ];

    const scriptPatterns = [
      /kịch bản/i,
      /script/i,
      /nội dung/i,
      /hook/i,
      /câu mở đầu/i,
      /đoạn kết/i,
      /cta/i,
      /lời thoại/i,
      /thông tin sai/i,
      /sự thật/i,
      /fact/i,
      /viết lại/i,
    ];

    const captionPatterns = [
      /caption/i,
      /phụ đề/i,
      /chữ trên màn hình/i,
      /font/i,
      /phông chữ/i,
      /sai chính tả/i,
      /màu chữ/i,
      /subtitle/i,
      /mật độ chữ/i,
    ];

    const fullRegenPatterns = [
      /làm lại từ đầu/i,
      /làm lại/i,
      /chưa ổn làm lại/i,
      /làm lại hết/i,
      /tạo lại/i,
      /redo/i,
      /full/i,
      /toàn bộ chưa đạt/i,
    ];

    const issues: string[] = [];
    let detectedScope: RevisionScope = 'AUTO';

    if (fullRegenPatterns.some((p) => p.test(text))) {
      detectedScope = 'FULL';
      issues.push('Yêu cầu tái tạo toàn bộ video từ đầu');
    } else {
      // Ignore negated/preserved clauses like "giữ nguyên kịch bản và giọng đọc", "không đổi voice"
      const actionableText = text.replace(
        /(?:giữ nguyên|giữ|không đổi|không thay đổi|không cần sửa|không sửa)[^,.;!?]+/gi,
        ''
      );

      const isVisual = visualPatterns.some((p) => p.test(actionableText));
      const isVoice = voicePatterns.some((p) => p.test(actionableText));
      const isScript = scriptPatterns.some((p) => p.test(actionableText));
      const isCaption = captionPatterns.some((p) => p.test(actionableText));

      const matchCount = [isVisual, isVoice, isScript, isCaption].filter(Boolean).length;

      if (matchCount > 1) {
        if (isScript) {
          detectedScope = 'SCRIPT'; // Script change cascades to visuals & voice
          issues.push('Thay đổi kịch bản ảnh hưởng đến storyboard, audio và render');
        } else {
          detectedScope = 'FULL';
          issues.push('Phát hiện nhiều khía cạnh cần chỉnh sửa đồng thời');
        }
      } else if (isVisual) {
        detectedScope = 'VISUAL';
        issues.push('Góp ý về mặt hình ảnh / tài sản visual của phân cảnh');
      } else if (isVoice) {
        detectedScope = 'VOICE';
        issues.push('Góp ý về tốc độ, ngữ điệu hoặc chất lượng giọng đọc Neural TTS');
      } else if (isScript) {
        detectedScope = 'SCRIPT';
        issues.push('Góp ý về lời bình, hook mở đầu hoặc cấu trúc kịch bản');
      } else if (isCaption) {
        detectedScope = 'CAPTION';
        issues.push('Góp ý về phụ đề, hiển thị text hoặc phông chữ trên màn hình');
      } else {
        detectedScope = 'AUTO';
        issues.push('Góp ý chung cần hệ thống phân tích tự động');
      }
    }

    // 3. Determine if this is an explicit command to render now, or diagnosis/feedback only
    const renderActionPatterns = [
      /hãy sửa và render/i,
      /sửa và render/i,
      /hãy render lại/i,
      /tạo version mới/i,
      /tạo bản mới/i,
      /render lại giúp/i,
      /cập nhật ngay/i,
      /sửa lại ngay/i,
      /xuất bản mới/i,
    ];

    const isExplicitRender = renderActionPatterns.some((p) => p.test(text));
    const intent = isExplicitRender ? 'REVISION_REQUEST' : 'FEEDBACK_ONLY';

    // 4. Compute Dependency Graph
    const dependencyInfo = this.getDependenciesForScope(detectedScope);

    return {
      intent,
      detectedScope,
      issuesIdentified: issues,
      affectedStages: dependencyInfo.affected,
      unaffectedStages: dependencyInfo.unaffected,
      explanation: isExplicitRender
        ? `Lệnh yêu cầu chỉnh sửa và render phiên bản mới cho phạm vi: ${detectedScope}.`
        : `Phản hồi góp ý/chẩn đoán đã được ghi nhận cho phạm vi: ${detectedScope}. Chưa tự ý render cho đến khi người dùng xác nhận.`,
    };
  }

  /**
   * Evaluates the Dependency Graph for a given scope
   */
  public static getDependenciesForScope(scope: RevisionScope): {
    affected: string[];
    unaffected: string[];
  } {
    switch (scope) {
      case 'VISUAL':
        return {
          affected: ['17_asset_candidates', '18_verified_assets', '22_composition', '24_render'],
          unaffected: [
            '01_input',
            '02_content_brief',
            '07_verified_facts',
            '08_knowledge_brief',
            '11_strategy',
            '14_approved_script',
            '19_voice',
            '20_timeline',
            '21_caption',
          ],
        };
      case 'VOICE':
        return {
          affected: ['19_voice', '20_timeline', '21_caption', '24_render'],
          unaffected: [
            '01_input',
            '02_content_brief',
            '07_verified_facts',
            '08_knowledge_brief',
            '11_strategy',
            '14_approved_script',
            '17_asset_candidates',
            '18_verified_assets',
          ],
        };
      case 'CAPTION':
        return {
          affected: ['21_caption', '22_composition', '24_render'],
          unaffected: [
            '01_input',
            '02_content_brief',
            '07_verified_facts',
            '08_knowledge_brief',
            '11_strategy',
            '14_approved_script',
            '17_asset_candidates',
            '18_verified_assets',
            '19_voice',
            '20_timeline',
          ],
        };
      case 'SCRIPT':
        return {
          affected: [
            '12_script_draft',
            '13_script_review',
            '14_approved_script',
            '15_storyboard',
            '16_shotlist',
            '17_asset_candidates',
            '18_verified_assets',
            '19_voice',
            '20_timeline',
            '21_caption',
            '22_composition',
            '24_render',
          ],
          unaffected: ['01_input', '02_content_brief', '07_verified_facts', '08_knowledge_brief', '11_strategy'],
        };
      case 'FULL':
      case 'AUTO':
      default:
        return {
          affected: ['ALL'],
          unaffected: [],
        };
    }
  }
}
