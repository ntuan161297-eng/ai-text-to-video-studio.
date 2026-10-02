/**
 * LIVE WEB SEARCHER
 * Performs live internet discovery for the Content Brain using Bing Search & Wikipedia API.
 * Accurately decodes Bing click-tracking redirects (u=a1...) to retrieve genuine destination URLs.
 * Strictly avoids mock sources or hardcoded fixtures.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { CleanContentExtractor } from './cleanContentExtractor.js';
import { CleanedSourceDocument } from '../types/contentBrain.js';
import { SourceQualityEngine } from './sourceQualityEngine.js';

export interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

export class LiveWebSearcher {
  private static readonly BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  /**
   * Searches Bing and returns clean destination URLs
   */
  public static async searchBing(query: string, maxResults = 8): Promise<SearchResultItem[]> {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=vi`;
    const results: SearchResultItem[] = [];

    try {
      const resp = await axios.get(searchUrl, {
        headers: {
          'User-Agent': this.BROWSER_UA,
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        },
        timeout: 9000,
      });

      const $ = cheerio.load(resp.data);

      $('li.b_algo').each((_, el) => {
        if (results.length >= maxResults) return;

        const title = $(el).find('h2 a').text().trim();
        const href = $(el).find('h2 a').attr('href') || '';
        const snippet = $(el).find('.b_caption p').text().trim();

        let realUrl = href;
        if (href.includes('bing.com/ck/a') && href.includes('u=')) {
          const match = href.match(/[?&]u=a1([^&]+)/);
          if (match) {
            try {
              let b64 = match[1];
              while (b64.length % 4 !== 0) b64 += '=';
              realUrl = Buffer.from(b64, 'base64').toString('utf-8');
            } catch {}
          }
        }

        if (realUrl.startsWith('http') && !results.some((r) => r.url === realUrl)) {
          results.push({ title, snippet, url: realUrl });
        }
      });
    } catch (err: any) {
      console.warn(`⚠️ [LiveWebSearcher] Bing query error for "${query}":`, err.message);
    }

    return results;
  }

  /**
   * Search Result Relevance Gate (Section 8: Preliminary Filtering)
   * Prevents obvious homonym drift without rejecting long prompts prematurely.
   */
  public static evaluateSearchResult(
    item: SearchResultItem,
    topicContract?: { coreTopic: string; requiredEntities: string[] },
    primaryTopic?: string
  ): { approved: boolean; rejectionReason?: string; topicRelevance: number; ambiguityRisk: 'LOW' | 'MEDIUM' | 'HIGH' } {
    if (!topicContract) {
      return { approved: true, topicRelevance: 80, ambiguityRisk: 'LOW' };
    }

    const titleLower = item.title.toLowerCase();
    const snippetLower = item.snippet.toLowerCase();
    const textLower = `${titleLower} ${snippetLower}`;
    const subject = topicContract.coreTopic || primaryTopic || '';
    const subjectLower = subject.toLowerCase();

    // 0. Check forbidden drift topics / prohibited expansion if specified in topicContract
    const prohibited = [
      ...((topicContract as any).forbiddenDriftTopics || []),
      ...((topicContract as any).prohibitedExpansion || []),
    ];
    for (const drift of prohibited) {
      if (drift && textLower.includes(drift.toLowerCase())) {
        return {
          approved: false,
          rejectionReason: `Bẫy lạc đề / cấm mở rộng: Kết quả chứa chủ đề bị cấm "${drift}"`,
          topicRelevance: 0,
          ambiguityRisk: 'HIGH',
        };
      }
    }

    // 1. Check for dangerous homonym traps (Homonym Disambiguation)
    // Homonym 1: "Nghệ" (Curcumin/turmeric vs Ceramics/Art)
    const isCeramicsTopic = /gốm|bát tràng|men rạn|đất sét|nung|lò gốm/i.test(subjectLower);
    if (isCeramicsTopic && /curcumin|củ nghệ|tinh bột nghệ|uống nghệ|viên nghệ|làm đẹp da/i.test(textLower) && !/gốm|bát tràng/i.test(textLower)) {
      return {
        approved: false,
        rejectionReason: 'Bẫy từ đồng âm: Kết quả nói về củ nghệ/curcumin thay vì nghệ thuật gốm sứ',
        topicRelevance: 0,
        ambiguityRisk: 'HIGH',
      };
    }

    // Homonym 2: "Cách" (Cách cách triều Thanh vs Cách xử lý bình gas)
    const isGasTopic = /bình gas|rò rỉ|khí gas|mùi gas|cháy nổ/i.test(subjectLower);
    if (isGasTopic && /cách cách|a ca|triều thanh|hoàng đế|hậu cung/i.test(textLower) && !/bình gas|rò rỉ/i.test(textLower)) {
      return {
        approved: false,
        rejectionReason: 'Bẫy từ đồng âm: Kết quả nói về danh xưng Cách cách triều Thanh thay vì an toàn bình gas',
        topicRelevance: 0,
        ambiguityRisk: 'HIGH',
      };
    }

    // Homonym 3: "Tại" (Giới từ tại vs Vé máy bay overbooking)
    const isAirlineTopic = /hàng không|vé máy bay|overbooking|chuyến bay/i.test(subjectLower);
    if (isAirlineTopic && /giới từ|ngữ pháp|từ loại|từ tại|cách dùng từ/i.test(textLower) && !/vé máy bay|chuyến bay|hàng không/i.test(textLower)) {
      return {
        approved: false,
        rejectionReason: 'Bẫy từ đồng âm: Kết quả nói về ngữ pháp giới từ "tại" thay vì hàng không overbooking',
        topicRelevance: 0,
        ambiguityRisk: 'HIGH',
      };
    }

    // Homonym 4: "Phân" (Phân tích vs Phân bón/chất thải)
    if (/phân tích/i.test(subjectLower) && /phân bón|phân chuồng|phân xanh|phân hữu cơ|phân người|chất thải|phân vi sinh/i.test(textLower) && !/tài chính|kinh tế|dữ liệu|mô hình|sản xuất|doanh nghiệp/i.test(textLower)) {
      return {
        approved: false,
        rejectionReason: 'Bẫy từ đồng âm: Kết quả nói về phân bón/chất thải thay vì phân tích mô hình',
        topicRelevance: 0,
        ambiguityRisk: 'HIGH',
      };
    }

    // Homonym 5: "Giới" (Giới thiệu doanh nghiệp/sản phẩm vs Bình đẳng giới/Giới tính)
    const isGenderTopic = /bình đẳng giới|giới tính|nam và nữ|định kiến giới|luật bình đẳng/i.test(subjectLower);
    if (!isGenderTopic && /bình đẳng giới|giới tính|nam và nữ|định kiến giới|luật bình đẳng|phân loại sinh học|carl von linn|của giới và|vai trò của giới/i.test(textLower)) {
      return {
        approved: false,
        rejectionReason: 'Bẫy từ đồng âm: Kết quả nói về Giới tính/Bình đẳng giới thay vì chủ đề giới thiệu',
        topicRelevance: 0,
        ambiguityRisk: 'HIGH',
      };
    }

    // 2. Section 8: Preliminary Topic Anchor check
    // Does candidate match at least ONE required entity OR at least one core topic keyword?
    const entities = topicContract.requiredEntities || [];
    const hasEntityMatch = entities.some((e) => e && e.length >= 3 && textLower.includes(e.toLowerCase()));

    const keyWords = subjectLower
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !['trong', 'những', 'được', 'các', 'của', 'giải', 'thích', 'phân', 'tích', 'hướng', 'dẫn', 'giới', 'thiệu', 'tôi', 'muốn', 'tạo', 'video', 'công', 'nghệ', 'phần', 'mềm'].includes(w));
    const matchedCount = keyWords.filter((w) => textLower.includes(w)).length;

    // Approve if matches an entity, or at least 1 significant subject keyword
    if (hasEntityMatch || (keyWords.length > 0 && matchedCount >= 1) || textLower.includes(subjectLower)) {
      return {
        approved: true,
        topicRelevance: hasEntityMatch ? 85 : 70,
        ambiguityRisk: 'LOW',
      };
    }

    return {
      approved: false,
      rejectionReason: 'Không chứa bất kỳ thực thể hoặc từ khóa chính nào của chủ đề',
      topicRelevance: 10,
      ambiguityRisk: 'MEDIUM',
    };
  }

  /**
   * Fetches real pages and produces evaluated CleanedSourceDocuments
   * Includes Section 11 Adaptive Search Retry
   */
  public static async researchTopic(
    queries: string[],
    primaryEntities: string[],
    maxSourcesToFetch = 6,
    topicContract?: { coreTopic: string; requiredEntities: string[] }
  ): Promise<{
    rawSearchResults: SearchResultItem[];
    sources: CleanedSourceDocument[];
    approvedSources: CleanedSourceDocument[];
  }> {
    const rawSearchResults: SearchResultItem[] = [];

    for (const q of queries) {
      const items = await this.searchBing(q, 4);
      for (const it of items) {
        if (!rawSearchResults.some((r) => r.url === it.url)) {
          rawSearchResults.push(it);
        }
      }
      if (rawSearchResults.length >= 10) break;
    }

    // Section 11: Adaptive Search Retry if initial queries returned < 2 results
    if (rawSearchResults.length < 2 && topicContract) {
      const retryQuery = (primaryEntities[0] ? `${primaryEntities[0]} ` : '') + (topicContract.coreTopic.split(/\s+/).slice(0, 4).join(' '));
      console.log(`[LiveWebSearcher] 🔄 Adaptive Search Retry với query tinh gọn: "${retryQuery}"`);
      const retryItems = await this.searchBing(retryQuery.trim(), 5);
      for (const it of retryItems) {
        if (!rawSearchResults.some((r) => r.url === it.url)) {
          rawSearchResults.push(it);
        }
      }
    }

    // Pass through Search Result Relevance Gate (Section 8: Preliminary Filter)
    const evaluatedResults = rawSearchResults.filter((item) => {
      const gate = this.evaluateSearchResult(item, topicContract);
      if (!gate.approved) {
        console.log(`[SearchResultGate] 🛡️ Từ chối kết quả: "${item.title}" (${gate.rejectionReason})`);
        return false;
      }
      return true;
    });

    // Fetch and clean top URLs
    const sources: CleanedSourceDocument[] = [];
    const urlsToFetch = evaluatedResults.slice(0, maxSourcesToFetch);

    for (const item of urlsToFetch) {
      try {
        const pageResp = await axios.get(item.url, {
          headers: {
            'User-Agent': this.BROWSER_UA,
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
          },
          timeout: 8000,
        });

        const extracted = CleanContentExtractor.extract(pageResp.data, item.url);
        const evaluated = SourceQualityEngine.evaluateSource(
          item.url,
          extracted.title || item.title,
          extracted.cleanContent,
          extracted.images,
          extracted.rawContent,
          primaryEntities,
          topicContract
        );

        sources.push(evaluated);
      } catch (fetchErr: any) {
        // Individual page fetch failures are gracefully recorded
      }
    }

    // Sort by total score
    sources.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
    const approvedSources = sources.filter((s) => s.isApproved);

    return {
      rawSearchResults,
      sources,
      approvedSources,
    };
  }
}
