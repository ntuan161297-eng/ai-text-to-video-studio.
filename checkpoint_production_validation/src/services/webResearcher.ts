import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface ResearchDossier {
  query: string;
  topicTitle: string;
  summary: string;
  keyPoints: string[];
  specs: Record<string, string>;
  images: string[];
  sourceUrls: string[];
  fullContext: string;
  isVehicle?: boolean;
  isTechGadget?: boolean;
  isTravel?: boolean;
}

export class WebResearcher {
  private static readonly BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';

  private static readonly WIKI_UA =
    'AITextToVideo/1.0 (https://github.com/ai-text-to-video; bot@example.com) Axios/1.7.0';

  /**
   * Làm sạch văn bản cào từ web: loại bỏ hoàn toàn các đoạn văn rác, tài khoản, đăng nhập, cookie, mã bưu chính...
   */
  public static sanitizeSnippet(rawText: string): string {
    if (!rawText) return '';
    let text = rawText
      // Xoá thẻ html còn sót
      .replace(/<[^>]+>/g, ' ')
      // Tách các từ bị dính do HTML không có khoảng trắng (ví dụ: kiệtQuê -> kiệt Quê)
      .replace(/([a-zà-ỹ0-9])([A-ZÀ-Ỹ])/g, '$1 $2')
      .replace(/([a-zà-ỹ])([0-9])/gi, '$1 $2')
      // Xoá trích dẫn Wikipedia: [1], [2], [cần dẫn nguồn], ^
      .replace(/\[\d+\]/g, '')
      .replace(/\[cần dẫn nguồn\]/gi, '')
      .replace(/\^/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Bỏ các tiền tố hệ thống
    text = text
      .replace(/^(?:thông tin chi tiết từ internet|tổng quan|chủ đề|mô tả|chi tiết):\s*/gi, '')
      .trim();

    return text;
  }

  /**
   * Kiểm tra xem một đoạn văn có chứa nội dung rác của website (đăng nhập, gmail, quảng cáo, hỗ trợ kỹ thuật...) hay không
   */
  public static isJunkSentence(sentence: string): boolean {
    const s = sentence.toLowerCase();
    const junkPatterns = [
      /đăng nhập vào gmail/i,
      /máy tính.*gmail trợ giúp/i,
      /để mở gmail/i,
      /thêm tài khoản của bạn vào ứng dụng/i,
      /quên mật khẩu/i,
      /cookies/i,
      /bản quyền thuộc về/i,
      /privacy policy/i,
      /mã bưu chính/i,
      /mã hành chính/i,
      /biển số xe/i,
      /tiêu chuẩn iso/i,
      /hotline:\s*\d+/i,
      /liên hệ quảng cáo/i,
      /bấm vào đây để/i,
      /nhấp chuột/i,
      /bản đồ hành chính/i,
      /phân chia hành chính:/i,
      /trụ sở ủy ban/i,
      /đường dây nóng/i,
      /chính sách bảo mật/i,
      /điều khoản sử dụng/i,
      /chọn ngôn ngữ/i,
      /javascript is disabled/i,
      /tải ứng dụng ngay/i,
    ];

    for (const pattern of junkPatterns) {
      if (pattern.test(s)) return true;
    }

    // Nếu quá ngắn hoặc toàn số/ký tự lạ
    if (sentence.length < 25) return true;
    if (/^[0-9\s.,:;()/-]+$/.test(sentence)) return true;

    return false;
  }

  /**
   * Làm sạch prompt để rút ra từ khoá tìm kiếm trọng tâm
   */
  public static extractSearchKeywords(prompt: string): {
    cleanQuery: string;
    coreTopic: string;
    topicType: 'vehicle' | 'travel' | 'tech' | 'general';
  } {
    let clean = prompt
      .replace(/^https?:\/\/[^\s]+/g, '')
      .replace(/tạo\s+video\s+(?:tiktok|reels|shorts|youtube)?\s*(?:\d+s|\d+\s*giây)?\s*[:,-]?/gi, '')
      .replace(/(?:hãy|vui lòng|giúp tôi)?\s*(?:làm|tạo|dựng|sản xuất)\s+video\s*(?:ngắn)?\s*(?:về|cho)?/gi, '')
      .replace(/(?:giới thiệu|review|đánh giá|khám phá|tìm hiểu)\s*(?:về|chi tiết|toàn diện)?/gi, '')
      .replace(/theo\s+phong\s+cách[^\n.]+/gi, '')
      .replace(/định\s+dạng\s+9:16[^\n.]+/gi, '')
      .trim();

    // Loại bỏ ký tự thừa
    clean = clean.replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();

    if (!clean || clean.length < 3) {
      clean = prompt.slice(0, 50).trim();
    }

    // Xác định chủ đề dựa trên prompt gốc của người dùng
    const promptLower = prompt.toLowerCase();
    let topicType: 'vehicle' | 'travel' | 'tech' | 'general' = 'general';

    if (
      /(du lịch|khám phá|địa danh|thắng cảnh|non nước|bãi biển|vịnh|đảo|chùa|nhà thờ|khu nghỉ dưỡng|resort|tỉnh|thành phố|hà tĩnh|đà lạt|đà nẵng|phú quốc|hạ long|nha trang|sapa|vũng tàu|huế|hà nội|sài gòn|quảng bình|quảng ninh|ninh bình|mộc châu|an giang)/i.test(
        promptLower
      )
    ) {
      topicType = 'travel';
    } else if (
      /(xe|vinfast|ô tô|oto|car|suv|sedan|xe điện|motor|honda|toyota|hyundai|kia|mercedes|bmw|porsche|tesla|vf3|vf 3|vf7|vf8|vf9|xe máy)/i.test(
        promptLower
      )
    ) {
      topicType = 'vehicle';
    } else if (
      /(iphone|samsung|galaxy|macbook|laptop|xiaomi|tai nghe|đồng hồ thông minh|smartwatch|ipad|gpu|card đồ hoạ|rtx|camera|điện thoại)/i.test(
        promptLower
      )
    ) {
      topicType = 'tech';
    }

    // Rút trích coreTopic chuẩn xác cho Wikipedia / hình ảnh
    let coreTopic = clean;
    if (topicType === 'travel') {
      coreTopic = clean
        .replace(/\b(?:du lịch|khám phá|vùng đất|địa danh|tỉnh|thành phố|thắng cảnh)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    } else if (topicType === 'vehicle') {
      coreTopic = clean
        .replace(/\b(?:xe|chiếc xe|mẫu xe|dòng xe|sản phẩm|mẫu|đời|năm)\b/gi, '')
        .replace(/\b202\d\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Chuẩn hoá tên xe Vinfast VF3 -> VinFast VF 3
      if (/vinfast\s*vf\s*3\b/i.test(coreTopic)) {
        coreTopic = 'VinFast VF 3';
      } else if (/vinfast\s*vf\s*(\d+)\b/i.test(coreTopic)) {
        coreTopic = coreTopic.replace(/vinfast\s*vf\s*(\d+)/i, 'VinFast VF $1');
      }
    }

    if (!coreTopic || coreTopic.length < 2) {
      coreTopic = clean;
    }

    return { cleanQuery: clean, coreTopic, topicType };
  }

  /**
   * Tìm kiếm web qua Bing Search
   */
  public static async searchBing(query: string, limit = 8): Promise<WebSearchResult[]> {
    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=vi`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': this.BROWSER_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 9000,
      });

      const $ = cheerio.load(res.data);
      const results: WebSearchResult[] = [];

      $('li.b_algo').each((_, el) => {
        if (results.length >= limit) return;
        const titleEl = $(el).find('h2 a');
        const rawTitle = titleEl.text().trim();
        const href = titleEl.attr('href') || '';
        const rawSnippet = $(el).find('.b_caption p, .b_algoSlug, p').text().trim();

        const title = this.sanitizeSnippet(rawTitle);
        const snippet = this.sanitizeSnippet(rawSnippet);

        if (title && snippet && !this.isJunkSentence(snippet) && href.startsWith('http')) {
          results.push({ title, snippet, url: href });
        }
      });

      return results;
    } catch (err: any) {
      console.warn(`[WebResearcher] Bing search error for "${query}":`, err.message);
      return [];
    }
  }

  /**
   * Tìm kiếm và lấy thông tin chuẩn từ Wikipedia (Tiếng Việt)
   */
  public static async searchWikipedia(query: string): Promise<{
    title: string;
    description?: string;
    extract?: string;
    imageUrl?: string;
    detailBullets?: string[];
  } | null> {
    try {
      // 1. Search Wikipedia
      const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`;
      const searchRes = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.WIKI_UA },
        timeout: 8000,
      });

      const items = searchRes.data?.query?.search || [];
      if (items.length === 0) return null;

      const topTitle = items[0].title;

      // 2. Fetch REST summary
      let summaryData: any = null;
      try {
        const restUrl = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
        const restRes = await axios.get(restUrl, {
          headers: { 'User-Agent': this.WIKI_UA },
          timeout: 8000,
        });
        summaryData = restRes.data;
      } catch {}

      // 3. Fetch structured text
      const detailBullets: string[] = [];
      try {
        const parseUrl = `https://vi.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(topTitle)}&prop=text&format=json`;
        const parseRes = await axios.get(parseUrl, {
          headers: { 'User-Agent': this.WIKI_UA },
          timeout: 8000,
        });
        const html = parseRes.data?.parse?.text?.['*'];
        if (html) {
          const $ = cheerio.load(html);
          $('table.navbox, table.vertical-navbox, .reference, style, script, .infobox, .mw-empty-elt').remove();

          $('p').each((_, p) => {
            if (detailBullets.length >= 8) return;
            const cleaned = WebResearcher.sanitizeSnippet($(p).text());
            if (cleaned.length > 40 && !WebResearcher.isJunkSentence(cleaned)) {
              detailBullets.push(cleaned);
            }
          });
        }
      } catch {}

      const cleanExtract = this.sanitizeSnippet(summaryData?.extract || '');

      return {
        title: topTitle,
        description: summaryData?.description,
        extract: this.isJunkSentence(cleanExtract) ? undefined : cleanExtract,
        imageUrl: summaryData?.originalimage?.source || summaryData?.thumbnail?.source,
        detailBullets: detailBullets.slice(0, 8),
      };
    } catch (err: any) {
      console.warn(`[WebResearcher] Wikipedia error for "${query}":`, err.message);
      return null;
    }
  }

  /**
   * Thu thập ảnh thực tế độ nét cao từ Bing Images & Wikimedia
   */
  public static async searchTopicImages(query: string, maxImages = 12): Promise<string[]> {
    const images: string[] = [];

    // 1. Bing Images Search
    try {
      const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': this.BROWSER_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 9000,
      });

      const $ = cheerio.load(res.data);
      $('.iusc').each((_, el) => {
        if (images.length >= maxImages) return;
        try {
          const m = $(el).attr('m');
          if (m) {
            const parsed = JSON.parse(m);
            const murl = parsed.murl;
            if (
              murl &&
              murl.startsWith('http') &&
              !murl.includes('.svg') &&
              !murl.includes('data:image') &&
              !murl.includes('logo') &&
              !images.includes(murl)
            ) {
              images.push(murl);
            }
          }
        } catch {}
      });
    } catch (err: any) {
      console.warn(`[WebResearcher] Bing Images error for "${query}":`, err.message);
    }

    // 2. Wikimedia Commons fallback / supplement
    if (images.length < 5) {
      try {
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=imageinfo&iiprop=url|mime&format=json`;
        const wikiRes = await axios.get(wikiUrl, {
          headers: { 'User-Agent': this.WIKI_UA },
          timeout: 8000,
        });
        const pages = wikiRes.data?.query?.pages || {};
        for (const k of Object.keys(pages)) {
          const info = pages[k]?.imageinfo?.[0];
          if (info && info.url && info.mime?.startsWith('image/') && !info.mime.includes('svg')) {
            if (!images.includes(info.url)) {
              images.push(info.url);
            }
          }
        }
      } catch {}
    }

    return images;
  }

  /**
   * Thực hiện nghiên cứu thông tin toàn diện từ nhiều nguồn internet theo đúng ngữ cảnh chủ đề
   */
  public static async researchTopic(rawPrompt: string): Promise<ResearchDossier> {
    const { cleanQuery, coreTopic, topicType } = this.extractSearchKeywords(rawPrompt);
    console.log(`🌐 [WebResearcher] Đang nghiên cứu chủ đề: "${coreTopic}" / "${cleanQuery}" (Type: ${topicType})...`);

    // Tạo câu truy vấn Bing & Hình ảnh phù hợp với từng chủ đề
    let bingQuery = `${coreTopic} thông tin tổng quan giới thiệu`;
    let imageQuery = `${coreTopic} hình ảnh thực tế chất lượng cao`;

    if (topicType === 'travel') {
      bingQuery = `${coreTopic} địa điểm du lịch danh lam thắng cảnh văn hóa ẩm thực`;
      imageQuery = `${coreTopic} phong cảnh du lịch thiên nhiên danh lam thắng cảnh đẹp`;
    } else if (topicType === 'vehicle') {
      bingQuery = `${coreTopic} giá bán thông số kỹ thuật đánh giá review`;
      imageQuery = `${coreTopic} xe ô tô ngoại thất khoang lái thực tế`;
    } else if (topicType === 'tech') {
      bingQuery = `${coreTopic} thông số kỹ thuật tính năng đánh giá review`;
      imageQuery = `${coreTopic} thiết kế trên tay thực tế công nghệ`;
    }

    // Chạy song song Bing Search, Wikipedia, và Bing Images
    const [bingResults, wikiResult, images] = await Promise.all([
      this.searchBing(bingQuery, 6),
      (async () => {
        const w1 = await this.searchWikipedia(coreTopic);
        if (w1) return w1;
        return await this.searchWikipedia(cleanQuery);
      })(),
      this.searchTopicImages(imageQuery, 10),
    ]);

    const keyPoints: string[] = [];
    const specs: Record<string, string> = {};
    const sourceUrls: string[] = [];

    // Bổ sung ảnh từ Wikipedia nếu có và không phải SVG logo
    if (wikiResult?.imageUrl && !wikiResult.imageUrl.includes('.svg') && !images.includes(wikiResult.imageUrl)) {
      images.unshift(wikiResult.imageUrl);
    }

    // Xử lý thông tin từ Wikipedia
    if (wikiResult) {
      if (wikiResult.extract && !this.isJunkSentence(wikiResult.extract)) {
        keyPoints.push(wikiResult.extract);
      }
      if (wikiResult.detailBullets && wikiResult.detailBullets.length > 0) {
        for (const bullet of wikiResult.detailBullets) {
          if (!this.isJunkSentence(bullet) && !keyPoints.includes(bullet)) {
            keyPoints.push(bullet);
          }
        }
      }
    }

    // Xử lý thông tin từ Bing Search
    for (const b of bingResults) {
      if (b.snippet && b.snippet.length > 30 && !this.isJunkSentence(b.snippet)) {
        if (!keyPoints.some((p) => p.includes(b.snippet.slice(0, 30)))) {
          keyPoints.push(b.snippet);
        }
      }
      if (b.url && !sourceUrls.includes(b.url)) {
        sourceUrls.push(b.url);
      }
    }

    // Tổng hợp tóm tắt chủ đề
    const topicTitle = wikiResult?.title || coreTopic.toUpperCase();
    const summary =
      wikiResult?.extract ||
      (bingResults[0]?.snippet ? bingResults[0].snippet : `Khám phá những nét đặc sắc và thông tin ấn tượng về ${coreTopic}.`);

    // Ghép toàn bộ ngữ cảnh thành các câu hoàn chỉnh (tuyệt đối không để lại nhãn tiêu đề rác)
    const contextLines = [
      summary,
      ...keyPoints.slice(0, 10),
    ];

    const fullContext = contextLines.join('\n\n');

    console.log(`✅ [WebResearcher] Đã thu thập thành công ${keyPoints.length} điểm dữ liệu và ${images.length} hình ảnh thực tế cho "${topicTitle}".`);

    return {
      query: cleanQuery,
      topicTitle,
      summary,
      keyPoints,
      specs,
      images,
      sourceUrls,
      fullContext,
      isVehicle: topicType === 'vehicle',
      isTechGadget: topicType === 'tech',
      isTravel: topicType === 'travel',
    };
  }


}
