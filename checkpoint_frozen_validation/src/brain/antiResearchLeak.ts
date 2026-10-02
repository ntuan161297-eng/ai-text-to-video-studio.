/**
 * PART 20 — ANTI-RESEARCH-LEAK ENGINE
 * Strictly blocks and purges any internal research tags, confidence scores,
 * evidence citations, or crawler artifacts from entering final narration or screen text.
 */

export interface LeakAuditResult {
  passed: boolean;
  violations: string[];
  cleanText: string;
}

export class AntiResearchLeak {
  // Regex patterns that represent internal research metadata
  private static readonly LEAK_PATTERNS = [
    /\[\s*(?:fact|source|verified|sự\s*thật|nguồn|kiểm\s*chứng|dữ\s*liệu)[^\]]*\]/gi,
    /\[\s*#?\d+[^\]]*\]/g, // E.g. [Fact #1] or [#1]
    /\[.*?\]/g,            // Any residual markdown brackets
    /https?:\/\/[^\s]+/gi, // Raw URLs
    /wikipedia(?:\s*tiếng\s*việt)?(?:\s*\(\d+%\))?/gi,
    /\b(?:confidence|evidence|relevance|tier\d+|authoritative|unsupported)\b/gi,
    /\(\s*\d+%\s*\)/g,    // Percentage badges like (95%)
    /(?:nguồn|theo nguồn|theo)\s*:\s*[^\n,.]+/gi, // Source citations like "Nguồn: VnExpress"
    /\[VERIFIED\]/gi,
    /\[UNSUPPORTED\]/gi,
  ];

  /**
   * Sanitizes a string, removing all research leak tokens and normalizing whitespace
   */
  public static sanitize(input: string): string {
    if (!input) return '';
    let clean = input;

    for (const pattern of this.LEAK_PATTERNS) {
      clean = clean.replace(pattern, ' ');
    }

    clean = clean.replace(/\s+/g, ' ').trim();
    clean = clean.replace(/^[:\-–—.,\s]+|[:\-–—.,\s]+$/g, '');

    return clean;
  }

  /**
   * Audits a text string for research metadata leakage
   */
  public static audit(text: string, contextLabel = 'text'): LeakAuditResult {
    const violations: string[] = [];
    if (!text) return { passed: true, violations: [], cleanText: '' };

    for (const pattern of this.LEAK_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        violations.push(`Phát hiện research leak trong '${contextLabel}': "${matches.join(', ')}"`);
      }
    }

    const cleanText = this.sanitize(text);

    return {
      passed: violations.length === 0,
      violations,
      cleanText,
    };
  }
}
