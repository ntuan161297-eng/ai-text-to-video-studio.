# BÁO CÁO KIỂM TOÁN HỆ THỐNG (SYSTEM AUDIT)
**Dự án:** AI Text-to-Video Engine  
**Phiên bản:** Master Refactor — User-Intent-First Adaptive Engine  
**Ngày thực hiện:** 30/09/2026

---

## 1. Entry Points Hiện Đang Tạo Video

Hiện tại trong toàn bộ codebase có **3 nhóm Entry Point** có khả năng kích hoạt quy trình sinh video:

1. **Web App API Entry Point:**
   - **File:** `src/server/routes/videoRoutes.ts` (Endpoint `POST /api/videos/create`).
   - **Luồng gọi:** Nhận payload từ Web Frontend -> Tạo video/version record trong database -> Đẩy job vào BullMQ queue `videoQueue.ts` -> Worker `src/worker/videoWorker.ts` bốc job -> Gọi `generateVideo()` trong `src/services/videoGenerator.ts`.

2. **CLI Entry Point:**
   - **File:** `src/cli.ts` (Lệnh `npm run video` hoặc `tsx src/cli.ts`).
   - **Luồng gọi:** Đọc command line arguments (`--prompt`, `--duration`, `--engine`, `--aspect`) -> Gọi trực tiếp hàm `generateVideo()` trong `src/services/videoGenerator.ts`.

3. **Standalone Benchmark & Test Entry Points:**
   - **File:** `scripts/execute_benchmark.ts`, `tests/cross_job_leak.test.ts`.
   - **Luồng gọi:** Bỏ qua hoàn toàn tầng `services/videoGenerator.ts`, gọi **trực tiếp** vào `MasterVideoEngine.execute({...})`.

---

## 2. Có Bao Nhiêu Pipeline Đang Tồn Tại?

Qua kiểm toán toàn diện mã nguồn, hệ thống đang tồn tại **4 pipelines riêng biệt** cùng một **Pre-Pipeline chắp vá**:

| Tên Pipeline | File Định Nghĩa | Tình Trạng | Mô Tả & Vấn Đề |
|---|---|---|---|
| **Pipeline 1: MasterVideoEngine** | `src/engine/masterVideoEngine.ts` | **Đang hoạt động** | Pipeline 24 bước hiện tại chạy HyperFrames HTML/CSS/GSAP. Chứa đầy đủ các gate kiểm tra nhưng đang bị phụ thuộc vào nhiều logic sáng tạo áp đặt. |
| **Pipeline 2: Legacy VideoPipeline** | `src/pipeline.ts` | **Bán hoạt động (Bifurcated)** | Pipeline Remotion cũ. Được gọi trong `services/videoGenerator.ts` (dòng 220-230) khi người dùng chọn `engine: "remotion"`. Dùng `LLMFactory`, `TTSFactory`, `VisualFactory` hoàn toàn tách biệt với MasterVideoEngine. |
| **Pipeline 3: PipelineCoordinator** | `src/engine/pipelineCoordinator.ts` | **Mồ côi (Dead Code)** | Được xây dựng trong lần refactor 27-điểm trước đó, điều phối `CreativeDirector`, `StoryArchitect`, `EntityGrounding`. Vẫn đang được import ở dòng 28 của `videoGenerator.ts` nhưng không còn được gọi. |
| **Pipeline 4: HyperFramesVideoPipeline** | `src/hyperframes/pipeline.ts` | **Mồ côi (Dead Code)** | Thử nghiệm pipeline HyperFrames đời đầu độc lập, không còn được bất kỳ module nào import hay sử dụng. |
| **Bifurcated Pre-Pipeline** | `src/services/videoGenerator.ts` (L166-L208) | **Lỗi kiến trúc nghiêm trọng** | `videoGenerator.ts` tự chạy `ResearchEngine.conductResearch()` và `FactLayer.extractFacts()`, gộp thành một chuỗi `extractedContext` rồi mới truyền vào `MasterVideoEngine`. |

---

## 3. Pipeline Nào Web App Đang Gọi?

Web App đi qua luồng:
```
Web Form -> POST /api/videos/create -> videoWorker.ts -> videoGenerator.ts -> Bifurcated Pre-Pipeline (ResearchEngine) -> MasterVideoEngine.execute()
```
**Hậu quả:** Khi chạy qua Web App, do `videoGenerator.ts` đã tự tạo `extractedContext`, hàm `MasterVideoEngine.execute()` kiểm tra thấy `extractedContext.length > 50` nên **bỏ qua hoàn toàn** bộ `ResearchQueryPlanner` và `LiveWebSearcher` của chính nó, coi như đây là một bài viết tĩnh lấy từ URL!

---

## 4. Pipeline Nào CLI Đang Gọi?

CLI (`src/cli.ts`) đi qua luồng:
```
CLI args -> videoGenerator.ts -> Bifurcated Pre-Pipeline (ResearchEngine) -> MasterVideoEngine.execute()
```
CLI đang chạy cùng một đường dẫn bị phân nhánh với Web App, nhưng nếu chọn `--engine remotion` thì lại rẽ sang `src/pipeline.ts` (Pipeline 2).

---

## 5. Module Nào Hiện Làm Thay Đổi User Intent?

1. **`src/brain/inputUnderstandingEngine.ts`:**
   - Cưỡng ép mọi prompt của người dùng vào 1 trong 19 nhãn `ContentType` cố định bằng regex.
   - Luôn gán cứng `targetPlatform: 'tiktok'`.
   - Làm tròn thời lượng (duration snapping): Nếu người dùng yêu cầu 35s, 50s, 70s... thì bị ép về các mốc [30, 45, 60, 90, 120, 180].
   - Tự gán mục tiêu sáng tạo (`creatorGoal`: *"giữ chân người xem đến giây cuối và tạo tương tác tự nhiên"*) và cảm xúc người xem (`viewerIntent`) theo template danh mục thay vì theo yêu cầu thực của người dùng.
2. **`src/brain/contentStrategist.ts`:**
   - Dùng switch-case theo 4 nhóm chủ đề để gán cứng: `viewerProblem`, `viewerPromise`, `emotionalDirection`, `storyOpportunity`.
   - Tự bịa ra "nỗi đau của khán giả" (`viewerProblem`) khi người dùng chỉ yêu cầu một video thông tin đơn giản.
3. **`src/brain/creativeAngleEngine.ts`:**
   - Tự áp đặt góc tiếp cận giật gân: *"Hành trình khám phá sự thật bất ngờ"*, *"Giải quyết bài toán thực tế"* với các điểm số giả định (90, 88, 85).
4. **`src/brain/hookCandidateEngine.ts`:**
   - Cưỡng bức tạo hook giật gân: *"Con số này đang khiến cả thị trường phải nhìn nhận lại"*, *"vừa tạo nên bước ngoặt thực sự mà rất ít người để ý kỹ"*.

---

## 6. Module Nào Hard-code Creative Decisions?

- **`src/brain/hookCandidateEngine.ts`:** Hard-code cấu trúc câu giật gân, câu hỏi kích động cho hook.
- **`src/engine/hookEngine.ts`:** Hard-code 5 công thức hook (contrarian, curiosity_gap, statistic, problem_agitate, bold_claim).
- **`src/brain/seniorScriptWriter.ts`:**
  - Hard-code câu mở đầu và câu chuyển ý.
  - Hard-code câu kết: *"Tựu trung lại, ${mainEntity} đã chứng minh một điều rõ ràng: khi giá trị thực tế gặp đúng thời điểm, sự bứt phá là điều tất yếu."*
  - Hard-code 4 nhóm CTA (Call To Action) theo switch-case (Bình luận, Lưu & Chia sẻ, Theo dõi kênh).
- **`src/engine/storyArchitect.ts`:** Gán cứng 5 mô hình Story Arc (HERO_JOURNEY, PROBLEM_AGITATION, MYSTERY_REVEAL, DIRECT_VALUE, COMPARATIVE_SHOWDOWN).
- **`src/production/shotPlanner.ts`:** Hard-code tỷ lệ cắt cảnh cho từng beat (0.45s / 0.55s) và thể loại shot (ESTABLISHING, DYNAMIC_ACTION, DATA_CARD).

---

## 7. Module Nào Hard-code Duration?

- **`src/brain/inputUnderstandingEngine.ts` (L198-L210):** Tự động ép duration vào tập `[30, 45, 60, 90, 120, 180]`.
- **`src/brain/scriptDurationOptimizer.ts` (L26-L33):** Ép cứng khoảng duration và số lượng beat tương ứng (30s = 3 beats, 45s = 4 beats, 60s = 5 beats, 90s = 7 beats, 120s = 9 beats, 180s = 12 beats).
- **`src/server/routes/videoRoutes.ts` (L81):** Zod validation chỉ chấp nhận 4 giá trị: `z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)])`. Người dùng nhập số giây khác sẽ bị từ chối hoặc lỗi schema!

---

## 8. Nơi Nào Có Fallback Content?

- **`src/brain/seniorScriptWriter.ts` (L97, L107, L117):**
  - Fallback beat 1: *"Khi nhìn vào ${mainEntity}, điểm khiến giới chuyên môn chú ý trước hết là nền tảng thiết kế vượt trội và tính thực tiễn cao."*
  - Fallback beat 2: *"Yếu tố cốt lõi thay đổi cuộc chơi chính là khả năng tối ưu hóa hiệu năng, mang lại trải nghiệm hoàn toàn khác biệt."*
  - Fallback beat 3: *"Các kiểm nghiệm thực tế đã chứng minh đây không chỉ là lời hứa, mà là năng lực đã được định lượng rõ ràng."*
- **`src/services/videoGenerator.ts` (L58, L64):**
  - Fallback headline: `"THÔNG TIN NỔI BẬT"`, `"ĐIỂM NHẤN QUAN TRỌNG"`.
- **`src/production/entityAssetEngine.ts` (L53-L72):**
  - Fallback asset dạng SVG data URI (`data:semantic/chart`, `data:semantic/metric_card`, `data:semantic/typography`).
- **`src/hyperframes/template.ts` (L301-L308):**
  - Fallback deal box: `"BẤM VÀO GIỎ HÀNG GÓC TRÁI HOẶC LINK DƯỚI BIO"`, `"FREESHIP"`.

---

## 9. Nơi Nào Có Reuse Previous Job State?

1. **`src/engine/creativeHistory.ts`:**
   - Lưu trữ lịch sử 50 job gần nhất ra file tĩnh `output/creative_history.json`.
   - Hàm `getAvoidanceAdvice(lookbackCount = 3)` đọc lại các job trước để can thiệp vào hook/arc của job hiện tại.
2. **`src/engine/jobIsolation.ts` (L79):**
   - Biến static `recentJobEntitiesMap`: Dù được dùng với mục đích kiểm tra contamination, nếu bộ lọc quá nhạy (như lỗi từ đơn tiếng Việt đã gặp) thì dữ liệu của job trước sẽ gây crash job sau.

---

## 10. Nơi Nào Storyboard/Renderer Có Thể Tự Thêm Content?

- **`src/production/shotPlanner.ts`:** Tự sinh ra các chuỗi văn bản mô tả hình ảnh `primaryVisual` (ví dụ: *"Toàn cảnh góc rộng trực diện của..."*, *"Cận cảnh chuyển động làm nổi bật tiêu đề..."*) và tự đặt `purpose` cho từng shot.
- **`src/hyperframes/template.ts`:** Tự động chèn thêm CTA box, deal box bán hàng Shopee/TikTok Shop (`affiliate-deal-box`) vào cuối video nếu cờ affiliate bật, mà không cần thông qua script đã duyệt.
- **`src/engine/videoCopywriter.ts`:** Tự suy diễn và cắt gọt headline màn hình độc lập với nội dung thoại của beat.

---

## KẾT LUẬN NGUYÊN NHÂN CỐT LÕI (ROOT CAUSE)

Engine hiện tại bị mất phương hướng đối với User Intent vì:
1. **Thiếu vắng một "Hợp đồng Ý định" duy nhất (Single Source of Truth):** Không có đối tượng `UserIntentSpec` và `TopicContract` bất biến để làm kim chỉ nam kiểm soát các bước downstream.
2. **Ám ảnh bởi công thức "Sáng tạo / Viral / Giữ chân":** Hệ thống bị cài đặt quá nhiều bộ sinh giả định (`ContentStrategist`, `CreativeAngleEngine`, `HookEngine`, `StoryArchitect`), luôn tự coi mình thông minh hơn người dùng, tự ý biến mọi yêu cầu thành kịch bản bán hàng, kịch bản giật gân, hoặc phim tài liệu kịch tính.
3. **Phân mảnh đường ống (Pipeline Fragmentation):** Tồn tại quá nhiều pipeline song song (`pipeline.ts`, `pipelineCoordinator.ts`, `videoGenerator.ts`, `masterVideoEngine.ts`), khiến dữ liệu bị biến dạng, tiền xử lý không đồng bộ trước khi đến renderer.
