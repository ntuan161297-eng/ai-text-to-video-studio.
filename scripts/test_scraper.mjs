import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchArticle(url) {
  console.log(`\n================== Fetching: ${url} ==================`);
  let res;
  try {
    res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
      },
      timeout: 10000,
      validateStatus: () => true
    });
  } catch (err) {
    console.log('Direct request error:', err.message);
    res = { status: 500, data: '' };
  }

  const isCookieChallenge = typeof res.data === 'string' && res.data.includes('document.cookie=');
  if (res.status === 403 || res.status === 401 || isCookieChallenge || (typeof res.data === 'string' && res.data.length < 500)) {
    console.log(`Status is ${res.status} or challenge detected. Retrying with Googlebot crawler UA...`);
    let cookieHeader = '';
    if (isCookieChallenge) {
      const match = res.data.match(/document\.cookie\s*=\s*"([^";]+)/);
      if (match) {
        cookieHeader = match[1];
        console.log('Extracted challenge cookie:', cookieHeader);
      }
    }

    res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      },
      timeout: 12000,
      validateStatus: () => true
    });
  }

  console.log(`Final Response status: ${res.status}, length: ${res.data?.length}`);
  const $ = cheerio.load(res.data);

  let title = $('meta[property="og:title"]').attr('content') ||
              $('meta[name="twitter:title"]').attr('content') ||
              $('h1.title-detail').first().text().trim() ||
              $('h1').first().text().trim() ||
              '';

  const summary = $('meta[property="og:description"]').attr('content') ||
                  $('meta[name="description"]').attr('content') ||
                  $('.sapo').first().text().trim() ||
                  '';

  // Photo stories often put text in captions, .photo-desc, .desc, p
  const paragraphs = [];
  if (summary) paragraphs.push(summary);

  $('p, .photo-desc, .desc, figcaption').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt.length > 25 && !paragraphs.includes(txt) && !txt.includes('Bản quyền') && !txt.includes('Tòa soạn')) {
      paragraphs.push(txt);
    }
  });

  const images = [];
  $('img').each((_, el) => {
    let src = $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('data-lazy-src') || $(el).attr('src') || '';
    if (src.startsWith('//')) src = 'https:' + src;
    if (src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('.svg') && !src.includes('avatar') && !images.includes(src)) {
      images.push(src);
    }
  });

  console.log('Title:', title);
  console.log('Summary:', summary);
  console.log('Paragraphs found:', paragraphs.length);
  console.log('First paragraph:', paragraphs[0]);
  console.log('Images found:', images.length);
  console.log('First 3 images:', images.slice(0, 3));
}

async function main() {
  await fetchArticle('https://vov.vn/van-hoa/cau-ngoi-chua-luong-cay-cau-di-san-kien-truc-doc-dao-hon-500-tuoi-o-ninh-binh-post1288345.vov');
  await fetchArticle('https://laodong.vn/photo/chiem-nguong-cay-cau-ngoi-dang-rong-tren-500-nam-tuoi-o-nam-dinh-1186189.ldo');
}

main();
