import axios from 'axios';
import * as cheerio from 'cheerio';
import { WebSearchResult } from './webResearcher.js';
import { EntityTopicExtractor } from '../engine/entityTopicExtractor.js';

export interface SourceDocument {
  url: string;
  domain: string;
  sourceName: string;
  title: string;
  cleanedContent: string;
  keyPoints: string[];
  images: string[];
  relevanceScore: number; // 0 - 100
  tier: 1 | 2 | 3 | 4; // 1: Chính thống, 2: Báo chí uy tín, 3: Chuyên ngành, 4: Thứ cấp
  isApproved: boolean;
}

export interface ResearchOutput {
  query: string;
  coreTopic: string;
  topicCategory: 'travel' | 'vehicle' | 'real_estate' | 'finance' | 'tech' | 'business' | 'education' | 'news' | 'general';
  sources: SourceDocument[];
  approvedSources: SourceDocument[];
  rawSearchResults: WebSearchResult[];
  searchQueries: string[];
}

// Danh sách domain theo phân cấp uy tín
const TIER_1_DOMAINS = ['.gov.vn', '.edu.vn', 'chinhphu.vn', 'hatinh.gov.vn', 'vietnamtourism.gov.vn'];
const TIER_2_DOMAINS = [
  'vnexpress.net', 'tuoitre.vn', 'thanhnien.vn', 'vtv.vn', 'dantri.com.vn', 
  'laodong.vn', 'vietnamnet.vn', 'tienphong.vn', 'baochinhphu.vn', 'wikipedia.org',
  'cafef.vn', 'vneconomy.vn', 'forbes.vn'
];
const TIER_3_DOMAINS = [
  'tinhte.vn', 'genk.vn', 'autopro.com.vn', 'otosaigon.com', 'batdongsan.com.vn',
  'vietnambiz.vn', 'techz.vn', 'cellphones.com.vn'
];
const DISALLOWED_DOMAINS = [
  'support.google.com', 'google.com', 'bing.com', 'facebook.com', 'twitter.com',
  'instagram.com', 'pinterest.com', 'youtube.com', 'tiktok.com', 'shopee.vn/search'
];

export class ResearchEngine {
  private static readonly BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  /**
   * Phân loại chủ đề và tạo danh sách từ khoá tìm kiếm theo ngữ cảnh
   */
  /**
   * Phân loại chủ đề và tạo danh sách từ khoá tìm kiếm theo ngữ cảnh bằng EntityTopicExtractor
   */
  public static analyzeTopic(prompt: string, articleTitle?: string): {
    coreTopic: string;
    category: 'travel' | 'vehicle' | 'real_estate' | 'finance' | 'tech' | 'business' | 'education' | 'news' | 'general';
    queries: string[];
  } {
    const extracted = EntityTopicExtractor.extract(prompt, articleTitle);

    const catMap: Record<string, 'travel' | 'vehicle' | 'real_estate' | 'finance' | 'tech' | 'business' | 'education' | 'news' | 'general'> = {
      military: 'news',
      vehicle: 'vehicle',
      travel: 'travel',
      real_estate: 'real_estate',
      finance: 'finance',
      tech: 'tech',
      business: 'business',
      education: 'education',
      news: 'news',
      product: 'vehicle',
      general: 'general',
    };

    const category = catMap[extracted.category] || 'general';
    return {
      coreTopic: extracted.cleanTopic,
      category,
      queries: extracted.searchQueries,
    };
  }

  /**
   * Fetch trang web thật và loại bỏ 100% rác HTML, menu, footer, quảng cáo, gmail, login
   */
  public static async fetchAndCleanSource(url: string, topicKeyword: string): Promise<SourceDocument | null> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Kiểm tra blacklist
      if (DISALLOWED_DOMAINS.some((d) => domain.includes(d))) {
        return null;
      }

      const res = await axios.get(url, {
        headers: {
          'User-Agent': this.BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data);

      // Loại bỏ toàn bộ các thẻ rác, widget, script, navigation, footer, modal, cookie banner
      $(
        'script, style, nav, header, footer, noscript, iframe, svg, form, ' +
        '.nav, .navbar, .menu, .footer, .sidebar, .comment, .comments, ' +
        '.advertisement, .ads, .banner, .cookie, .popup, .modal, .widget, ' +
        '.login, .auth, .help-center, .related, .social-share, [role="banner"], [role="navigation"]'
      ).remove();

      // Lấy Title sạch
      let title =
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        $('title').text().trim() ||
        url;
      title = title.replace(/\s+/g, ' ').replace(/[-|].*(VnExpress|Tuổi Trẻ|Thanh Niên|Dân Trí).*$/i, '').trim();

      // Thu thập các đoạn văn bản chính (main article body)
      const paragraphs: string[] = [];
      const bodySelectors = [
        'article p',
        'main p',
        '.fck_detail p',
        '.detail__content p',
        '.content p',
        '.post-content p',
        '.entry-content p',
        'p',
      ];

      for (const sel of bodySelectors) {
        $(sel).each((_, el) => {
          const rawP = $(el).text().replace(/\s+/g, ' ').trim();
          if (
            rawP.length >= 35 &&
            !paragraphs.includes(rawP) &&
            !ResearchEngine.isJunkParagraph(rawP)
          ) {
            paragraphs.push(rawP);
          }
        });
        if (paragraphs.length >= 8) break;
      }

      if (paragraphs.length === 0) return null;

      // Thu thập ảnh từ bài viết
      const images: string[] = [];
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg && /^https?:\/\//i.test(ogImg) && !ogImg.includes('.svg')) {
        images.push(ogImg);
      }
      $('article img, main img, figure img').each((_, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src');
        if (src && /^https?:\/\//i.test(src) && !src.includes('.svg') && !src.includes('avatar') && !src.includes('logo')) {
          if (!images.includes(src)) images.push(src);
        }
      });

      // Xác định Tier
      let tier: 1 | 2 | 3 | 4 = 4;
      if (TIER_1_DOMAINS.some((d) => domain.includes(d))) tier = 1;
      else if (TIER_2_DOMAINS.some((d) => domain.includes(d))) tier = 2;
      else if (TIER_3_DOMAINS.some((d) => domain.includes(d))) tier = 3;

      // Tính điểm Source Relevance (0 - 100)
      let relevanceScore = 50;
      if (tier === 1) relevanceScore += 35;
      else if (tier === 2) relevanceScore += 25;
      else if (tier === 3) relevanceScore += 15;

      const fullText = (title + ' ' + paragraphs.join(' ')).toLowerCase();
      const kwMatches = topicKeyword
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      
      let matchCount = 0;
      for (const kw of kwMatches) {
        if (fullText.includes(kw)) matchCount++;
      }
      const matchRatio = kwMatches.length > 0 ? matchCount / kwMatches.length : 1;
      relevanceScore = Math.round(relevanceScore * matchRatio);

      // Càng nhiều nội dung chuẩn thì càng tin cậy
      if (paragraphs.length >= 5) relevanceScore = Math.min(100, relevanceScore + 10);

      const isApproved = relevanceScore >= 75;

      return {
        url,
        domain,
        sourceName: domain.replace(/^www\./, ''),
        title,
        cleanedContent: paragraphs.slice(0, 8).join('\n\n'),
        keyPoints: paragraphs.slice(0, 6),
        images: images.slice(0, 5),
        relevanceScore,
        tier,
        isApproved,
      };
    } catch {
      return null;
    }
  }

  /**
   * Kiểm tra và loại bỏ đoạn văn chứa rác web
   */
  private static isJunkParagraph(p: string): boolean {
    const s = p.toLowerCase();
    const junkPatterns = [
      /đăng nhập vào/i,
      /gmail/i,
      /máy tính.*trợ giúp/i,
      /mật khẩu/i,
      /cookie/i,
      /bản quyền/i,
      /privacy policy/i,
      /mã bưu chính/i,
      /phân chia hành chính:/i,
      /hotline/i,
      /quảng cáo/i,
      /liên hệ toà soạn/i,
      /điều khoản/i,
      /tải app/i,
      /bấm vào đây/i,
      /javascript is disabled/i,
    ];
    return junkPatterns.some((pattern) => pattern.test(s));
  }

  /**
   * Thực thi toàn bộ pipeline Research Engine
   */
  public static async conductResearch(rawPrompt: string): Promise<ResearchOutput> {
    const { coreTopic, category, queries } = this.analyzeTopic(rawPrompt);
    console.log(`🔬 [ResearchEngine] Nghiên cứu chủ đề: "${coreTopic}" (Category: ${category})`);

    const rawSearchResults: WebSearchResult[] = [];
    const sourceCandidates: SourceDocument[] = [];

    // Tìm kiếm qua Bing & Wikipedia
    for (const q of queries) {
      try {
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=vi`;
        const res = await axios.get(bingUrl, {
          headers: { 'User-Agent': this.BROWSER_UA },
          timeout: 9000,
        });
        const $ = cheerio.load(res.data);
        $('li.b_algo h2 a').each((_, el) => {
          if (rawSearchResults.length >= 10) return;
          const href = $(el).attr('href') || '';
          const title = $(el).text().trim();
          let realUrl = href;
          if (href.includes('bing.com/ck/a') && href.includes('u=')) {
            const match = href.match(/[?&]u=a1([^&]+)/);
            if (match) {
              try {
                realUrl = Buffer.from(match[1], 'base64').toString('utf-8');
              } catch {}
            }
          }
          if (realUrl && realUrl.startsWith('http') && !rawSearchResults.some((r) => r.url === realUrl)) {
            rawSearchResults.push({ title, snippet: '', url: realUrl });
          }
        });
      } catch {}
    }

    // Luôn bổ sung thông tin chính thức từ Wikipedia Tiếng Việt nếu có
    try {
      const wikiUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(coreTopic)}&utf8=&format=json`;
      const wikiRes = await axios.get(wikiUrl, {
        headers: { 'User-Agent': 'AITextToVideo/1.0 (bot@example.com)' },
        timeout: 8000
      });
      const topItem = wikiRes.data?.query?.search?.[0];
      if (topItem?.title) {
        const pageTitle = topItem.title;
        const wikiPageUrl = `https://vi.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`;
        if (!rawSearchResults.some((r) => r.url === wikiPageUrl)) {
          rawSearchResults.unshift({ title: pageTitle, snippet: '', url: wikiPageUrl });
        }

        // Fetch REST summary trực tiếp cho Wikipedia
        try {
          const restUrl = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
          const restRes = await axios.get(restUrl, {
            headers: { 'User-Agent': 'AITextToVideo/1.0 (bot@example.com)' },
            timeout: 8000
          });
          const summaryData = restRes.data;
          if (summaryData?.extract && summaryData.extract.length > 50) {
            sourceCandidates.push({
              url: wikiPageUrl,
              domain: 'vi.wikipedia.org',
              sourceName: 'Wikipedia Tiếng Việt',
              title: summaryData.title || pageTitle,
              cleanedContent: summaryData.extract,
              keyPoints: [summaryData.extract, summaryData.description || ''].filter(Boolean),
              images: summaryData.thumbnail?.source ? [summaryData.thumbnail.source] : [],
              relevanceScore: 95,
              tier: 2,
              isApproved: true,
            });
          }
        } catch {}
      }
    } catch {}

    // Fetch từng trang thật và làm sạch (Phase 2)
    const fetchPromises = rawSearchResults.slice(0, 6).map((r) =>
      this.fetchAndCleanSource(r.url, coreTopic)
    );

    const fetchedDocs = await Promise.all(fetchPromises);
    for (const doc of fetchedDocs) {
      if (doc && !sourceCandidates.some((s) => s.url === doc.url)) sourceCandidates.push(doc);
    }

    // Sắp xếp theo thứ tự: Tier 1 -> Tier 2 -> Tier 3 -> relevanceScore cao nhất
    sourceCandidates.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return b.relevanceScore - a.relevanceScore;
    });

    const approvedSources = sourceCandidates.filter((s) => s.isApproved);
    console.log(`✅ [ResearchEngine] Đã thu thập ${sourceCandidates.length} nguồn, có ${approvedSources.length} nguồn được phê duyệt (Relevance >= 75).`);

    return {
      query: rawPrompt,
      coreTopic,
      topicCategory: category,
      sources: sourceCandidates,
      approvedSources,
      rawSearchResults,
      searchQueries: queries,
    };
  }
}
