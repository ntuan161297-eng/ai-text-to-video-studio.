# BÁO CÁO KIỂM TOÁN TƯ DUY KÊNH CỐ ĐỊNH (CHANNEL LOCK-IN AUDIT)
**Dự án:** Universal Multi-Domain Video Engine  
**Mục tiêu:** Xác định và bóc tách triệt để các giả định ngầm định dạng một kênh duy nhất (Single Channel Identity) đang tồn tại trong hệ thống.

---

## 1. Bản Chất Vấn Đề: "Hội Chứng Một Kênh Duy Nhất"

Hệ thống hiện tại đang bị xây dựng dưới một giả định sai lầm cơ bản: **Coi toàn bộ engine như một cỗ máy sản xuất nội dung cho một kênh TikTok review/giật gân duy nhất.**

Hậu quả là:
- Dù người dùng yêu cầu làm video giáo dục, video báo cáo tài chính nội bộ, video giới thiệu danh lam lịch sử, hay video kỹ thuật cho YouTube 16:9, hệ thống vẫn tự động biến đổi thành một video ngắn TikTok giật gân, nói nhanh, có hook câu view và kêu gọi follow/comment.
- Không phân biệt được giữa **tùy chọn toàn cục của người dùng (User Global Preferences)** và **mục tiêu cụ thể của từng video (Current Video Intent)**.

---

## 2. Các Điểm Giả Định Kênh Ngầm Cần Bị Xóa Bỏ

### 2.1. Giả định nền tảng phân phối mặc định là TikTok
- **Vị trí 1:** `src/brain/inputUnderstandingEngine.ts` (Dòng 256):
  ```ts
  targetPlatform: 'tiktok',
  ```
  *Bất kể người dùng nhập gì, nền tảng luôn bị gán cứng là `'tiktok'`.*
- **Vị trí 2:** `src/providers/llm/geminiLLM.ts` (Dòng 21-22) & `src/providers/llm/openAILLM.ts` (Dòng 21-22):
  ```ts
  const systemPrompt = `Bạn là đạo diễn kịch bản video ngắn TikTok/Shorts/Reels chuyên nghiệp bằng tiếng Việt.
  Nhiệm vụ: Chuyển đổi nội dung được cung cấp thành kịch bản video dọc 9:16...`;
  ```
  *Ép LLM hành xử như một TikTok Creator, luôn hướng về video dọc 9:16 và nhịp điệu giật gân.*

### 2.2. Giả định phong cách dẫn chuyện (Narrative Voice & Tone) mặc định
- **Vị trí:** `src/brain/inputUnderstandingEngine.ts` (Dòng 231-232):
  ```ts
  let creatorGoal = 'Cung cấp góc nhìn thuyết phục, giữ chân người xem đến giây cuối và tạo tương tác tự nhiên';
  let tone = 'cuốn hút, súc tích, đáng tin cậy';
  ```
  *Mục tiêu của mọi video bị đồng nhất hóa thành "giữ chân người xem đến giây cuối", tiêu diệt các mục tiêu khác như: thông báo trang trọng, hướng dẫn tường minh, suy ngẫm nghệ thuật, hay báo cáo số liệu khách quan.*

### 2.3. Giả định đối tượng khán giả (Audience) mặc định
- **Vị trí:** `src/brain/inputUnderstandingEngine.ts` (Dòng 229):
  ```ts
  let targetAudience = 'Khán giả đại chúng trên nền tảng short-form yêu thích thông tin cô đọng, sắc bén';
  ```
  *Hệ thống luôn coi người xem là "khán giả lướt short-form đại chúng", không phục vụ được khách hàng B2B, học sinh, nhà nghiên cứu, hay chuyên gia kỹ thuật.*

### 2.4. Giả định kêu gọi hành động (Call To Action - CTA) mặc định
- **Vị trí:** `src/brain/seniorScriptWriter.ts` (Dòng 166-198):
  Hệ thống coi mọi video trên đời đều phải có đoạn kết thúc thúc giục tương tác:
  - *"Bạn đánh giá thế nào về mức giá và khả năng vận hành...? Hãy chia sẻ cảm nghĩ ở phần bình luận nhé!"*
  - *"Hãy lưu ngay video này vào cẩm nang du lịch và chia sẻ cho người bạn muốn đồng hành...!"*
  - *"Bấm theo dõi kênh để cập nhật những phân tích sắc bén...!"*
  *Người dùng làm video cho công ty, nội bộ hoặc video tri ân không bao giờ muốn có những câu xin like/follow rẻ tiền này.*

---

## 3. Phân Tách Kiến Trúc: User Preferences vs. Video Intent

Để giải phóng hệ thống khỏi Channel Lock-in, hai tầng dữ liệu này phải được phân ly rạch ròi:

```
┌────────────────────────────────────────────────────────┐
│  GLOBAL USER PREFERENCES (Chỉ chứa cấu hình phi nội dung)│
│  - preferredLanguage (vi, en)                          │
│  - preferredVoice (HoaiMy, NamMinh, etc.)              │
│  - defaultResolution (1080x1920, 1920x1080)            │
│  - defaultEngine (hyperframes, remotion)               │
└────────────────────────────────────────────────────────┘
                          │ (KHÔNG ĐƯỢC CHỨA TOPIC / STYLE / CTA / HOOK)
                          ▼
┌────────────────────────────────────────────────────────┐
│  CURRENT VIDEO INTENT (Sinh độc lập cho từng request) │
│  - primarySubject                                      │
│  - userGoal (Educate, Inform, Sell, Inspire, Report)   │
│  - communicationGoal (Direct, Story, Analysis, etc.)   │
│  - targetAudience (B2B, Students, General, etc.)       │
│  - contentMode (Explainer, Documentary, News, Review)  │
│  - requestedDuration (Chính xác số giây yêu cầu)       │
│  - targetPlatform (Web, Internal, YouTube, TikTok)     │
│  - visualExpectation (Realistic, Diagram, Typography)  │
│  - constraints (Explicit boundaries from user)         │
└────────────────────────────────────────────────────────┘
```

---

## 4. Hành Động Cần Thực Hiện

1. **Gỡ bỏ hoàn toàn system prompt TikTok/Shorts** trong các LLM providers. Chuyển thành System Prompt trung tính: *"Bạn là chuyên gia chuyển hóa ý tưởng thành kế hoạch sản xuất video đa phương tiện chính xác theo mục tiêu được chỉ định."*
2. **Xóa bỏ các trường hard-code `targetPlatform: 'tiktok'`** trong `InputUnderstandingEngine`. Thay bằng phân tích từ request của người dùng (nếu không nói gì, mặc định là `multi-platform` hoặc theo tỉ lệ khung hình yêu cầu).
3. **Chuyển CTA thành tính năng hoàn toàn TÙY CHỌN (OPT-IN):** Mặc định video KHÔNG có CTA, trừ khi `UserIntentSpec` hoặc `userConstraints` yêu cầu rõ ràng.
