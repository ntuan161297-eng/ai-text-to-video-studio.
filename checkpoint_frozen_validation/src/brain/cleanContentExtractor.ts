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
    // 11. related articles / links
    '.related',
    '.related-posts',
    '.related-articles',
    '.more-news',
    '.tin-lien-quan',
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

    // 3. Extract high-quality images from article
    const images: string[] = [];
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg && /^https?:\/\//i.test(ogImg) && !ogImg.includes('.svg')) {
      images.push(ogImg);
    }

    $('article img, main img, figure img, .detail-content img').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (
        src &&
        /^https?:\/\//i.test(src) &&
        !src.includes('.svg') &&
        !src.includes('avatar') &&
        !src.includes('logo') &&
        !src.includes('icon') &&
        !images.includes(src)
      ) {
        images.push(src);
      }
    });

    // 4. Extract main content paragraphs
    const bodySelectors = [
      'article p',
      'main p',
      '.fck_detail p',
      '.detail__content p',
      '.content-detail p',
      '.post-content p',
      '.entry-content p',
      'p',
    ];

    const cleanParagraphs: string[] = [];

    for (const sel of bodySelectors) {
      $(sel).each((_, el) => {
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
      if (cleanParagraphs.length >= 10) break;
    }

    const cleanContent = cleanParagraphs.join('\n\n');

    return {
      title,
      rawContent,
      cleanContent,
      images: images.slice(0, 8),
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
