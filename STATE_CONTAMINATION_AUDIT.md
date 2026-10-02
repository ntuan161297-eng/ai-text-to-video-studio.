# BÁO CÁO KIỂM TOÁN LÂY NHIỄM TRẠNG THÁI (STATE CONTAMINATION AUDIT)
**Dự án:** Universal Multi-Domain Video Engine  
**Mục tiêu:** Rà soát và bảo đảm tính cô lập tuyệt đối (Zero-Semantic-State) cho mọi video mới.

---

## 1. Kiểm Toán Trạng Thái Giữa Các Job (Cross-Job State Audit)

Hệ thống có nguy cơ lây nhiễm trạng thái từ 4 nguồn chính:

### 1.1. Nguồn 1: `src/engine/creativeHistory.ts` (File tĩnh `output/creative_history.json`)
- **Cơ chế hiện tại:**
  - Ghi lại 50 job gần nhất vào file `output/creative_history.json`.
  - Hàm `CreativeHistory.getAvoidanceAdvice()` đọc 3 job gần nhất để thu thập các `hookArchetype`, `storyArc`, `designPreset` đã dùng, sau đó trả về danh sách cấm kỵ nhằm ép job tiếp theo phải chọn phương án khác.
- **Rủi ro lây nhiễm:**
  - **Lây nhiễm quyết định (Decision Coupling):** Job B bị cấm dùng một phong cách chỉ vì Job A (của một người dùng khác hoặc về một chủ đề hoàn toàn khác) đã lỡ dùng phong cách đó.
  - Đây là vi phạm nghiêm trọng tính độc lập: Mỗi request phải được phục vụ bằng phương án tối ưu nhất cho chính nó, không phải phương án "khác người đi trước để không bị trùng".
- **Hành động:**
  - **Xóa bỏ hoàn toàn việc đọc `creative_history.json` để can thiệp vào logic kịch bản.**
  - Chỉ cho phép lưu log kỹ thuật sau khi render (Post-render Analytics) mà không ảnh hưởng ngược dòng lên pipeline.

### 1.2. Nguồn 2: Biến Static Trong Bộ Nhớ `JobIsolation.recentJobEntitiesMap`
- **Cơ chế hiện tại:**
  - `JobIsolation` lưu `recentJobEntitiesMap = new Map<string, { prompt: string, entities: string[] }>()` trong RAM để chạy hàm `assertNoContamination`.
- **Rủi ro lây nhiễm:**
  - Mặc dù đây là cơ chế an ninh nhằm phát hiện rò rỉ chéo, nhưng trước đó do bộ lọc từ ngữ tiếng Việt chưa hoàn thiện, các từ thông dụng của job trước đã làm sập job sau.
- **Hành động:**
  - Giữ lại bộ lọc stopwords và Unicode boundaries đã vá.
  - Đảm bảo `recentJobEntitiesMap` CHỈ DÙNG để phát hiện rò rỉ bất hợp pháp (Safety Assert), tuyệt đối KHÔNG ĐƯỢC dùng làm nguồn cấp dữ liệu cho Writer hay Planner.

### 1.3. Nguồn 3: Thư Mục Tạm và Tên File Tĩnh
- **Hiện trạng:**
  - Mỗi job đã được cấp thư mục riêng: `temp/video-jobs/{jobId}/artifacts/`, `temp/video-jobs/{jobId}/assets/`, `output/{jobId}/`.
  - Tên file sinh ra đều gắn liền với `jobId` hoặc nằm trong thư mục con cô lập của job đó.
- **Đánh giá:**
  - Tầng file hệ thống hiện tại đã đạt chuẩn Zero-Collision.

### 1.4. Nguồn 4: Tái Sử Dụng Kịch Bản Trong REVISE_EXISTING vs. CREATE_NEW
- **Hiện trạng:**
  - `CREATE_NEW`: Đã được thiết lập để xóa sạch mọi liên kết version cũ, cấp phát `jobId`, `videoId`, `versionId` hoàn toàn mới.
  - `REVISE_EXISTING`: Chỉ tái sử dụng kịch bản khi `revisionScope` KHÔNG yêu cầu sửa script (Copy-on-Write).
- **Đánh giá:**
  - Cơ chế phân tách giữa 2 thao tác này đã hoạt động chính xác qua bộ unit test 5/5.

---

## 2. Tiêu Chuẩn Zero-Semantic-State Cho Video Mới

Mọi request có `operation: 'CREATE_NEW'` bắt buộc phải tuân thủ bảng kiểm định 10 điểm trắng:

| Tiêu Chí Kiểm Tra | Giá Trị Khi Khởi Tạo CREATE_NEW | Trạng Thái Hiện Tại |
|---|---|---|
| 1. Previous Script Text | `null` / `undefined` | ✅ Đã cô lập |
| 2. Previous Verified Facts | Empty Array `[]` | ✅ Đã cô lập |
| 3. Previous Core Topic & Entities | Empty Array `[]` | ✅ Đã cô lập |
| 4. Previous Narrative Arc | `null` / Phải tính toán lại | ⚠️ Cần xóa `StoryArchitect` cũ |
| 5. Previous Hook & Rhetoric | `null` / Phải tính toán lại | ⚠️ Cần xóa `HookCandidateEngine` cũ |
| 6. Previous CTA Text | `null` / Phải tính toán lại | ⚠️ Cần bỏ CTA switch-case |
| 7. Previous Storyboard Scenes | Empty Array `[]` | ✅ Đã cô lập |
| 8. Previous Visual Assets | Empty Map `{}` | ✅ Đã cô lập |
| 9. Creative History Advice | Bị vô hiệu hóa (Không can thiệp) | ⚠️ Cần ngắt kết nối `CreativeHistory` |
| 10. Workspace Directory | Thư mục riêng biệt mới tạo | ✅ Đã cô lập |
