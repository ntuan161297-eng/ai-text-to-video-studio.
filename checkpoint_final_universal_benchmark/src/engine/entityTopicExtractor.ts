/**
 * ENTITY TOPIC EXTRACTOR
 * Bóc tách thực thể cốt lõi, loại bỏ toàn bộ khẩu ngữ yêu cầu (prompt conversational prefix),
 * các mẫu câu "Nói về những điều có thể bạn chưa biết về...", "Cho tôi biết...", v.v.
 * Ngăn chặn tuyệt đối việc đưa câu lệnh của người dùng vào kịch bản hiển thị hoặc video copy.
 */

export interface ExtractedTopicInfo {
  cleanTopic: string;
  displayTopic: string;
  category: 'military' | 'vehicle' | 'travel' | 'real_estate' | 'finance' | 'tech' | 'business' | 'education' | 'news' | 'product' | 'general';
  searchQueries: string[];
}

export class EntityTopicExtractor {
  /**
   * Trích xuất thực thể sạch và thể loại từ prompt của người dùng
   */
  public static extract(rawPrompt: string, articleTitle?: string): ExtractedTopicInfo {
    let text = (rawPrompt || '').trim();

    // 1. Loại bỏ URL nếu có
    text = text.replace(/https?:\/\/[^\s]+/gi, '').trim();

    // 2. Loại bỏ các mẫu câu lệnh tạo video
    text = text.replace(/^(?:hãy\s+|vui lòng\s+|giúp tôi\s+)?(?:làm|tạo|dựng|sản xuất|viết|quay)\s+(?:cho tôi\s+)?(?:video|clip|thước phim|nội dung)\s*(?:ngắn|tiktok|reels|shorts|youtube)?\s*(?:\d+s|\d+\s*giây)?\s*[:,-]?\s*/gi, '');

    // 3. Loại bỏ các tiền tố hội thoại / yêu cầu thông tin phổ biến
    text = text.replace(/^(?:hãy\s+|vui lòng\s+|giúp tôi\s+)?(?:nói|kể|chia sẻ|cho tôi biết|bạn có biết|giải thích|phân tích|đánh giá|khám phá|tìm hiểu|review|tổng hợp|giới thiệu)\s+(?:chi tiết\s+|toàn diện\s+|sâu\s+)?(?:về|cho)?\s*/gi, '');

    // 4. Loại bỏ các cụm "những điều có thể bạn chưa biết về...", "bí mật về...", v.v.
    text = text.replace(/^(?:những\s+)?(?:điều|sự thật|bí mật|thông tin|câu chuyện)\s+(?:có thể\s+)?(?:bạn|chúng ta)?\s*(?:chưa biết|cần biết|thú vị|bất ngờ|ít người biết)\s+(?:về|của|ở|tại)\s*/gi, '');

    // 5. Loại bỏ "tất tần tật về...", "toàn cảnh về..."
    text = text.replace(/^(?:tất tần tật|toàn cảnh|tổng quan|chi tiết|toàn bộ)\s+(?:về|của)\s*/gi, '');

    // 6. Loại bỏ phong cách & định dạng thừa
    text = text.replace(/theo\s+phong\s+cách[^\n.]+/gi, '');
    text = text.replace(/định\s+dạng\s+9:16[^\n.]+/gi, '');

    // 7. Loại bỏ hậu tố phụ câu lệnh
    text = text.replace(/\s*(?:mà rất ít người để ý|mà bạn chưa biết|thực tế|chi tiết nhất|mới nhất\s*\d{0,4}|hôm nay)\s*$/gi, '');

    let cleanTopic = text.trim();

    // Nếu sau khi lọc còn quá ngắn hoặc rỗng, ưu tiên lấy từ articleTitle hoặc prompt gốc
    if (!cleanTopic || cleanTopic.length < 3) {
      if (articleTitle && articleTitle.length >= 3) {
        cleanTopic = articleTitle
          .replace(/[-|].*(VnExpress|Tuổi Trẻ|Thanh Niên|Dân Trí|Zing).*$/i, '')
          .trim();
      } else {
        cleanTopic = rawPrompt.replace(/https?:\/\/[^\s]+/gi, '').slice(0, 35).trim();
      }
    }

    // Nhận diện danh mục chủ đề để Deep Research
    const lower = (cleanTopic + ' ' + (rawPrompt || '')).toLowerCase();
    let category: ExtractedTopicInfo['category'] = 'general';

    if (/(tên lửa|scud|vũ khí|quân sự|pháo binh|xe tăng|chiến hạm|tiêm kích|quân đội|phòng không|radar|súng)/i.test(lower)) {
      category = 'military';
    } else if (/(xe\s*máy|xe\s*đạp|vinfast|ô tô|oto|xe điện|motor|dat\s*bike|honda|toyota|hyundai|kia|mercedes|bmw|tesla|vf\s*3|weaver)/i.test(lower)) {
      category = 'vehicle';
    } else if (/(du lịch|khám phá|địa danh|thắng cảnh|non nước|bãi biển|vịnh|đảo|chùa|tỉnh|hà tĩnh|đà lạt|đà nẵng|phú quốc|hạ long|nha trang|sapa|huế|hà nội|sài gòn|nhà thờ đổ|hải lý)/i.test(lower)) {
      category = 'travel';
    } else if (/(bất động sản|nhà đất|căn hộ|chung cư|biệt thự|vinhomes|đất nền|quy hoạch|dự án bđs)/i.test(lower)) {
      category = 'real_estate';
    } else if (/(tài chính|chứng khoán|lãi suất|ngân hàng|lạm phát|đầu tư|cổ phiếu|vàng|crypto|bitcoin)/i.test(lower)) {
      category = 'finance';
    } else if (/(trí tuệ nhân tạo|công nghệ|software|iphone|macbook|laptop|samsung|chip|bán dẫn|ai)/i.test(lower)) {
      category = 'tech';
    } else if (/(doanh nghiệp|startup|kinh doanh|doanh thu|thị phần|tập đoàn|ceo|chuỗi bán lẻ)/i.test(lower)) {
      category = 'business';
    } else if (/(giáo dục|đại học|học bổng|kỹ năng|du học|tư duy phản biện|sinh viên)/i.test(lower)) {
      category = 'education';
    } else if (/(tin tức|thời sự|sự kiện|bản tin|tiến độ|đường sắt)/i.test(lower)) {
      category = 'news';
    }

    // Viết hoa chữ cái đầu cho tiêu đề hiển thị
    const displayTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);

    // Xây dựng bộ query Deep Research đa tầng
    const searchQueries: string[] = [];
    if (category === 'military') {
      searchQueries.push(`${cleanTopic} Việt Nam lịch sử nguồn gốc`);
      searchQueries.push(`${cleanTopic} thông số kỹ thuật tầm bắn uy lực`);
      searchQueries.push(`${cleanTopic} đặc điểm đặc biệt vũ khí Đông Nam Á`);
    } else if (category === 'vehicle') {
      searchQueries.push(`${cleanTopic} thông số kỹ thuật giá bán thực tế`);
      searchQueries.push(`${cleanTopic} ưu nhược điểm trải nghiệm người dùng`);
      searchQueries.push(`${cleanTopic} công nghệ pin động cơ`);
    } else if (category === 'travel') {
      searchQueries.push(`${cleanTopic} điểm đến danh lam thắng cảnh lịch sử`);
      searchQueries.push(`${cleanTopic} trải nghiệm đặc sản văn hóa du lịch`);
      searchQueries.push(`${cleanTopic} nét đặc sắc hấp dẫn`);
    } else {
      searchQueries.push(`${cleanTopic} nguồn gốc thông tin chi tiết`);
      searchQueries.push(`${cleanTopic} số liệu thực tế phân tích đánh giá`);
      searchQueries.push(`${cleanTopic} ý nghĩa vai trò hiện nay`);
    }

    return {
      cleanTopic,
      displayTopic,
      category,
      searchQueries,
    };
  }
}
