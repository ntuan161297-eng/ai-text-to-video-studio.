import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PollinationsVisualProvider } from '../providers/visual/pollinationsVisual.js';
import { generateContextualGraphicSvg } from './contextualGraphicGenerator.js';

// Curated verified high-resolution realistic vertical stock photos (Unsplash CDN)
const REALISTIC_PHOTO_LIBRARIES: Record<string, string[]> = {
  vehicle: [
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=720&q=80', // Sleek modern high-tech electric car
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=720&q=80', // Modern car interior steering wheel and touch screen
    'https://images.unsplash.com/photo-1563720223185-11003d516935?w=720&q=80', // Electric vehicle charging station
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=720&q=80', // Premium compact sports car exterior
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=720&q=80', // Dynamic driving on open scenic road
    'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=720&q=80', // Modern alloy wheels & chassis detail
  ],
  food: [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=720&q=80', // Artisanal confectionery and traditional sweet delicacies
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=720&q=80', // Traditional Vietnamese noodle & herb culinary spread
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=720&q=80', // Crispy baked snack with golden sugar glaze
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=720&q=80', // Golden honey syrup drizzle and roasted peanuts
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=720&q=80', // Authentic local food delicacy
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=720&q=80', // Traditional tea and sweet confectionery tasting
  ],
  travel: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=720&q=80', // Tropical emerald beach & coastline
    'https://images.unsplash.com/photo-1528127269322-539801943592?w=720&q=80', // Majestic Vietnamese landscape Ha Long Bay
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=720&q=80', // Scenic mountain valley and lake
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=720&q=80', // Vibrant ancient town & historical lantern street
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=720&q=80', // Serene lake boat travel
  ],
  sports: [
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=720&q=80', // Stadium at night under bright floodlights
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=720&q=80', // Player action match duel
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=720&q=80', // Football on green pitch close-up
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=720&q=80', // Passionate cheering fans in stadium
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=720&q=80', // Tactical football stadium perspective
    'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=720&q=80', // Championship golden trophy
  ],
  ai: [
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=720&q=80', // Futuristic humanoid AI robot
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=720&q=80', // Glowing neural network digital mesh
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=720&q=80', // Modern creative office analytics
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=720&q=80', // Tech team collaborating with laptops
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=720&q=80', // High-tech financial data chart screen
  ],
  animation: [
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=720&q=80', // 3D Pixar vibrant neon art
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=720&q=80', // 3D stylized cute digital character
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=720&q=80', // 3D fantasy dream world
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=720&q=80', // 3D magical cosmos landscape
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=720&q=80', // 3D colorful retro gaming aesthetic
  ],
  bright: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=720&q=80', // Bright tropical ocean beach and golden sunlight
    'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=720&q=80', // Lush sunny green meadow and blue sky
    'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=720&q=80', // Vibrant blossoming flowers in morning sun
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=720&q=80', // Clear blue sky with historical architectural tower
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=720&q=80', // Modern bright cityscape under shining sun
  ],
  ecommerce: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=720&q=80', // Sleek premium product on pedestal
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=720&q=80', // Clean lifestyle product display
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=720&q=80', // Modern gadget unboxing
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=720&q=80', // Trendy product commercial presentation
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=720&q=80', // Premium studio lighting product
  ],
  news: [
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=720&q=80', // News media studio camera
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=720&q=80', // Global newspapers and journalism
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=720&q=80', // Planet earth illuminated data connections
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=720&q=80', // Metropolis modern skyscraper towers
  ],
};

/**
 * Tải hoặc gán hình ảnh thực tế chất lượng cao cho từng phân cảnh
 */
export async function downloadRealisticVisuals(
  topic: string,
  sceneCount: number,
  outputDir: string,
  productImageUrl?: string,
  articleImages?: string[],
  visualStyle?: string,
  explicitCategory?: string,
  jobId?: string,
  productVideoUrl?: string
): Promise<{ visuals: string[]; productVisual?: string; productVideo?: string }> {
  const isAnimation = visualStyle === 'animation' || /(hoạt hình|cartoon|3d anime|pixar|3d animation|hoạ hình)/i.test(topic);
  const isBright = visualStyle === 'bright' || /(tươi sáng|nắng|rực rỡ|bình minh|buổi sáng|pastel|tươi vui)/i.test(topic);
  const isVehicle =
    explicitCategory === 'vehicle' ||
    explicitCategory === 'real_product' ||
    /(xe\s*máy|xe\s*hơi|vinfast|ô tô|oto|xe điện|motor|honda|toyota|hyundai|kia|mercedes|bmw|porsche|tesla|dat\s*bike|evo\s*200|vf3|vf 3|vf7|vf8|vf9|\bxe\b)/i.test(
      topic
    );

  const isFood =
    explicitCategory === 'food' ||
    explicitCategory === 'culinary' ||
    /(kẹo|bánh|ẩm thực|đặc sản|món ăn|thức ăn|đồ uống|cà phê|trà|quán|nhà hàng|nấu ăn|món ngon|cu đơ|phở|bún|bánh mì|nem|chả|chè|mật mía|đậu phộng|lạc|bánh tráng)/i.test(
      topic
    );

  const isTravel =
    !isVehicle &&
    !isFood &&
    (explicitCategory === 'travel' ||
      explicitCategory === 'real_location' ||
      /(du lịch|khám phá|địa danh|thắng cảnh|non nước|bãi biển|vịnh|đảo|chùa|nhà thờ|khu nghỉ dưỡng|resort|tỉnh|thành phố|đà lạt|đà nẵng|phú quốc|hạ long|nha trang|sapa|vũng tàu|huế|hà nội|sài gòn|quảng bình|quảng ninh|ninh bình|mộc châu|an giang|đồng văn|hà giang)/i.test(
        topic
      ));

  const isSports =
    explicitCategory === 'sports' ||
    /(bóng đá|asean cup|fifa|v-league|ngoại hạng anh|world cup|cúp c1|bàn thắng|sân cỏ|tuyển bóng đá|cầu thủ bóng đá)/i.test(
      topic
    );

  const isAiTech =
    explicitCategory === 'ai' ||
    explicitCategory === 'technology' ||
    /(trí tuệ nhân tạo|công nghệ|dữ liệu|software|lập trình|chatgpt|iphone|smartphone|laptop|macbook|bán dẫn|semiconductor|chip)/i.test(
      topic
    );

  const isEcommerce =
    Boolean(productImageUrl) ||
    Boolean(productVideoUrl) ||
    /shopee|lazada|tiki|affiliate|giỏ hàng|đặt hàng ngay/i.test(topic);

  const category = isAnimation
    ? 'animation'
    : isBright
    ? 'bright'
    : isFood
    ? 'food'
    : isVehicle
    ? 'vehicle'
    : isTravel
    ? 'travel'
    : isAiTech
    ? 'ai'
    : isSports
    ? 'sports'
    : isEcommerce
    ? 'ecommerce'
    : 'news';

  const pool = REALISTIC_PHOTO_LIBRARIES[category] || REALISTIC_PHOTO_LIBRARIES.food || REALISTIC_PHOTO_LIBRARIES.news;

  const prefix = jobId ? `${jobId.replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
  let productVisualFileName: string | undefined = undefined;
  let productVideoFileName: string | undefined = undefined;

  // 1. Tải video review sản phẩm nếu có (tắt âm thanh khi render vào video)
  if (productVideoUrl && /^https?:\/\//i.test(productVideoUrl)) {
    try {
      console.log(`🎥 [RealisticVisual] Đang tải video review sản phẩm từ ${productVideoUrl}...`);
      const vidResp = await axios.get(productVideoUrl, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      const vidFileName = `${prefix}visual_product_video.mp4`;
      fs.writeFileSync(path.join(outputDir, vidFileName), Buffer.from(vidResp.data));
      productVideoFileName = vidFileName;
      console.log(`✅ [RealisticVisual] Đã lưu video review sản phẩm: ${vidFileName}`);
    } catch (vErr: any) {
      console.warn(`⚠️ [RealisticVisual] Không thể tải video review sản phẩm:`, vErr.message);
    }
  }

  // 2. Nếu có ảnh sản phẩm từ Shopee / Ecommerce, ưu tiên tải về
  if (productImageUrl && /^https?:\/\//i.test(productImageUrl)) {
    try {
      console.log(`🛍️ [RealisticVisual] Đang tải ảnh gốc sản phẩm từ sàn TMĐT...`);
      const prodResp = await axios.get(productImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      const prodFileName = `${prefix}visual_product.jpg`;
      fs.writeFileSync(path.join(outputDir, prodFileName), Buffer.from(prodResp.data));
      productVisualFileName = prodFileName;
      console.log(`✅ [RealisticVisual] Đã lưu ảnh sản phẩm: ${prodFileName}`);
    } catch (err: any) {
      console.warn(`⚠️ [RealisticVisual] Không thể tải ảnh sản phẩm (${err.message}).`);
    }
  }

  // 3. Tải danh sách toàn bộ ảnh thực tế từ bài viết hoặc bài đăng sản phẩm
  const downloadedArticleFiles: string[] = [];
  const seenBufferSizes = new Set<number>();

  if (articleImages && articleImages.length > 0) {
    for (let j = 0; j < articleImages.length; j++) {
      const artUrl = articleImages[j];
      if (!/^https?:\/\//i.test(artUrl) || artUrl.endsWith('.svg') || artUrl.includes('.svg?')) continue;
      try {
        const artResp = await axios.get(artUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          },
        });
        const buf = Buffer.from(artResp.data);
        if (buf.length < 2000) continue; // Bỏ qua icon hoặc tracking pixels nhỏ
        if (seenBufferSizes.has(buf.length)) continue; // Bỏ qua ảnh trùng kích thước
        seenBufferSizes.add(buf.length);

        const artFileName = `${prefix}visual_article_${downloadedArticleFiles.length + 1}.jpg`;
        fs.writeFileSync(path.join(outputDir, artFileName), buf);
        downloadedArticleFiles.push(artFileName);
        console.log(`📰 [RealisticVisual] Đã tải ảnh thực tế bài viết/sản phẩm (${downloadedArticleFiles.length}): ${artFileName}`);
      } catch (e: any) {
        console.warn(`⚠️ [RealisticVisual] Không thể tải ảnh ${artUrl}:`, e.message);
      }
    }
  }

  // Section C: Real-Asset-First - Bổ sung thêm ảnh nếu bài viết có ít hơn số lượng phân cảnh
  if (downloadedArticleFiles.length < sceneCount && !isAnimation) {
    const firstLine = topic.split(/\r?\n/)[0].trim();
    let cleanEntityQuery = firstLine
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/^\[.*?\]\s*/g, '')
      .replace(/^(?:tạo video|video|hãy làm video|làm video|về|cho|giới thiệu về|giới thiệu|chia sẻ về|nói về|tìm hiểu về|khám phá về)\s*(?:\d+s|\d+\s*giây)?[:\s]*/gi, '')
      .split(/[:–—\-\.\,\n]/)[0] // Chỉ lấy tên thực thể chính trước dấu gạch nối, dấu hai chấm, dấu chấm
      .replace(/\b(official photo|chất lượng cao|video ngắn|tiktok|bỏ tiêu đề|có hình ảnh|câu kết|kêu gọi|món ăn đặc sản.*)\b/gi, '')
      .trim();

    while (/^(?:về|cho|giới thiệu về|giới thiệu|đặc sản món|món ăn đặc sản|món ăn|món)\s+/i.test(cleanEntityQuery)) {
      cleanEntityQuery = cleanEntityQuery.replace(/^(?:về|cho|giới thiệu về|giới thiệu|đặc sản món|món ăn đặc sản|món ăn|món)\s+/i, '').trim();
    }

    if (!cleanEntityQuery || cleanEntityQuery.length < 3) {
      cleanEntityQuery = firstLine.slice(0, 35).trim();
    }

    const FORBIDDEN_FOOD_PATTERNS = [
      /sinh[-_]?nhat/i,
      /birthday/i,
      /trung[-_]?thu/i,
      /mooncake/i,
      /banh[-_]?chung/i,
      /banh[-_]?tet/i,
      /dam[-_]?cuoi/i,
      /wedding/i,
      /kem[-_]?tuoi/i,
      /cake[-_]?topper/i,
      /party[-_]?cake/i,
      /cupcake/i,
    ];

    const getAccurateCulinaryPrompt = (query: string): string => {
      const q = query.toLowerCase();
      if (q.includes('xíu páo') || q.includes('xiu pao')) {
        return 'Authentic Vietnamese Chiu Pao pastry bun (Bánh xíu páo Nam Định), golden brown flaky crust, savory minced char siu meat and quail egg filling, traditional street food photography, warm ambient lighting, rustic plate, close-up, no birthday cake, no mooncake, no candles, no frosting, no cream, 8k resolution';
      }
      if (q.includes('nem nắm') || q.includes('nem nam')) {
        return 'Authentic Vietnamese Giao Thuy Nem Nam savory pork roll wrapped in fig leaves, traditional food photography, rustic wooden table, no cake, no sweet, 8k';
      }
      if (q.includes('bánh nhãn') || q.includes('banh nhan')) {
        return 'Vietnamese traditional golden egg ball cookies (Bánh nhãn Hải Hậu), small golden round crisp cookies in ceramic bowl, no birthday cake, 8k';
      }
      if (q.includes('phở') || q.includes('pho')) {
        return 'Authentic Vietnamese traditional hot Pho noodle soup bowl, steaming fragrant broth, fresh herbs and beef, culinary photography, 8k';
      }
      return `${query}, authentic traditional Vietnamese culinary food specialty, savory street food photography, warm lighting, rustic plating, no birthday cake, no candles, no frosting, no sweet dessert cake, no mooncake, no sticky rice cake, 8k resolution`;
    };

    try {
      const searchKeywords = isFood && (cleanEntityQuery.toLowerCase().includes('xíu páo') || cleanEntityQuery.toLowerCase().includes('xiu pao'))
        ? 'bánh xíu páo Nam Định ẩm thực đặc sản'
        : cleanEntityQuery;

      console.log(`🔍 [RealisticVisual] Tìm kiếm ảnh thực tế xác thực cho thực thể: "${searchKeywords}"...`);
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchKeywords)}&form=HDRSC2`;
      const imgSearchResp = await axios.get(searchUrl, {
        timeout: 9000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      const matches = [...imgSearchResp.data.matchAll(/murl&quot;:&quot;(https?:[^&]+)&quot;/g)]
        .map((m) => m[1])
        .filter((u) => {
          if (u.endsWith('.svg') || u.includes('.svg?')) return false;
          if (isFood && FORBIDDEN_FOOD_PATTERNS.some((p) => p.test(u))) {
            return false;
          }
          return true;
        });

      for (let k = 0; k < matches.length && downloadedArticleFiles.length < sceneCount; k++) {
        const directUrl = matches[k];
        try {
          const directResp = await axios.get(directUrl, {
            responseType: 'arraybuffer',
            timeout: 7000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });

          if (directResp.data && directResp.data.length > 15000) {
            const entFileName = `${prefix}visual_entity_${downloadedArticleFiles.length + 1}.jpg`;
            fs.writeFileSync(path.join(outputDir, entFileName), Buffer.from(directResp.data));
            downloadedArticleFiles.push(entFileName);
            console.log(`✨ [RealisticVisual] Đã tải ảnh thực tế xác thực của thực thể (${downloadedArticleFiles.length}/${sceneCount}): ${entFileName}`);
          }
        } catch {
          // ignore individual fetch errors
        }
      }
    } catch (searchErr: any) {
      console.warn(`⚠️ [RealisticVisual] Lỗi tìm kiếm ảnh thực thể: ${searchErr.message}`);
    }

    // Nếu web search vẫn chưa đủ ảnh thực tế, kích hoạt Pollinations AI Visual Provider để sinh ảnh chính xác theo thực thể
    if (downloadedArticleFiles.length < sceneCount) {
      console.log(`🎨 [RealisticVisual] Cần thêm ${sceneCount - downloadedArticleFiles.length} ảnh thực tế. Kích hoạt Pollinations AI Visual cho thực thể "${cleanEntityQuery}"...`);
      const pollinations = new PollinationsVisualProvider();
      const neededCount = sceneCount - downloadedArticleFiles.length;

      for (let m = 0; m < neededCount; m++) {
        const aiFileName = `${prefix}visual_ai_entity_${downloadedArticleFiles.length + 1}.jpg`;
        const aiFilePath = path.join(outputDir, aiFileName);

        const promptAngle = isFood
          ? getAccurateCulinaryPrompt(cleanEntityQuery)
          : `${cleanEntityQuery}, cinematic realistic photo, 9:16 vertical orientation, authentic documentary style, high resolution, 8k`;

        try {
          await pollinations.generateVisual(promptAngle, aiFilePath, downloadedArticleFiles.length);
          if (fs.existsSync(aiFilePath) && fs.statSync(aiFilePath).size > 1000) {
            downloadedArticleFiles.push(aiFileName);
            console.log(`✨ [RealisticVisual] Đã sinh ảnh AI chân thực theo thực thể (${downloadedArticleFiles.length}/${sceneCount}): ${aiFileName}`);
          }
        } catch (pErr: any) {
          console.warn(`⚠️ [RealisticVisual] Không thể tạo ảnh Pollinations cho scene ${m + 1}: ${pErr.message}`);
        }
      }
    }
  }

  const resultFiles: string[] = [];

  for (let i = 0; i < sceneCount; i++) {
    const fileName = `${prefix}visual_scene_${i + 1}.jpg`;
    const targetFilePath = path.join(outputDir, fileName);

    // 1. Nếu có video review sản phẩm: gán vào phân cảnh trải nghiệm thực tế (Cảnh 2)
    if (productVideoFileName && (i === 1 || (sceneCount >= 5 && i === 2))) {
      const vidSceneName = `${prefix}visual_scene_${i + 1}.mp4`;
      const vidTargetPath = path.join(outputDir, vidSceneName);
      try {
        fs.copyFileSync(path.join(outputDir, productVideoFileName), vidTargetPath);
        resultFiles.push(vidSceneName);
        console.log(`🎥 [RealisticVisual] Cảnh ${i + 1} kế thừa video review sản phẩm: ${vidSceneName}`);
        continue;
      } catch (err: any) {
        console.warn(`[RealisticVisual] Không thể sao chép video cảnh ${i + 1}:`, err.message);
      }
    }

    // 2. Kế thừa TOÀN BỘ ảnh thật của bài viết/sản phẩm:
    // Tuần hoàn từng ảnh thật vào từng cảnh để toàn bộ video luôn bám sát thực thể chính xác
    if (downloadedArticleFiles.length > 0) {
      const artFile = downloadedArticleFiles[i % downloadedArticleFiles.length];
      try {
        fs.copyFileSync(path.join(outputDir, artFile), targetFilePath);
        resultFiles.push(fileName);
        console.log(`🖼️ [RealisticVisual] Cảnh ${i + 1} kế thừa ảnh thực tế: ${artFile}`);
        continue;
      } catch {}
    }

    // 3. Nếu có ảnh sản phẩm đơn lẻ (productVisualFileName)
    if (productVisualFileName) {
      try {
        fs.copyFileSync(path.join(outputDir, productVisualFileName), targetFilePath);
        resultFiles.push(fileName);
        console.log(`🛍️ [RealisticVisual] Cảnh ${i + 1} dùng ảnh sản phẩm chính: ${productVisualFileName}`);
        continue;
      } catch {}
    }

    // 4. Nếu bài viết không đủ ảnh (ví dụ tin tức bài viết 2 ảnh nhưng video 6-10 cảnh):
    // Tạo đồ họa tượng trưng (Contextual Graphic Card) chuẩn chuyên nghiệp bám sát thực thể & phân cảnh
    const entityLabel = topic.split(/\r?\n/)[0].replace(/https?:\/\/\S+/g, '').replace(/\[.*?\]/g, '').trim().slice(0, 35) || 'DI SẢN & VĂN HÓA';
    const graphicFileName = `${prefix}visual_graphic_scene_${i + 1}.svg`;
    const graphicFilePath = path.join(outputDir, graphicFileName);

    try {
      generateContextualGraphicSvg({
        title: `${entityLabel}`,
        subtitle: `Phân cảnh #${i + 1} • Khám phá nét đẹp độc đáo và giá trị lịch sử`,
        metric: `ĐIỂM NHẤN #${i + 1}`,
        topic: entityLabel,
        category: 'THÔNG TIN NỔI BẬT',
        outputPath: graphicFilePath,
        aspectRatio: 'landscape',
      });

      if (fs.existsSync(graphicFilePath)) {
        resultFiles.push(graphicFileName);
        continue;
      }
    } catch (gErr: any) {
      console.warn(`[RealisticVisual] Không thể tạo đồ họa tượng trưng scene ${i + 1}:`, gErr.message);
      if (resultFiles.length > 0) {
        try {
          fs.copyFileSync(path.join(outputDir, resultFiles[0]), targetFilePath);
          resultFiles.push(fileName);
        } catch {
          resultFiles.push('');
        }
      } else {
        resultFiles.push('');
      }
    }
  }

  return { visuals: resultFiles, productVisual: productVisualFileName, productVideo: productVideoFileName };
}
