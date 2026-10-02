import fs from 'fs';
import path from 'path';

export interface ContextualGraphicOptions {
  title: string;
  subtitle?: string;
  metric?: string;
  topic: string;
  category?: string;
  themeColor?: {
    gradient: [string, string];
    accent: string;
    glow: string;
  };
  iconType?: string;
  outputPath: string;
  aspectRatio?: 'landscape' | 'square' | 'portrait';
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Tách văn bản thành nhiều dòng phù hợp hiển thị trong thẻ SVG text
 */
function wrapSvgText(text: string, maxCharsPerLine = 38): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3);
}

/**
 * Phân tích ngữ cảnh nội dung (Title + Subtitle + Topic) để tự động chọn biểu tượng minh họa & bảng màu chính xác
 */
export function detectSemanticContext(text: string): {
  iconType: string;
  category: string;
  themeColor: {
    gradient: [string, string];
    accent: string;
    glow: string;
  };
} {
  const t = text.toLowerCase();

  // 1. PHÁP LUẬT, CÔNG LÝ, TÒA ÁN, TRỪNG PHẠT, QUY ĐỊNH
  if (
    /(luật|pháp luật|công lý|tòa án|xét xử|thẩm phán|cán cân|búa|án phạt|vi phạm|bị cáo|luật sư|nghị định|thông tư|bộ luật|hình sự|dân sự|truy tố|khởi tố|điều tra|công an|tội phạm|phán quyết)/i.test(
      t
    )
  ) {
    return {
      iconType: /búa|thẩm phán|xét xử|phán quyết/i.test(t) ? 'justice_gavel' : 'justice_scales',
      category: 'PHÁP LUẬT & CÔNG LÝ',
      themeColor: {
        gradient: ['#f59e0b', '#fbbf24'],
        accent: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.45)',
      },
    };
  }

  // 2. KINH TẾ, TÀI CHÍNH, ĐÔ LA, TIỀN TỆ, DOANH THU
  if (
    /(kinh tế|tài chính|đô la|usd|tiền|tiền tệ|vnd|ngân hàng|chứng khoán|cổ phiếu|doanh thu|lợi nhuận|thị trường|đầu tư|lãi suất|giá cả|doanh nghiệp|kinh doanh|tỷ phú|ngân sách|bất động sản|tăng trưởng)/i.test(
      t
    )
  ) {
    return {
      iconType: /tăng trưởng|thị trường|chứng khoán|đầu tư/i.test(t) ? 'economy_chart' : 'economy_dollar',
      category: 'KINH TẾ & TÀI CHÍNH',
      themeColor: {
        gradient: ['#10b981', '#34d399'],
        accent: '#34d399',
        glow: 'rgba(52, 211, 153, 0.45)',
      },
    };
  }

  // 3. DI SẢN, LỊCH SỬ, KIẾN TRÚC CỔ, ĐÌNH CHÙA, CẦU NGÓI
  if (
    /(lịch sử|di tích|cổ kính|thế kỷ|truyền thống|văn hóa|chùa|đền|cầu ngói|đình|xưa|triều đại|vua|thành nam|ngàn năm|nguyên vẹn|bảo tồn|thượng gia hạ kiều|chạm khắc|gỗ lim|ngói)/i.test(
      t
    )
  ) {
    return {
      iconType: 'heritage_pagoda',
      category: 'DI SẢN & VĂN HÓA CỔ TRUYỀN',
      themeColor: {
        gradient: ['#f59e0b', '#d97706'],
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.45)',
      },
    };
  }

  // 4. CÔNG NGHỆ, TRÍ TUỆ NHÂN TẠO, PHẦN MỀM, DỮ LIỆU
  if (
    /(công nghệ|trí tuệ nhân tạo|ai|software|dữ liệu|chip|bán dẫn|robot|mạng|thuật toán|lập trình|hệ thống|số hóa|tech|vi mạch|internet)/i.test(
      t
    )
  ) {
    return {
      iconType: 'tech_chip',
      category: 'CÔNG NGHỆ & KHOA HỌC',
      themeColor: {
        gradient: ['#06b6d4', '#3b82f6'],
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.45)',
      },
    };
  }

  // 5. Y TẾ, SỨC KHỎE, DƯỢC PHẨM
  if (
    /(y tế|sức khỏe|bệnh viện|bác sĩ|dược|thuốc|điều trị|vắc xin|dinh dưỡng|phẫu thuật|kháng sinh|tim mạch|chăm sóc)/i.test(
      t
    )
  ) {
    return {
      iconType: 'medical_health',
      category: 'Y TẾ & SỨC KHỎE',
      themeColor: {
        gradient: ['#f43f5e', '#ef4444'],
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.45)',
      },
    };
  }

  // 6. GIÁO DỤC, TRI THỨC, HỌC TẬP
  if (
    /(giáo dục|học sinh|sinh viên|trường|đào tạo|đại học|kiến thức|nghiên cứu|học giả|sách|bằng cấp|thầy cô|khoa cử)/i.test(
      t
    )
  ) {
    return {
      iconType: 'education_book',
      category: 'GIÁO DỤC & TRI THỨC',
      themeColor: {
        gradient: ['#3b82f6', '#6366f1'],
        accent: '#60a5fa',
        glow: 'rgba(96, 165, 250, 0.45)',
      },
    };
  }

  // 7. ẨM THỰC, MÓN ĂN, ĐẶC SẢN
  if (
    /(ẩm thực|món ăn|đặc sản|nấu|hương vị|nhà hàng|thực phẩm|gia vị|bánh|nem|chả|phở|thơm ngon|chế biến|thưởng thức)/i.test(
      t
    )
  ) {
    return {
      iconType: 'culinary_food',
      category: 'ẨM THỰC & ĐẶC SẢN',
      themeColor: {
        gradient: ['#ea580c', '#f97316'],
        accent: '#fb923c',
        glow: 'rgba(251, 146, 60, 0.45)',
      },
    };
  }

  // 8. THỂ THAO, THI ĐẤU, VÔ ĐỊCH
  if (
    /(thể thao|bóng đá|vô địch|giải đấu|trận đấu|cầu thủ|huy chương|cúp|bàn thắng|chiến thắng|thế vận hội|thành tích)/i.test(
      t
    )
  ) {
    return {
      iconType: 'trophy_sports',
      category: 'THỂ THAO & THI ĐẤU',
      themeColor: {
        gradient: ['#eab308', '#ca8a04'],
        accent: '#facc15',
        glow: 'rgba(250, 204, 21, 0.45)',
      },
    };
  }

  // 9. DU LỊCH, THẮNG CẢNH, ĐỊA DANH
  if (
    /(du lịch|khám phá|thắng cảnh|bãi biển|vịnh|đảo|tour|resort|kỳ quan|điểm đến|hành trình|phong cảnh|thiên nhiên)/i.test(
      t
    )
  ) {
    return {
      iconType: 'travel_compass',
      category: 'DU LỊCH & KHÁM PHÁ',
      themeColor: {
        gradient: ['#0d9488', '#14b8a6'],
        accent: '#2dd4bf',
        glow: 'rgba(45, 212, 191, 0.45)',
      },
    };
  }

  // DEFAULT
  return {
    iconType: 'heritage_pagoda',
    category: 'THÔNG TIN NỔI BẬT',
    themeColor: {
      gradient: ['#facc15', '#f59e0b'],
      accent: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.45)',
    },
  };
}

/**
 * Trả về mã SVG vector sắc nét của biểu tượng theo loại
 */
function getVectorSymbolSvg(iconType: string, accentColor: string): string {
  switch (iconType) {
    case 'justice_scales':
      // Cán cân công lý (Scales of Justice)
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <!-- Cột trụ trung tâm & Đế trụ -->
          <line x1="0" y1="-38" x2="0" y2="40" stroke-width="4.5" stroke-linecap="round" />
          <path d="M-22 40 L22 40 M-14 46 L14 46" stroke-width="4" stroke-linecap="round" />
          <!-- Đỉnh trụ -->
          <circle cx="0" cy="-40" r="5" fill="${accentColor}" />
          <!-- Thanh đòn ngang cân bằng -->
          <line x1="-42" y1="-28" x2="42" y2="-28" stroke-width="5" stroke-linecap="round" />
          <!-- Đĩa cân bên trái -->
          <line x1="-38" y1="-28" x2="-48" y2="6" stroke-width="2.5" />
          <line x1="-38" y1="-28" x2="-28" y2="6" stroke-width="2.5" />
          <path d="M-52 6 Q-38 22 -24 6 Z" fill="${accentColor}" opacity="0.9" />
          <!-- Đĩa cân bên phải -->
          <line x1="38" y1="-28" x2="28" y2="6" stroke-width="2.5" />
          <line x1="38" y1="-28" x2="48" y2="6" stroke-width="2.5" />
          <path d="M24 6 Q38 22 52 6 Z" fill="${accentColor}" opacity="0.9" />
        </g>
      `;

    case 'justice_gavel':
      // Búa thẩm phán (Gavel of Justice)
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <!-- Đế búa gỗ (Sounding Block) -->
          <ellipse cx="0" cy="38" rx="36" ry="10" fill="${accentColor}" opacity="0.5" />
          <rect x="-26" y="30" width="52" height="8" rx="3" stroke-width="1.5" />
          <!-- Búa nghiêng 30 độ sẵn sàng gõ phán quyết -->
          <g transform="rotate(-30 0 0)">
            <rect x="-4" y="-20" width="8" height="52" rx="4" stroke-width="2" />
            <!-- Đầu búa đối xứng -->
            <rect x="-24" y="-30" width="48" height="20" rx="4" stroke-width="2" />
            <line x1="-28" y1="-32" x2="-28" y2="-8" stroke-width="3" stroke-linecap="round" />
            <line x1="28" y1="-32" x2="28" y2="-8" stroke-width="3" stroke-linecap="round" />
          </g>
        </g>
      `;

    case 'economy_dollar':
      // Biểu tượng Đô la ($) & Đồng tiền vàng
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <!-- Đồng xu vàng lớn -->
          <circle cx="0" cy="0" r="42" fill="none" stroke-width="4.5" />
          <circle cx="0" cy="0" r="35" fill="none" stroke-width="1.8" stroke-dasharray="5 3" opacity="0.75" />
          <!-- Ký hiệu Đô la $ nổi bật -->
          <line x1="0" y1="-30" x2="0" y2="30" stroke-width="6" stroke-linecap="round" />
          <path d="M-8 -15 C-8 -23 10 -23 10 -11 C10 0 -10 -2 -10 11 C-10 23 8 23 8 15" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Ngôi sao phát tài -->
          <circle cx="34" cy="-28" r="3.5" />
          <circle cx="-34" cy="28" r="3" />
        </g>
      `;

    case 'economy_chart':
      // Biểu đồ tăng trưởng tài chính
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <!-- Trục tọa độ -->
          <path d="M-38 38 L38 38 M-38 38 L-38 -36" fill="none" stroke-width="4" stroke-linecap="round" />
          <!-- Các cột doanh thu tăng dần -->
          <rect x="-28" y="8" width="12" height="28" rx="2" fill="${accentColor}" opacity="0.5" />
          <rect x="-8" y="-10" width="12" height="46" rx="2" fill="${accentColor}" opacity="0.75" />
          <rect x="12" y="-28" width="12" height="64" rx="2" fill="${accentColor}" />
          <!-- Mũi tên tăng trưởng vượt bậc -->
          <path d="M-34 16 L-8 -4 L14 4 L36 -32 M24 -32 L36 -32 L36 -20" fill="none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;

    case 'heritage_pagoda':
      // Mái đình chùa & Cầu ngói di sản lịch sử
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <!-- Mái ngói trên uốn cong mũi thuyền -->
          <path d="M-44 -12 Q0 -34 44 -12 Q38 -20 28 -20 Q0 -34 -28 -20 Q-38 -20 -44 -12 Z" />
          <!-- Mái hiên tầng 2 -->
          <path d="M-36 6 Q0 -12 36 6 Q30 -2 22 -2 Q0 -14 -22 -2 Q-30 -2 -36 6 Z" opacity="0.85" />
          <!-- Trụ gỗ cổ truyền -->
          <rect x="-24" y="6" width="6" height="28" rx="1.5" />
          <rect x="-3" y="6" width="6" height="28" rx="1.5" />
          <rect x="18" y="6" width="6" height="28" rx="1.5" />
          <!-- Thân cầu uốn lượn vượt sông -->
          <path d="M-42 34 Q0 24 42 34 L42 40 Q0 30 -42 40 Z" />
          <!-- Làn sóng nước dòng sông phía dưới -->
          <path d="M-36 44 Q-18 40 0 44 Q18 48 36 44" fill="none" stroke-width="2.5" stroke-linecap="round" opacity="0.65" />
        </g>
      `;

    case 'tech_chip':
      // Vi mạch bán dẫn AI & Công nghệ
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <rect x="-24" y="-24" width="48" height="48" rx="8" fill="none" stroke-width="4.5" />
          <circle cx="0" cy="0" r="12" fill="${accentColor}" />
          <!-- Chân chip điện tử xung quanh -->
          <line x1="-14" y1="-36" x2="-14" y2="-24" stroke-width="3" stroke-linecap="round" />
          <line x1="0" y1="-36" x2="0" y2="-24" stroke-width="3" stroke-linecap="round" />
          <line x1="14" y1="-36" x2="14" y2="-24" stroke-width="3" stroke-linecap="round" />
          <line x1="-14" y1="24" x2="-14" y2="36" stroke-width="3" stroke-linecap="round" />
          <line x1="0" y1="24" x2="0" y2="36" stroke-width="3" stroke-linecap="round" />
          <line x1="14" y1="24" x2="14" y2="36" stroke-width="3" stroke-linecap="round" />
          <line x1="-36" y1="-14" x2="-24" y2="-14" stroke-width="3" stroke-linecap="round" />
          <line x1="-36" y1="0" x2="-24" y2="0" stroke-width="3" stroke-linecap="round" />
          <line x1="-36" y1="14" x2="-24" y2="14" stroke-width="3" stroke-linecap="round" />
          <line x1="24" y1="-14" x2="36" y2="-14" stroke-width="3" stroke-linecap="round" />
          <line x1="24" y1="0" x2="36" y2="0" stroke-width="3" stroke-linecap="round" />
          <line x1="24" y1="14" x2="36" y2="14" stroke-width="3" stroke-linecap="round" />
        </g>
      `;

    case 'medical_health':
      // Y tế & Sức khỏe (Trái tim & Nhịp đập)
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <path d="M0 38 C-36 14 -36 -20 -16 -20 C-6 -20 0 -10 0 -10 C0 -10 6 -20 16 -20 C36 -20 36 14 0 38 Z" fill="none" stroke-width="4.5" stroke-linejoin="round" />
          <!-- Đường nhịp tim điện tâm đồ -->
          <path d="M-28 6 L-14 6 L-8 -8 L-2 18 L4 -2 L10 6 L28 6" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;

    case 'education_book':
      // Cuốn sách mở tri thức
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <path d="M0 -6 Q-22 -14 -38 -8 L-38 34 Q-20 28 0 36 Q20 28 38 34 L38 -8 Q22 -14 0 -6 Z" fill="none" stroke-width="4.5" stroke-linejoin="round" />
          <line x1="0" y1="-6" x2="0" y2="36" stroke-width="4.5" stroke-linecap="round" />
          <!-- Ánh sáng tri thức phía trên -->
          <line x1="0" y1="-24" x2="0" y2="-14" stroke-width="3" stroke-linecap="round" />
          <line x1="-12" y1="-20" x2="-8" y2="-13" stroke-width="2.5" stroke-linecap="round" />
          <line x1="12" y1="-20" x2="8" y2="-13" stroke-width="2.5" stroke-linecap="round" />
        </g>
      `;

    case 'culinary_food':
      // Đĩa ẩm thực hoàng gia đậy nắp Cloche
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <circle cx="0" cy="-26" r="5" />
          <path d="M-34 16 C-34 -14 34 -14 34 16 Z" fill="none" stroke-width="4.5" />
          <line x1="-42" y1="18" x2="42" y2="18" stroke-width="5" stroke-linecap="round" />
          <path d="M-28 22 Q0 32 28 22" fill="none" stroke-width="3.5" stroke-linecap="round" />
        </g>
      `;

    case 'travel_compass':
      // La bàn dẫn đường & Du lịch
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <circle cx="0" cy="0" r="40" fill="none" stroke-width="4.5" />
          <circle cx="0" cy="0" r="4" />
          <polygon points="0,-32 6,-6 32,0 6,6 0,32 -6,6 -32,0 -6,-6" opacity="0.85" />
        </g>
      `;

    case 'trophy_sports':
      // Cúp vàng vô địch
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <path d="M-20 -28 L20 -28 L16 4 Q0 20 0 20 Q0 20 -16 4 Z" fill="none" stroke-width="4.5" />
          <path d="M-20 -20 C-34 -20 -34 0 -18 0" fill="none" stroke-width="3.5" stroke-linecap="round" />
          <path d="M20 -20 C34 -20 34 0 18 0" fill="none" stroke-width="3.5" stroke-linecap="round" />
          <rect x="-4" y="20" width="8" height="12" />
          <rect x="-18" y="32" width="36" height="8" rx="2" stroke-width="1.5" />
        </g>
      `;

    default:
      // Biểu tượng Ngôi sao sáng tạo
      return `
        <g stroke="${accentColor}" fill="${accentColor}" transform="scale(0.95)">
          <polygon points="0,-36 10,-10 36,0 10,10 0,36 -10,10 -36,0 -10,-10" />
        </g>
      `;
  }
}

/**
 * Sinh ảnh đồ họa tượng trưng (Contextual Graphic Card) dạng SVG chuẩn vector 4K
 * Tự động gắn biểu tượng đồ họa minh họa chuẩn xác theo nội dung phân cảnh (Kinh tế -> Đô la/Biểu đồ; Pháp luật -> Búa/Cán cân công lý...)
 */
export function generateContextualGraphicSvg(options: ContextualGraphicOptions): string {
  const {
    title,
    subtitle = '',
    metric = '',
    topic,
    outputPath,
    aspectRatio = 'landscape',
  } = options;

  // Tự động phân tích ngữ cảnh từ tiêu đề, lời thuyết minh và chủ đề
  const fullContextText = `${title} ${subtitle} ${topic} ${options.category || ''}`;
  const detected = detectSemanticContext(fullContextText);

  const category = options.category || detected.category;
  const themeColor = options.themeColor || detected.themeColor;
  const iconType = options.iconType || detected.iconType;

  const width = 1200;
  const height = aspectRatio === 'square' ? 1200 : aspectRatio === 'portrait' ? 1600 : 820;

  const cleanTitle = escapeXml(title.toUpperCase());
  const cleanCategory = escapeXml(category.toUpperCase());
  const cleanTopic = escapeXml(topic.toUpperCase());
  const cleanMetric = escapeXml(metric.toUpperCase());

  const subLines = wrapSvgText(subtitle, 42).map((l) => escapeXml(l));
  const vectorSymbol = getVectorSymbolSvg(iconType, themeColor.accent);

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="32%" r="65%" fx="50%" fy="25%">
      <stop offset="0%" stop-color="#161f33" />
      <stop offset="55%" stop-color="#0b101c" />
      <stop offset="100%" stop-color="#05070c" />
    </radialGradient>

    <!-- Accent Gradient -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${themeColor.gradient[0]}" />
      <stop offset="100%" stop-color="${themeColor.gradient[1]}" />
    </linearGradient>

    <!-- Card Border Glow -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${themeColor.accent}" stop-opacity="0.85" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${themeColor.accent}" stop-opacity="0.65" />
    </linearGradient>

    <!-- Glass Overlay -->
    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.01" />
    </linearGradient>

    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="18" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <style>
    .font-sans { font-family: 'Be Vietnam Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .badge-text { font-size: 20px; font-weight: 800; letter-spacing: 3px; fill: ${themeColor.accent}; }
    .metric-val { font-size: 52px; font-weight: 900; letter-spacing: 1px; fill: url(#accentGrad); }
    .title-text { font-size: 42px; font-weight: 900; letter-spacing: -0.3px; fill: #ffffff; }
    .sub-text { font-size: 25px; font-weight: 500; fill: #cbd5e1; }
    .topic-watermark { font-size: 18px; font-weight: 700; letter-spacing: 4px; fill: #64748b; }
  </style>

  <!-- Canvas Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="28" />

  <!-- Outer Glass Frame -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="22" fill="url(#glassGrad)" stroke="url(#borderGrad)" stroke-width="2" />

  <!-- Ambient Light Orb in Center -->
  <circle cx="${width * 0.5}" cy="180" r="180" fill="${themeColor.glow}" filter="url(#glow)" opacity="0.35" />

  <!-- Corner Tech Brackets -->
  <g stroke="${themeColor.accent}" stroke-width="3" fill="none" opacity="0.85">
    <path d="M 44 68 L 44 44 L 68 44" />
    <path d="M ${width - 68} 44 L ${width - 44} 44 L ${width - 44} 68" />
    <path d="M 44 ${height - 68} L 44 ${height - 44} L 68 ${height - 44}" />
    <path d="M ${width - 68} ${height - 44} L ${width - 44} ${height - 44} L ${width - 44} ${height - 68}" />
  </g>

  <!-- Top Category Badge -->
  <g transform="translate(${width * 0.5}, 70)">
    <rect x="-210" y="-22" width="420" height="44" rx="22" fill="rgba(255,255,255,0.06)" stroke="${themeColor.accent}" stroke-width="1.5" />
    <circle cx="-180" cy="0" r="5" fill="${themeColor.accent}" />
    <text x="10" y="7" text-anchor="middle" class="font-sans badge-text">${cleanCategory}</text>
  </g>

  <!-- Central Contextual Vector Symbol Badge (Chính xác theo chủ đề: Cán cân/Búa công lý, Đô la kinh tế, Mái đình cổ...) -->
  <g transform="translate(${width * 0.5}, 185)">
    <!-- Illuminated Glass Medallion -->
    <circle cx="0" cy="0" r="66" fill="rgba(255,255,255,0.06)" stroke="${themeColor.accent}" stroke-width="2.5" />
    <circle cx="0" cy="0" r="54" fill="rgba(10,15,26,0.6)" />
    <!-- Glowing Vector Icon -->
    ${vectorSymbol}
  </g>

  <!-- Metric Pill (Nếu có) -->
  ${
    cleanMetric
      ? `<g transform="translate(${width * 0.5}, 305)">
           <rect x="-140" y="-24" width="280" height="48" rx="24" fill="rgba(15,23,42,0.85)" stroke="${themeColor.accent}" stroke-width="1.5" />
           <text x="0" y="10" text-anchor="middle" class="font-sans metric-val" filter="url(#glow)">${cleanMetric}</text>
         </g>`
      : ''
  }

  <!-- Main Headline Title -->
  <g transform="translate(${width * 0.5}, ${cleanMetric ? 385 : 320})">
    <text x="0" y="0" text-anchor="middle" class="font-sans title-text">${cleanTitle}</text>
  </g>

  <!-- Accent Divider Line -->
  <g transform="translate(${width * 0.5}, ${cleanMetric ? 425 : 360})">
    <line x1="-120" y1="0" x2="120" y2="0" stroke="url(#accentGrad)" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="0" cy="0" r="4.5" fill="${themeColor.accent}" />
  </g>

  <!-- Subtitle Narration Lines -->
  <g transform="translate(${width * 0.5}, ${cleanMetric ? 485 : 420})">
    ${subLines
      .map(
        (line, idx) =>
          `<text x="0" y="${idx * 40}" text-anchor="middle" class="font-sans sub-text">${line}</text>`
      )
      .join('\n    ')}
  </g>

  <!-- Footer Watermark / Entity Citation -->
  <g transform="translate(${width * 0.5}, ${height - 55})">
    <text x="0" y="0" text-anchor="middle" class="font-sans topic-watermark">❖  ${cleanTopic}  ❖</text>
  </g>
</svg>
`;

  if (outputPath) {
    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, svgContent, 'utf-8');
  }

  return svgContent;
}
