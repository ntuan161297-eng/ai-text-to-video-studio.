import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ProductDetails {
  isEcommerce: boolean;
  name: string;
  brand?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  rating?: string;
  imageUrl?: string;
  description: string;
  keyFeatures: string[];
  affiliateUrl: string;
  callToAction: string;
  suggestedPrompt: string;
}

export class EcommerceExtractor {
  static isEcommerceUrl(url: string): boolean {
    return /shopee\.(vn|com|ph|sg)|s\.shopee|tiktok\.com|lazada|tiki\.vn/i.test(url);
  }

  async extract(rawUrl: string): Promise<ProductDetails> {
    console.log(`🛒 [EcommerceExtractor] Đang phân tích link sản phẩm Thương Mại Điện Tử: ${rawUrl}`);

    let targetUrl = rawUrl.trim();
    let html = '';
    let finalUrl = targetUrl;

    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 12000,
        maxRedirects: 5,
      });

      html = response.data;
      if (response.request?.res?.responseUrl) {
        finalUrl = response.request.res.responseUrl;
      }
    } catch (err: any) {
      console.warn(`⚠️ [EcommerceExtractor] Lỗi tải HTML trực tiếp (${err.message}). Sử dụng phân tích URL fallback...`);
    }

    const $ = cheerio.load(html || '');

    // 1. Trích xuất tên sản phẩm
    let name =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      '';

    // Làm sạch tên sản phẩm từ Shopee / Lazada
    name = name
      .replace(/\|?\s*Shopee\s*(Việt Nam|VN)?.*$/i, '')
      .replace(/\|?\s*Lazada\s*(VN|Việt Nam)?.*$/i, '')
      .replace(/\|?\s*Tiki.*$/i, '')
      .replace(/^Mua\s+/i, '')
      .replace(/\s*giá tốt\s*/i, ' ')
      .trim();

    // Nếu tên vẫn rỗng hoặc quá ngắn, trích xuất từ URL slug của Shopee
    if (!name || name.length < 5) {
      try {
        const parsed = new URL(finalUrl);
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const slug = pathSegments.find((p) => p.includes('-') && !p.startsWith('product'));
        if (slug) {
          name = decodeURIComponent(slug.replace(/-i\.\d+\.\d+$/, '').replace(/-/g, ' '));
        }
      } catch {}
    }

    if (!name) {
      name = 'Sản phẩm Hot TikTok Affiliate';
    }

    // 2. Trích xuất hình ảnh sản phẩm
    let imageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      '';

    // 3. Trích xuất mô tả / thông tin giá / rating từ OpenGraph & JSON-LD
    let description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    let price = '';
    let discount = '';
    let rating = '4.9 ★';

    // Kiểm tra JSON-LD schema Product
    $('script[type="application/ld+json"]').each((_, elem) => {
      try {
        const text = $(elem).html() || '';
        const data = JSON.parse(text);
        if (data['@type'] === 'Product' || data.name) {
          if (!name || name === 'Sản phẩm Hot TikTok Affiliate') {
            name = data.name || name;
          }
          if (data.image) {
            imageUrl = Array.isArray(data.image) ? data.image[0] : data.image;
          }
          if (data.offers) {
            const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
            if (offer.price) {
              const formattedPrice = Number(offer.price).toLocaleString('vi-VN');
              price = `${formattedPrice}đ`;
            }
          }
          if (data.aggregateRating?.ratingValue) {
            rating = `${data.aggregateRating.ratingValue} ★`;
          }
        }
      } catch {}
    });

    // Trích xuất giá và giảm giá từ mô tả nếu có
    const priceMatch = description.match(/(?:chỉ|giá|từ|ưu đãi)?\s*([0-9.,]+)\s*(?:đ|vnđ|vnd)/i);
    if (!price && priceMatch) {
      price = `${priceMatch[1]}đ`;
    }

    const discountMatch = description.match(/(?:giảm|sale|off)\s*(\d+%\+?)/i);
    if (discountMatch) {
      discount = `GIẢM ${discountMatch[1]}`;
    } else {
      discount = 'GIẢM ĐẾN 45%';
    }

    // Tạo các đặc điểm nổi bật (Key Features) cho Affiliate Review
    const keyFeatures = [
      'Thiết kế thông minh, hoàn thiện tỉ mỉ và độ bền vượt trội',
      'Tính năng hiện đại, giải quyết triệt để nhu cầu người dùng hàng ngày',
      'Đánh giá siêu cao 4.9 sao từ hàng ngàn khách hàng đã mua',
      'Ưu đãi độc quyền hôm nay: Tặng kèm quà & Freeship tận tay',
      'Số lượng có hạn, bấm ngay vào giỏ hàng góc trái hoặc link bio',
    ];

    const callToAction = '👉 BẤM VÀO GIỎ HÀNG GÓC TRÁI HOẶC LINK DƯỚI ĐỂ NHẬN ƯU ĐÃI!';

    const suggestedPrompt = `Tạo video TikTok Affiliate 45s giới thiệu siêu phẩm "${name}": Nêu bật điểm đắt giá giải quyết vấn đề, trải nghiệm thực tế độ bền cao cấp, thông báo ưu đãi ${discount} và kêu gọi người xem chốt đơn ngay qua giỏ hàng/link bio.`;

    console.log(`✅ [EcommerceExtractor] Đã phân tích xong sản phẩm: "${name}" | Giá: ${price || 'Ưu đãi'} | Ảnh: ${imageUrl ? 'Có' : 'Không'}`);

    return {
      isEcommerce: true,
      name,
      price: price || 'GIÁ CỰC TỐT',
      discount,
      rating,
      imageUrl: imageUrl || undefined,
      description: description || `Siêu phẩm ${name} đang làm mưa làm gió trên thị trường với mức giá ưu đãi cực hấp dẫn.`,
      keyFeatures,
      affiliateUrl: rawUrl,
      callToAction,
      suggestedPrompt,
    };
  }
}
