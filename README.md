# AI Text-to-Video Generator 🎬 (Code-based với HyperFrames)

Ứng dụng tự động hóa 100% quy trình sản xuất video TikTok / YouTube Shorts / Reels (tỷ lệ chuẩn dọc 9:16) theo phương pháp **Code-Based Video Generation**:

```
AI → HTML/CSS/GSAP Animation → HyperFrames → MP4
```

> **Framework chính**: [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) — Công nghệ Video-as-Code mã nguồn mở sử dụng Headless Chrome và FFmpeg để biên dịch HTML/CSS/JS thành video MP4 chất lượng cao.

---

## 🌟 Tính Năng Nổi Bật

1. **Code-based HTML/CSS Video Generation**:
   - Không phụ thuộc vào các mô hình AI video như Veo/Runway/Kling.
   - Toàn bộ cảnh quay, hiệu ứng chuyển động, typography và card được tạo bằng **HTML5**, **CSS3 hiện đại** (Glassmorphism, Gradient mesh, Glow effects) và **GSAP Animation**.
2. **Kịch bản phân cảnh thông minh**:
   - Tự động hiểu chủ đề, phân đoạn thành các scene: Hook thu hút, các điểm cốt lõi với số liệu (Metric badge), biểu tượng SVG sắc nét, và CTA hành động.
3. **Giọng đọc tiếng Việt Neural TTS**:
   - Tích hợp sẵn **Microsoft Edge Neural TTS** với giọng đọc truyền cảm `vi-VN-HoaiMyNeural` hoặc `vi-VN-NamMinhNeural` hoàn toàn miễn phí, phát âm chuẩn xác.
4. **Phụ đề Karaoke đồng bộ từng từ**:
   - Chữ đổi màu vàng phát sáng (`#facc15`) và phóng to theo từng từ được đọc.
5. **Thanh tiến trình & Nhạc nền**:
   - Thanh tiến trình mượt mà ở đầu video.
   - Tự động tạo và hòa âm nhạc nền Ambient Lo-fi (audio ducking).
6. **Local Rendering**:
   - Render 100% trên máy tính cục bộ bằng HyperFrames headless Chrome + FFmpeg.

---

## 🚀 Sử Dụng CLI

### 1. Lệnh mặc định (sử dụng HyperFrames Engine)
```bash
npm run video -- --prompt "Tạo video TikTok 30 giây giải thích 5 lợi ích của trí tuệ nhân tạo trong công việc văn phòng. Phong cách hiện đại, typography mạnh, chuyển động mượt, voice tiếng Việt và subtitle." --duration 30 --output ai_van_phong_30s.mp4
```

### 2. Tạo video bất kỳ theo chủ đề
```bash
npm run video -- --prompt "Thị trường bất động sản Hà Nội 2026: Cơ hội và rủi ro" --duration 60 --output bds_hanoi.mp4
```

### 3. Tùy chọn chuyển đổi Engine
- Sử dụng HyperFrames (mặc định):
  ```bash
  npm run video -- --prompt "..." --engine hyperframes
  ```
- Sử dụng Remotion (tùy chọn):
  ```bash
  npm run video -- --prompt "..." --engine remotion
  ```

---

## 📁 Thư Mục Xuất Bản

Tất cả video sau khi render sẽ được tự động lưu vào thư mục:
`./output/` (ví dụ: `output/ai_van_phong_30s.mp4`)

---

## 🏗️ Cấu Trúc Dự Án

```
ai-text-to-video/
├── src/
│   ├── cli.ts                     # Giao diện dòng lệnh CLI
│   ├── hyperframes/               # Bộ điều khiển HyperFrames
│   │   ├── pipeline.ts            # Pipeline chính: TTS -> Audio Master -> HTML -> HyperFrames Render
│   │   ├── template.ts            # Bộ sinh mã HTML/CSS/GSAP 1080x1920
│   │   ├── icons.ts               # Vector SVG icons
│   │   └── types.ts               # Định nghĩa kiểu dữ liệu HyperFrames
│   ├── providers/
│   │   ├── tts/                   # Giọng đọc tiếng Việt (Edge TTS)
│   │   └── llm/                   # Phân tích kịch bản
│   ├── remotion/                  # Remotion engine dự phòng
│   └── utils/
│       └── audioGenerator.ts      # Bộ tổng hợp nhạc nền BGM
├── scripts/
│   └── tts_runner.py              # Script sinh TTS tiếng Việt UTF-8 có retry
├── output/                        # Chứa các file MP4 đầu ra
└── temp/                          # Thư mục tạm cho từng phiên render
```
