# BÁO CÁO KIỂM TOÁN MÃ CỨNG (HARD-CODE AUDIT)
**Dự án:** AI Text-to-Video Engine  
**Mục tiêu:** Phân loại toàn bộ logic hard-code đang tự ý quyết định nội dung thay người dùng.

---

## 1. Bảng Tổng Hợp & Phân Loại Hard-Code (REMOVE / CONFIGURABLE / KEEP)

| Vị Trí File | Đoạn Mã / Cơ Chế Hard-code | Phân Loại | Lý Do & Hành Động Cần Thực Hiện |
|---|---|---|---|
| `src/brain/hookCandidateEngine.ts` | Câu hook mẫu: *"Con số ${keyStat} này của ${mainEntity} đang khiến cả thị trường phải nhìn nhận lại!"* | **REMOVE** | Ép giật gân, vi phạm nguyên tắc tôn trọng mục tiêu người dùng. Phải sinh dựa trên `ContentPlan` & `UserIntentSpec`. |
| `src/brain/hookCandidateEngine.ts` | Câu hook mẫu: *"${mainEntity} vừa tạo nên một bước ngoặt thực sự mà rất ít người để ý kỹ!"* | **REMOVE** | Xóa bỏ mẫu giật gân cố định. Không áp đặt giật gân lên mọi chủ đề. |
| `src/services/viralScriptEngine.ts` | Hook du lịch: *"Nếu bạn nghĩ ${topic} chỉ có nắng gió, thì 60 giây sau đây sẽ thay đổi hoàn toàn..."* | **REMOVE** | Xóa bỏ file `viralScriptEngine.ts` (module cũ lỗi thời). |
| `src/brain/seniorScriptWriter.ts` (L170-L198) | 4 mẫu CTA switch-case: *"Bạn đánh giá thế nào về mức giá..."*, *"Hãy lưu ngay video này..."*, *"Bấm theo dõi kênh..."*, *"Để lại bình luận bên dưới..."* | **REMOVE** | Người dùng không yêu cầu CTA thì tuyệt đối không tự thêm. CTA phải do `ContentPlan` quyết định dựa trên `UserIntentSpec`. |
| `src/brain/seniorScriptWriter.ts` (L97, L107, L117) | 3 câu fallback dẫn dắt: *"Khi nhìn vào ${mainEntity}, điểm khiến giới chuyên môn chú ý..."*, *"Yếu tố cốt lõi thay đổi cuộc chơi..."*, *"Các kiểm nghiệm thực tế đã chứng minh..."* | **REMOVE** | Văn mẫu sáo rỗng, đưa thông tin giả/chung chung vào video. Phải lấy sự thật từ `KnowledgeBrief` hoặc viết theo nội dung người dùng cung cấp. |
| `src/brain/seniorScriptWriter.ts` (L145) | Câu kết thúc mặc định: *"Tựu trung lại, ${mainEntity} đã chứng minh một điều rõ ràng: khi giá trị thực tế gặp đúng thời điểm, sự bứt phá là điều tất yếu."* | **REMOVE** | Văn mẫu triết lý sáo rỗng bị lặp lại ở mọi video. Phần kết phải tóm lược đúng thông điệp của yêu cầu. |
| `src/brain/contentStrategist.ts` (L29-L77) | Switch-case 4 nhóm danh mục để gán `viewerProblem`, `viewerPromise`, `emotionalDirection` | **REMOVE** | Suy diễn thay người dùng. Mọi định hướng phải tổng hợp trực tiếp từ prompt và kiến thức xác thực. |
| `src/brain/creativeAngleEngine.ts` (L27-L65) | Danh sách cố định 3-5 góc tiếp cận (DISCOVERY, PROBLEM_SOLUTION, CONTRARIAN) với điểm số tĩnh 90, 88, 85 | **REMOVE** | Điểm số giả tạo không phản ánh sự phù hợp với yêu cầu người dùng. |
| `src/brain/inputUnderstandingEngine.ts` (L13-L142) | Bộ Regex phân loại cứng nhắc 19 ContentType | **REMOVE** | Phân loại từ khóa gây nhầm lẫn (ví dụ prompt có từ "hành" hoặc "giá" bị quy về sản phẩm). Chuyển sang trích xuất mục tiêu ngữ nghĩa (`primaryGoal`, `primaryTopic`, `requiredEntities`). |
| `src/brain/inputUnderstandingEngine.ts` (L198-L210) | Làm tròn duration về các nấc cố định `[30, 45, 60, 90, 120, 180]` | **REMOVE** | Vi phạm thời lượng yêu cầu. Phải giữ nguyên `requestedSeconds` theo `DurationContract`. |
| `src/brain/scriptDurationOptimizer.ts` (L26-L33) | Snap duration và gán số lượng beat cố định (30s = 3 beats, 45s = 4 beats, 60s = 5 beats...) | **REMOVE** | Số lượng scene/beat phải do độ sâu nội dung (`ContentPlan`) quyết định, không được cố định cơ học. |
| `src/server/routes/videoRoutes.ts` (L81) | Zod schema ép duration: `z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)])` | **REMOVE** | Cho phép nhận bất kỳ thời lượng hợp lệ nào (ví dụ số nguyên từ 10 đến 300 giây). |
| `src/engine/creativeHistory.ts` | Ghi/đọc file `output/creative_history.json` và hàm `getAvoidanceAdvice()` | **REMOVE** | Nguy cơ lây nhiễm chéo hoặc ảnh hưởng quyết định sáng tạo của job sau dựa trên lịch sử job trước. |
| `src/hyperframes/template.ts` (L301-L308) | Khối quảng cáo TMĐT: *"BẤM VÀO GIỎ HÀNG GÓC TRÁI HOẶC LINK DƯỚI BIO"*, *"FREESHIP"* | **REMOVE** | Chỉ xuất hiện khi người dùng cung cấp link sản phẩm TMĐT rõ ràng (`isAffiliate: true`), tuyệt đối không tự động kích hoạt. |
| `src/production/shotPlanner.ts` (L31, L59, L100) | Tỷ lệ chia độ dài shot cố định (0.45s / 0.55s, 0.5s / 0.5s) | **CONFIGURABLE** | Thay vì hằng số cứng, tính toán theo độ dài câu thoại thực tế sau khi TTS đọc xong. |
| `src/services/videoGenerator.ts` (L57-L70) | Tiêu đề mặc định: `"THÔNG TIN NỔI BẬT"`, `"ĐIỂM NHẤN QUAN TRỌNG"` | **CONFIGURABLE** | Làm fallback an toàn cuối cùng khi chuỗi rỗng, nhưng ưu tiên lấy headline từ `ContentPlan`. |
| `src/engine/designSystem.ts` | 6 bộ Preset thiết kế màu sắc / font chữ (Crimson Flame, Neon Cyber, Golden Sunrise, Emerald Minimal, Sapphire Corporate, Violet Dream) | **CONFIGURABLE** | Giữ lại làm tài nguyên visual, nhưng việc lựa chọn preset phải dựa trên `desiredStyle` và `desiredTone` trong `UserIntentSpec`. |
| `src/brain/scriptDurationOptimizer.ts` (L20) | Tốc độ đọc tiếng Việt: `SPEAKING_RATE_WPS = 2.65` từ/giây | **CONFIGURABLE** | Giữ làm ước lượng ban đầu (initial estimate), nhưng thời lượng thực tế bắt buộc phải đo từ audio phát sinh thật. |
| `src/providers/tts/edgeTTS.ts` | Tên các giọng đọc mặc định (`vi-VN-HoaiMyNeural`, `vi-VN-NamMinhNeural`) | **CONFIGURABLE** | Giữ lại để phục vụ cấu hình giọng đọc, cho phép user lựa chọn. |
| `src/engine/jobIsolation.ts` | Danh sách stopwords và cơ chế cô lập job workspace | **KEEP** | Giữ vững cơ chế bảo vệ phân cách dữ liệu giữa các job, ngăn chặn tuyệt đối rò rỉ chéo. |
| `src/production/preRenderQualityGate.ts` | Các quy tắc kiểm tra an toàn kỹ thuật (chống tràn chữ, audio dài hơn hình, kiểm tra asset) | **KEEP** | Giữ lại làm chốt chặn bảo đảm chất lượng kỹ thuật trước khi render. |

---

## 2. Kế Hoạch Loại Bỏ & Dọn Dẹp

1. **Xóa bỏ vĩnh viễn các module văn mẫu cũ:**
   - Xóa hoàn toàn `src/services/viralScriptEngine.ts`.
   - Vô hiệu hóa `src/engine/creativeHistory.ts` và file `creative_history.json`.
   - Gỡ bỏ `PipelineCoordinator` và `HyperFramesVideoPipeline` mồ côi.

2. **Thay thế cơ chế suy diễn bằng Adaptive Planning:**
   - Thay thế việc phân loại 19 `ContentType` cứng bằng `UserIntentSpec` (xác định mục tiêu, thực thể, phạm vi loại trừ).
   - Thay thế các công thức hook giật gân bằng cơ chế mở đầu thích ứng (Adaptive Opening) trong `ContentPlan`: mở đầu trực diện, mở đầu bằng câu hỏi, hoặc mở đầu bằng số liệu tùy theo nội dung.
   - Bỏ hoàn toàn 4 mẫu CTA cứng; chỉ đưa CTA vào nếu `UserIntentSpec.outputRequirements` hoặc người dùng yêu cầu.
