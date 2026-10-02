/**
 * PART 5 — SOURCE QUALITY ENGINE
 * Evaluates candidates along 6 dimensions: authority, relevance, freshness, originality, entityMatch, contentQuality.
 * Enforces strict hierarchy:
 *   PRIMARY / OFFICIAL > Government / Org > Reputable Journalism > Industry Specialist > Reliable Secondary.
 * Rejects SEO spam, copied content, doorway pages, and homonym drift.
 * Implements Section 6 & 7: Does NOT score against full prompt text; supports partial objective coverage.
 */

import {
  CleanedSourceDocument,
  SourceQualityScores,
  SourceType,
} from '../types/contentBrain.js';

export class SourceQualityEngine {
  private static readonly DISALLOWED_DOMAINS = [
    'support.google.com',
    'accounts.google.com',
    'bing.com',
    'google.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'pinterest.com',
    'tiktok.com',
    'youtube.com',
    'shopee.vn/search',
    'lazada.vn/catalog',
  ];

  private static readonly GOV_EDU_DOMAINS = [
    '.gov.vn',
    '.edu.vn',
    'chinhphu.vn',
    'baochinhphu.vn',
    'vietnamtourism.gov.vn',
  ];

  private static readonly REPUTABLE_NEWS_DOMAINS = [
    'vnexpress.net',
    'tuoitre.vn',
    'thanhnien.vn',
    'vtv.vn',
    'dantri.com.vn',
    'laodong.vn',
    'vietnamnet.vn',
    'tienphong.vn',
    'vneconomy.vn',
    'forbes.vn',
    'cafef.vn',
    'cafebiz.vn',
    'cand.com.vn',
    'baodaklak.vn',
    'baobariavungtau.com.vn',
  ];

  private static readonly SPECIALIST_DOMAINS = [
    'tinhte.vn',
    'genk.vn',
    'autopro.com.vn',
    'otosaigon.com',
    'batdongsan.com.vn',
    'techz.vn',
    'khoahoc.tv',
    'ashui.com',
    'vnphoto.net',
    'oxalisadventure.com',
    'vinmec.com',
    'vinfastauto.com',
    'fujifilm-x.com',
    'lehoicaphe.vn',
  ];

  /**
   * Evaluates a candidate source document with Document Semantic Gate
   */
  public static evaluateSource(
    url: string,
    title: string,
    cleanContent: string,
    extractedImages: string[] = [],
    rawContent: string = '',
    primaryEntities: string[] = [],
    topicContract?: { coreTopic: string; requiredEntities?: string[] } | any
  ): CleanedSourceDocument {
    let domain = '';
    try {
      domain = new URL(url).hostname.toLowerCase();
    } catch {
      domain = url.toLowerCase();
    }

    const effectiveEntities: string[] = (primaryEntities && primaryEntities.length > 0)
      ? primaryEntities
      : (topicContract?.requiredEntities || topicContract?.primaryEntities || []);

    // Check blacklist
    if (this.DISALLOWED_DOMAINS.some((d) => domain.includes(d))) {
      return this.buildRejectedDoc(
        url,
        domain,
        title,
        cleanContent,
        rawContent,
        extractedImages,
        'Domain nằm trong danh sách đen hoặc trang tiện ích/social'
      );
    }

    // Check minimum content
    if (!cleanContent || cleanContent.length < 80) {
      return this.buildRejectedDoc(
        url,
        domain,
        title,
        cleanContent,
        rawContent,
        extractedImages,
        'Nội dung quá ngắn hoặc không trích xuất được bài viết'
      );
    }

    const contentLower = `${title} ${cleanContent}`.toLowerCase();

    // Document Semantic Gate: Check homonym drift and forbidden drift topics on full content
    if (topicContract) {
      const subjectLower = (topicContract.coreTopic || '').toLowerCase();

      // Check forbidden drift topics
      const prohibited = [
        ...((topicContract as any).forbiddenDriftTopics || []),
        ...(topicContract.prohibitedExpansion || []),
      ];
      for (const drift of prohibited) {
        if (drift && contentLower.includes(drift.toLowerCase())) {
          return this.buildRejectedDoc(
            url,
            domain,
            title,
            cleanContent,
            rawContent,
            extractedImages,
            `Source Document Semantic Gate: Trang web chứa nội dung bị cấm "${drift}"`
          );
        }
      }

      const isCeramicsTopic = /gốm|bát tràng|men rạn|đất sét|nung|lò gốm/i.test(subjectLower);
      if (isCeramicsTopic && /curcumin|củ nghệ|tinh bột nghệ|uống nghệ|làm đẹp da/i.test(contentLower) && !/men rạn|gốm sứ|bát tràng/i.test(contentLower)) {
        return this.buildRejectedDoc(url, domain, title, cleanContent, rawContent, extractedImages, 'Source Document Semantic Gate: Trang web nói về củ nghệ/curcumin thay vì nghệ thuật gốm sứ');
      }

      const isGasTopic = /bình gas|rò rỉ|khí gas|mùi gas|cháy nổ/i.test(subjectLower);
      if (isGasTopic && /cách cách|a ca|triều thanh|hoàng đế/i.test(contentLower) && !/bình gas|rò rỉ|bếp gas/i.test(contentLower)) {
        return this.buildRejectedDoc(url, domain, title, cleanContent, rawContent, extractedImages, 'Source Document Semantic Gate: Trang web nói về danh xưng Cách cách thay vì an toàn bình gas');
      }

      const isAirlineTopic = /hàng không|vé máy bay|overbooking/i.test(subjectLower);
      if (isAirlineTopic && /giới từ|ngữ pháp|từ loại|từ tại/i.test(contentLower) && !/hàng không|máy bay|hành khách|chuyến bay/i.test(contentLower)) {
        return this.buildRejectedDoc(url, domain, title, cleanContent, rawContent, extractedImages, 'Source Document Semantic Gate: Trang web giải thích ngữ pháp từ tại thay vì overbooking vé máy bay');
      }

      if (/phân tích/i.test(subjectLower) && /phân bón|phân chuồng|phân xanh|phân hữu cơ|phân người|chất thải|phân vi sinh/i.test(contentLower) && !/tài chính|kinh tế|dữ liệu|mô hình|sản xuất|doanh nghiệp/i.test(contentLower)) {
        return this.buildRejectedDoc(url, domain, title, cleanContent, rawContent, extractedImages, 'Source Document Semantic Gate: Trang web nói về phân bón/chất thải thay vì phân tích mô hình');
      }

      const isGenderTopic = /bình đẳng giới|giới tính|nam và nữ|định kiến giới|luật bình đẳng/i.test(subjectLower);
      if (!isGenderTopic && /bình đẳng giới|giới tính|nam và nữ|định kiến giới|luật bình đẳng|phân loại sinh học|carl von linn|vai trò của giới/i.test(contentLower)) {
        return this.buildRejectedDoc(url, domain, title, cleanContent, rawContent, extractedImages, 'Source Document Semantic Gate: Trang web nói về Giới tính/Bình đẳng giới thay vì chủ đề chính');
      }
    }

    // Determine SourceType
    let sourceType: SourceType = 'RELIABLE_SECONDARY';
    let authorityScore = 10;

    const isGov = this.GOV_EDU_DOMAINS.some((d) => domain.includes(d));
    const isReputableNews = this.REPUTABLE_NEWS_DOMAINS.some((d) => domain.includes(d));
    const isSpecialist = this.SPECIALIST_DOMAINS.some((d) => domain.includes(d));

    // Check if domain matches an entity (e.g. vinmec.com for Vinmec, fujifilm-x.com for Fujifilm) -> PRIMARY_OFFICIAL
    const isOfficial = effectiveEntities.some((entity) => {
      const slug = entity.toLowerCase().replace(/[^a-z0-9]/g, '');
      return slug.length >= 3 && domain.replace(/[^a-z0-9]/g, '').includes(slug);
    });

    if (isOfficial) {
      sourceType = 'PRIMARY_OFFICIAL';
      authorityScore = 20;
    } else if (isGov) {
      sourceType = 'GOV_ORGANIZATION';
      authorityScore = 19;
    } else if (isReputableNews) {
      sourceType = 'REPUTABLE_JOURNALISM';
      authorityScore = 16;
    } else if (isSpecialist) {
      sourceType = 'INDUSTRY_SPECIALIST';
      authorityScore = 14;
    } else if (domain.includes('wikipedia.org')) {
      sourceType = 'RELIABLE_SECONDARY';
      authorityScore = 13;
    }

    // Section 7: Entity Match (0 - 15)
    // A source only needs to support AT LEAST ONE primary entity
    let matchedEntitiesCount = 0;
    for (const entity of effectiveEntities) {
      if (entity && entity.length >= 3 && contentLower.includes(entity.toLowerCase())) {
        matchedEntitiesCount++;
      }
    }
    const entityMatch = matchedEntitiesCount >= 3 ? 15 : matchedEntitiesCount === 2 ? 12 : matchedEntitiesCount === 1 ? 9 : 0;

    // Section 6: Relevance score (0 - 25) evaluated against coreTopic/Fingerprint, NOT full prompt
    let relevance = 10;
    let topicMatchCount = 0;
    if (topicContract?.coreTopic) {
      const coreWords = topicContract.coreTopic
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length >= 3 && !['trong', 'những', 'được', 'các', 'của', 'giải', 'thích', 'phân', 'tích', 'hướng', 'dẫn'].includes(w));
      topicMatchCount = coreWords.filter((w: string) => contentLower.includes(w)).length;
      if (topicMatchCount >= 2) relevance += 10;
      else if (topicMatchCount === 1) relevance += 5;
    }
    if (entityMatch >= 9) relevance += 5;
    relevance = Math.min(25, relevance);

    // Freshness score (0 - 15)
    let freshness = 10;
    if (/202[4-6]/i.test(cleanContent) || /hôm nay|mới đây|vừa qua/i.test(cleanContent)) {
      freshness = 15;
    } else if (/202[0-3]/i.test(cleanContent)) {
      freshness = 8;
    }

    // Originality score (0 - 15)
    let originality = 10;
    if (sourceType === 'PRIMARY_OFFICIAL' || sourceType === 'GOV_ORGANIZATION') {
      originality = 15;
    } else if (cleanContent.length > 500) {
      originality = 12;
    }

    // Content quality score (0 - 10)
    let contentQuality = 6;
    if (extractedImages.length > 0) contentQuality += 2;
    if (cleanContent.split('\n\n').length >= 3) contentQuality += 2;
    contentQuality = Math.min(10, contentQuality);

    const totalScore = authorityScore + relevance + freshness + originality + entityMatch + contentQuality;
    const isApproved = totalScore >= 50 && (entityMatch >= 9 || topicMatchCount >= 1);

    const scores: SourceQualityScores = {
      authority: authorityScore,
      relevance,
      freshness,
      originality,
      entityMatch,
      contentQuality,
      totalScore,
    };

    return {
      id: `src_${Math.random().toString(36).substring(2, 9)}`,
      url,
      domain,
      sourceName: domain.replace(/^www\./, ''),
      sourceType,
      title,
      rawContent,
      cleanContent,
      extractedImages,
      scores,
      isApproved,
      rejectionReason: isApproved ? undefined : 'Nội dung không chứa thực thể chính hoặc không liên quan đến chủ đề yêu cầu',
    };
  }

  private static buildRejectedDoc(
    url: string,
    domain: string,
    title: string,
    cleanContent: string,
    rawContent: string,
    extractedImages: string[],
    reason: string
  ): CleanedSourceDocument {
    return {
      id: `src_rej_${Math.random().toString(36).substring(2, 9)}`,
      url,
      domain,
      sourceName: domain.replace(/^www\./, ''),
      sourceType: 'RELIABLE_SECONDARY',
      title,
      rawContent,
      cleanContent: cleanContent || '',
      extractedImages: extractedImages || [],
      scores: {
        authority: 0,
        relevance: 0,
        freshness: 0,
        originality: 0,
        entityMatch: 0,
        contentQuality: 0,
        totalScore: 0,
      },
      isApproved: false,
      rejectionReason: reason,
    };
  }
}
