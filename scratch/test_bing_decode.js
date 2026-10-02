import axios from 'axios';
import * as cheerio from 'cheerio';

export async function searchBingReal(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=vi`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(res.data);
  const results = [];

  $('li.b_algo').each((_, el) => {
    const title = $(el).find('h2 a').text().trim();
    const href = $(el).find('h2 a').attr('href') || '';
    const snippet = $(el).find('.b_caption p').text().trim();

    let realUrl = href;
    if (href.includes('bing.com/ck/a') && href.includes('u=')) {
      const match = href.match(/[?&]u=a1([^&]+)/);
      if (match) {
        try {
          let b64 = match[1];
          // standard base64 padding
          while (b64.length % 4 !== 0) b64 += '=';
          realUrl = Buffer.from(b64, 'base64').toString('utf-8');
        } catch {}
      }
    }

    if (realUrl.startsWith('http') && !results.some(r => r.url === realUrl)) {
      results.push({ title, snippet, url: realUrl });
    }
  });

  return results;
}

async function run() {
  const q = 'DatBike Weaver++ chính thức';
  const list = await searchBingReal(q);
  console.log(`Found ${list.length} results for "${q}":`);
  for (const item of list.slice(0, 5)) {
    console.log('-', item.title);
    console.log(' ', item.url);
  }
}

run().catch(console.error);
