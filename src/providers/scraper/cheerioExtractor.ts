import axios from 'axios';
import * as cheerio from 'cheerio';
import { IArticleExtractor } from '../../types/index.js';

export class CheerioArticleExtractor implements IArticleExtractor {
  readonly name = 'CheerioArticleExtractor';

  async extract(url: string): Promise<{ title: string; summary?: string; content: string; keyPoints?: string[]; images?: string[] }> {
    try {
      console.log(`🌐 Đang tải nội dung từ URL: ${url}`);
      let html = '';
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          timeout: 12000,
          validateStatus: () => true,
        });

        const isChallenge =
          typeof response.data === 'string' &&
          (response.data.includes('document.cookie=') ||
            response.data.includes('Cloudrity') ||
            response.data.includes('PerimeterX') ||
            response.status === 403 ||
            response.status === 401 ||
            (response.status === 200 && response.data.length < 600));

        if (isChallenge) {
          console.log(`🛡️ Phát hiện cơ chế bảo vệ anti-bot (${response.status}), chuyển sang chế độ crawler bypass...`);
          let cookieHeader = '';
          if (typeof response.data === 'string' && response.data.includes('document.cookie=')) {
            const match = response.data.match(/document\.cookie\s*=\s*"([^";]+)/);
            if (match) {
              cookieHeader = match[1];
            }
          }

          const crawlerRes = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
              ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            },
            timeout: 15000,
            validateStatus: () => true,
          });

          if (crawlerRes.status === 200 && typeof crawlerRes.data === 'string' && crawlerRes.data.length > 500) {
            html = crawlerRes.data;
          } else {
            html = typeof response.data === 'string' ? response.data : '';
          }
        } else {
          html = typeof response.data === 'string' ? response.data : '';
        }
      } catch (err: any) {
        console.warn(`⚠️ Thử lại với crawler UA sau lỗi: ${err.message}`);
        const fallbackRes = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
          },
          timeout: 15000,
        });
        html = fallbackRes.data;
      }

      const $ = cheerio.load(html);

      // Extract title
      let title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('h1.title-detail').first().text().trim() ||
        $('h1').first().text().trim() ||
        $('title').text().trim() ||
        'Bài viết';

      title = title.replace(/\s+/g, ' ').replace(/- Báo VnExpress.*$/i, '').trim();

      // Extract summary / sapo / description
      const summary =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('p.description').first().text().trim() ||
        $('.lead').first().text().trim() ||
        $('.sapo').first().text().trim() ||
        '';

      // Clean unwanted elements, navigation, ads, and related/recommended other articles
      const noiseSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 'noscript', 'iframe', 'svg', 'form',
        '.nav', '.navbar', '.menu', '.navigation', '[role="navigation"]',
        '.header', '[role="banner"]', '.footer', '[role="contentinfo"]',
        'aside', '.sidebar', '.widget', '.sticky-side',
        '.comment', '.comments', '#comments', '.comment-list',
        '.advertisement', '.ads', '.banner', '.qc', '.quangcao',
        '.social-share', '.share-buttons', '.social-media', '.fb-share',
        // Related & recommended other articles:
        '.box-category', '.box_cate', '.box-related', '.related-news', '.related-posts', '.related-articles',
        '.box-tinkhac', '.box-cungchuyenmuc', '.other-news', '.news-other', '.more-news',
        '.tin-lien-quan', '.tin-cung-chuyen-muc', '.tin-khac', '.widget-related',
        '.recommendation', '.recommended', '.outbrain', '.taboola',
        '[data-campaign="Box-Related"]', '.list-news', '.list_link', '.news-list',
        '.box-tin-moi', '.box-tin-nong', '.box-tin-hot', '.most-read', '.trending',
        '.zone--timeline', '.special-content', '.reading-more', '.box_stream',
        '.relate', '.relate-news', '.news-relate', '.relative', '.relative-news',
        '.box-relative', '.relation_news', '.block_thumb_picture', '.list-response',
        '.box-focus', '.box-highlight', '.top-news', '.top-story',
      ];
      $(noiseSelectors.join(', ')).remove();

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

      const paragraphs: string[] = [];

      if (summary && summary.length > 25) {
        paragraphs.push(summary.replace(/\s+/g, ' ').trim());
      }

      // Collect paragraphs strictly from the main article container (including photo story captions)
      const targetScope = $mainContainer || $('body');
      targetScope.find('p, figcaption, .photo-desc, .desc').each((_: any, elem: any) => {
        const text = $(elem).text().replace(/\s+/g, ' ').trim();
        if (
          text.length > 20 &&
          !paragraphs.includes(text) &&
          !text.startsWith('Vy Anh') &&
          !text.includes('Bản quyền thuộc') &&
          !text.includes('Cấm sao chép')
        ) {
          paragraphs.push(text);
        }
      });

      // Collect article images STRICTLY from this article (no other posts)
      const images: string[] = [];
      const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
      if (
        ogImage &&
        /^https?:\/\//i.test(ogImage) &&
        !ogImage.includes('.svg') &&
        !ogImage.includes('logo') &&
        !ogImage.includes('google_news')
      ) {
        images.push(ogImage);
      }

      const imgScope = $mainContainer || $('body');
      imgScope.find('img').each((_: any, elem: any) => {
        let src =
          $(elem).attr('data-src') ||
          $(elem).attr('data-original') ||
          $(elem).attr('data-lazy-src') ||
          $(elem).attr('src') ||
          '';
        if (src.startsWith('//')) src = 'https:' + src;
        if (src.startsWith('/') && url) {
          try {
            src = new URL(src, url).href;
          } catch {}
        }
        if (
          src &&
          /^https?:\/\//i.test(src) &&
          !images.includes(src) &&
          !src.includes('.svg') &&
          !src.includes('avatar') &&
          !src.includes('icon') &&
          !src.includes('logo') &&
          !src.includes('banner') &&
          !src.includes('google_news') &&
          !src.includes('badge')
        ) {
          images.push(src);
        }
        const alt = $(elem).attr('alt')?.replace(/\s+/g, ' ').trim();
        if (alt && alt.length > 20 && !paragraphs.includes(alt)) {
          paragraphs.push(`[Nội dung ảnh/đồ họa]: ${alt}`);
        }
      });

      const content = paragraphs.join('\n\n');
      const keyPoints = paragraphs.slice(0, 6);

      console.log(`✅ Đã trích xuất thành công: "${title}" (${content.length} ký tự, ${paragraphs.length} đoạn, ${images.length} ảnh)`);
      return { title, summary, content, keyPoints, images };
    } catch (error: any) {
      console.warn(`⚠️ Không thể fetch trực tiếp URL: ${error.message}.`);
      return {
        title: 'Nội dung từ URL',
        content: `Nội dung từ liên kết: ${url}`,
      };
    }
  }
}
