import axios from 'axios';
import * as cheerio from 'cheerio';
import { IArticleExtractor } from '../../types/index.js';

export class CheerioArticleExtractor implements IArticleExtractor {
  readonly name = 'CheerioArticleExtractor';

  async extract(url: string): Promise<{ title: string; summary?: string; content: string; keyPoints?: string[]; images?: string[] }> {
    try {
      console.log(`🌐 Đang tải nội dung từ URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

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

      // Clean unwanted elements
      $(
        'script, style, nav, header, footer, noscript, iframe, svg, form, .comment, .comments, .sidebar, .advertisement, .ads, [role="banner"], [role="navigation"]'
      ).remove();

      const paragraphs: string[] = [];

      if (summary && summary.length > 25) {
        paragraphs.push(summary.replace(/\s+/g, ' ').trim());
      }

      // Collect paragraphs from detail containers
      const articleSelectors = [
        '.fck_detail p',
        '.detail__content p',
        '.content-detail p',
        '.post-content p',
        'article p',
        'main p',
        '.Normal',
      ];

      for (const sel of articleSelectors) {
        $(sel).each((_: any, elem: any) => {
          const text = $(elem).text().replace(/\s+/g, ' ').trim();
          if (text.length > 25 && !paragraphs.includes(text) && !text.startsWith('Vy Anh')) {
            paragraphs.push(text);
          }
        });
      }

      // Collect article images
      const images: string[] = [];
      const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
      if (ogImage && /^https?:\/\//i.test(ogImage)) {
        images.push(ogImage);
      }

      $('picture img, .block_thumb_picture img, figure img, .fck_detail img, article img').each((_: any, elem: any) => {
        const src = $(elem).attr('data-src') || $(elem).attr('src');
        if (src && /^https?:\/\//i.test(src) && !images.includes(src) && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo')) {
          images.push(src);
        }
        const alt = $(elem).attr('alt')?.replace(/\s+/g, ' ').trim();
        if (alt && alt.length > 20 && !paragraphs.includes(alt)) {
          paragraphs.push(`[Nội dung ảnh/đồ họa]: ${alt}`);
        }
      });

      // Collect related topic headlines if article body is short
      if (paragraphs.length <= 2) {
        $('.list-news li a, .list_link a, [data-campaign="Box-Related"] a').each((_: any, elem: any) => {
          const linkText = $(elem).text().replace(/\s+/g, ' ').trim();
          if (linkText.length > 25 && !paragraphs.includes(linkText)) {
            paragraphs.push(`[Tin liên quan]: ${linkText}`);
          }
        });
      }

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
