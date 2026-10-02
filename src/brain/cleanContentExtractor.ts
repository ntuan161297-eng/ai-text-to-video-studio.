/**
 * PART 4 — SOURCE FETCH & CLEAN CONTENT
 * Fetches real web pages and extracts MAIN CONTENT while stripping all 18 noise categories.
 * Completely isolates rawContent and cleanContent. Downstream modules are never allowed to read rawContent.
 */

import * as cheerio from 'cheerio';

export interface ExtractedPageResult {
  title: string;
  rawContent: string;
  cleanContent: string;
  images: string[];
  cleanParagraphs: string[];
}

export class CleanContentExtractor {
  // 18 noise categories to strip completely
  private static readonly NOISE_SELECTORS = [
    'script',
    'style',
    'noscript',
    'iframe',
    'svg',
    'form',
    // 1. nav & menus
    'nav',
    '.nav',
    '.navbar',
    '.menu',
    '.navigation',
    '[role="navigation"]',
    // 2. headers
    'header',
    '.header',
    '[role="banner"]',
    // 3. footers
    'footer',
    '.footer',
    '[role="contentinfo"]',
    // 4. login / sign in / auth
    '.login',
    '.auth',
    '.sign-in',
    '.signin',
    '#login',
    '#auth',
    // 5. Gmail / Google account widgets
    '.gb_a',
    '.gb_b',
    '.google-account',
    // 6. help center / support
    '.help-center',
    '.support',
    '.faq-nav',
    // 7. cookie / privacy / consent
    '.cookie',
    '.cookies',
    '.cookie-banner',
    '.consent',
    '#cookie-notice',
    // 8. terms / legal
    '.terms',
    '.legal',
    '.disclaimer',
    // 9. sidebar / widgets
    'aside',
    '.sidebar',
    '.widget',
    '.sticky-side',
    // 10. ads & banners
    '.advertisement',
    '.ads',
    '.ad-container',
    '.ad',
    '.banner',
    '.qc',
    '.quangcao',
    // 11. related articles / recommended / other news boxes
    '.related',
    '.related-posts',
    '.related-articles',
    '.more-news',
    '.tin-lien-quan',
    '.box-category',
    '.box_cate',
    '.box-related',
    '.related-news',
    '.box-tinkhac',
    '.box-cungchuyenmuc',
    '.other-news',
    '.news-other',
    '.tin-cung-chuyen-muc',
    '.tin-khac',
    '.widget-related',
    '[data-campaign="Box-Related"]',
    '.list-news',
    '.list_link',
    '.news-list',
    '.box-tin-moi',
    '.box-tin-nong',
    '.box-tin-hot',
    '.most-read',
    '.trending',
    '.zone--timeline',
    '.special-content',
    '.reading-more',
    '.box_stream',
    '.relate',
    '.relate-news',
    '.news-relate',
    '.relative',
    '.relative-news',
    '.box-relative',
    '.relation_news',
    '.block_thumb_picture',
    '.list-response',
    '.box-focus',
    '.box-highlight',
    '.top-news',
    '.top-story',
    // 12. comments
    '.comment',
    '.comments',
    '#comments',
    '.comment-list',
    // 13. recommendations / outbrain / taboola
    '.recommendation',
    '.recommended',
    '.outbrain',
    '.taboola',
    // 14. social share buttons
    '.social-share',
    '.share-buttons',
    '.social-media',
    '.fb-share',
    // 15. newsletters / popups / modals
    '.newsletter',
    '.subscription',
    '.subscribe',
    '.popup',
    '.modal',
    '.dialog',
    // 16. hidden text
    '[aria-hidden="true"]',
    '.hidden',
    '.d-none',
    '[style*="display:none"]',
    '[style*="display: none"]',
  ];

  // Regex patterns indicating crawler/page junk that must be discarded
  private static readonly JUNK_TEXT_PATTERNS = [
    /đăng nhập vào gmail/i,
    /gmail trợ giúp/i,
    /quên mật khẩu/i,
    /máy tính.*trợ giúp/i,
    /cookie policy/i,
    /chính sách bảo mật/i,
    /điều khoản sử dụng/i,
    /bản quyền thuộc về/i,
    /hotline liên hệ/i,
    /quảng cáo toà soạn/i,
    /tải ứng dụng/i,
    /nhấp vào đây/i,
    /bấm vào đây/i,
    /javascript is disabled/i,
    /bật javascript/i,
    /mã bưu chính/i,
    /chuyên mục:/i,
    /liên kết liên quan/i,
    /xem thêm tin tức/i,
  ];

  /**
   * Cleans an HTML string, extracts main content, and enforces strict raw vs clean separation
   */
  public static extract(html: string, url: string): ExtractedPageResult {
    const $ = cheerio.load(html);

    // Save initial raw body content for debug observability
    const rawContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

    // 1. Remove all 18 noise categories
    $(this.NOISE_SELECTORS.join(', ')).remove();

    // 2. Extract clean title
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      url;

    title = title
      .replace(/\s+/g, ' ')
      .replace(/[-|].*(VnExpress|Tuổi Trẻ|Thanh Niên|Dân Trí|Zing|VietnamNet|VTV).*$/i, '')
      .trim();

    // Smart hierarchical article container discovery
    const mainContainerSelectors = [
      '[itemprop="articleBody"]',
      '.article__body',
      '.detail__content',
      '.content-detail',
      '.detail-content',
      '.fck_detail',
      '.singular-content',
      '.detail__cmain',
      '.article-content',
      '.article-body',
      '.entry-content',
      '.post-content',
      '.body-content',
      '.article__main-content',
      '.article__content',
      '.story__body',
      '.maincontent',
      '.cms-body',
      'article:has(h1)',
      'main:has(h1)',
      'article',
      'main',
    ];

    let $mainContainer: cheerio.Cheerio<any> | null = null;
    for (const sel of mainContainerSelectors) {
      const found = $(sel);
      if (found.length > 0 && found.find('p').length >= 2) {
        $mainContainer = found.first();
        break;
      }
    }

    // If standard selectors fail, climb ancestors from <h1>
    if (!$mainContainer) {
      const $h1 = $('h1').first();
      if ($h1.length > 0) {
        let curr = $h1.parent();
        while (curr.length && !curr.is('body') && !curr.is('html')) {
          if (curr.find('p').length >= 2) {
            $mainContainer = curr;
            break;
          }
          curr = curr.parent();
        }
      }
    }

    // Final fallback: find element containing the most paragraph content
    if (!$mainContainer) {
      let maxPCount = 0;
      $('div, section').each((_: any, el: any) => {
        const pCount = $(el).children('p').length;
        if (pCount > maxPCount) {
          maxPCount = pCount;
          $mainContainer = $(el);
        }
      });
    }

    // 3. Extract high-quality images strictly from this article (no other posts)
    const images: string[] = [];
    const seenNormalizedUrls = new Set<string>();

    const normalizeUrlKey = (raw: string): string => {
      try {
        const u = new URL(raw);
        // Normalize protocol + hostname + clean pathname (collapse redundant slashes)
        const cleanPath = u.pathname.replace(/\/+/g, '/').toLowerCase();
        return `${u.hostname.toLowerCase()}${cleanPath}`;
      } catch {
        return raw.toLowerCase().replace(/\/+/g, '/');
      }
    };

    const ogImg = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
    if (ogImg && /^https?:\/\//i.test(ogImg) && !ogImg.includes('.svg') && !ogImg.includes('logo')) {
      images.push(ogImg);
      seenNormalizedUrls.add(normalizeUrlKey(ogImg));
    }

    if ($mainContainer) {
      $mainContainer.find('img').each((_, el) => {
        let src = $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('src') || '';
        if (src.startsWith('//')) src = 'https:' + src;
        if (src.startsWith('/') && url) {
          try { src = new URL(src, url).href; } catch {}
        }
        if (
          src &&
          /^https?:\/\//i.test(src) &&
          !src.includes('.svg') &&
          !src.includes('avatar') &&
          !src.includes('logo') &&
          !src.includes('icon') &&
          !src.includes('banner')
        ) {
          const normKey = normalizeUrlKey(src);
          if (!seenNormalizedUrls.has(normKey)) {
            seenNormalizedUrls.add(normKey);
            images.push(src);
          }
        }
      });
    }

    // 4. Extract main content paragraphs strictly from this article
    const targetScope = $mainContainer || $('body');
    const cleanParagraphs: string[] = [];

    targetScope.find('p').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      // Discard short snippets (<30 chars) and sentences with junk patterns
      if (
        text.length >= 30 &&
        !cleanParagraphs.includes(text) &&
        !this.isJunkText(text)
      ) {
        cleanParagraphs.push(text);
      }
    });

    const cleanContent = cleanParagraphs.join('\n\n');

    return {
      title,
      rawContent,
      cleanContent,
      images: images.slice(0, 12),
      cleanParagraphs,
    };
  }

  /**
   * Detects if a paragraph contains navigational or crawler junk
   */
  public static isJunkText(text: string): boolean {
    return this.JUNK_TEXT_PATTERNS.some((pattern) => pattern.test(text));
  }
}
