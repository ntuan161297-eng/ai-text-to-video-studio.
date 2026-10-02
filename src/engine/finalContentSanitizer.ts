/**
 * FinalContentSanitizer (Section A)
 * Enforces strict boundary between internal research metadata and final display text.
 * Blocks or cleans any leaked research tags, URLs, confidence scores, or citations.
 */

export interface SanitizationResult {
  passed: boolean;
  violations: string[];
  cleanText: string;
}

export class FinalContentSanitizer {
  private static readonly FORBIDDEN_PATTERNS = [
    /\[\s*(?:fact|source|verified|sự\s*thật|nguồn|kiểm\s*chứng|dữ\s*liệu)[^\]]*\]/gi,
    /\[.*?\]/g, // Any residual markdown bracket tags
    /https?:\/\/[^\s]+/gi,
    /wikipedia(?:\s*tiếng\s*việt)?(?:\s*\(\d+%\))?/gi,
    /\b(?:confidence|evidence|relevance|tier\d+|authoritative)\b/gi,
    /\(\s*\d+%\s*\)/g, // Percentage in parens like (95%)
    /(?:nguồn|theo)\s*:\s*[^\n,.]+/gi, // Source citations like "Nguồn: VnExpress"
  ];

  /**
   * Sanitizes a single display text string, removing forbidden research metadata
   */
  public static sanitizeString(input: string): string {
    if (!input) return '';
    let clean = input;

    for (const pattern of this.FORBIDDEN_PATTERNS) {
      clean = clean.replace(pattern, ' ');
    }

    // Clean up multiple spaces, dangling punctuation
    clean = clean.replace(/\s+/g, ' ').trim();
    clean = clean.replace(/^[:\-–—.,\s]+|[:\-–—.,\s]+$/g, '');

    return clean;
  }

  /**
   * Audits a display text to check if any forbidden metadata leaked
   */
  public static audit(text: string, fieldName = 'text'): SanitizationResult {
    const violations: string[] = [];
    if (!text) return { passed: true, violations: [], cleanText: '' };

    for (const pattern of this.FORBIDDEN_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        violations.push(`Phát hiện research metadata trong '${fieldName}': "${match.join(', ')}"`);
      }
    }

    const cleanText = this.sanitizeString(text);

    return {
      passed: violations.length === 0,
      violations,
      cleanText,
    };
  }

  /**
   * Deeply sanitizes all scene display fields before rendering
   */
  public static sanitizeScene(scene: {
    tag: string;
    title: string;
    subtitle?: string;
    metric?: string;
    highlightText?: string;
    voiceOver: string;
    caption?: string;
  }): {
    tag: string;
    title: string;
    subtitle?: string;
    metric?: string;
    highlightText?: string;
    voiceOver: string;
    caption?: string;
  } {
    return {
      tag: this.sanitizeString(scene.tag),
      title: this.sanitizeString(scene.title),
      subtitle: scene.subtitle ? this.sanitizeString(scene.subtitle) : '',
      metric: scene.metric ? this.sanitizeString(scene.metric) : undefined,
      highlightText: scene.highlightText ? this.sanitizeString(scene.highlightText) : '',
      voiceOver: this.sanitizeString(scene.voiceOver),
      caption: scene.caption ? this.sanitizeString(scene.caption) : '',
    };
  }
}
