import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const query = 'DatBike Weaver++ xe máy điện';
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=vi`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
  });

  const $ = cheerio.load(res.data);
  console.log('Results:');
  $('li.b_algo').each((_, el) => {
    const title = $(el).find('h2 a').text().trim();
    const href = $(el).find('h2 a').attr('href');
    const snippet = $(el).find('.b_caption p').text().trim();
    console.log('-', title, '|', href);
  });
}

test().catch(console.error);
