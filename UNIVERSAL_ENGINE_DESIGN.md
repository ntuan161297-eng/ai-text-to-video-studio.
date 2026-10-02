# THIẾT KẾ ĐỘNG CƠ TẠO VIDEO PHỔ QUÁT ĐA LĨNH VỰC
# (UNIVERSAL MULTI-DOMAIN VIDEO ENGINE DESIGN)
**Phiên bản:** 3.0.0 — Canonical Adaptive Architecture  
**Tôn chỉ:** Không giả định kênh • Không văn mẫu • Ý định người dùng quyết định tất cả

---

## 1. Danh Sách Những Phần Cần XÓA TRƯỚC TIÊN (Explicit Removal List)

Trước khi viết bất kỳ tính năng mới nào, toàn bộ các module và cấu trúc sau đây phải được dọn sạch:

1. **XÓA BỎ các module văn mẫu và suy diễn sáng tạo áp đặt:**
   - `src/brain/hookCandidateEngine.ts`: Xóa bỏ 5 mẫu hook giật gân cứng với điểm số giả 95, 93, 91.
   - `src/brain/creativeAngleEngine.ts`: Xóa bỏ danh sách góc tiếp cận tĩnh (Discovery, Problem-Solution, Contrarian).
   - `src/brain/contentStrategist.ts`: Xóa bỏ switch-case gán cứng "nỗi đau người xem", "lời hứa" theo danh mục.
   - `src/services/viralScriptEngine.ts`: Xóa bỏ toàn bộ file văn mẫu cũ.
   - `src/engine/storyArchitect.ts`: Xóa bỏ các khung Hero's Journey / Mystery Reveal cố định.
   - `src/engine/creativeHistory.ts`: Xóa bỏ cơ chế đọc lịch sử để ép đổi phong cách của job sau.

2. **XÓA BỎ các câu văn mẫu fallback trong `SeniorScriptWriter.ts`:**
   - Xóa bỏ các câu dẫn dắt: *"Khi nhìn vào..."*, *"Mấu chốt nằm ở chỗ..."*, *"Minh chứng rõ nhất là..."*, *"Yếu tố cốt lõi thay đổi cuộc chơi..."*.
   - Xóa bỏ câu kết thúc sáo rỗng: *"Tựu trung lại... khi giá trị thực tế gặp đúng thời điểm..."*.
   - Xóa bỏ 4 mẫu CTA switch-case tự động chèn vào cuối video.

3. **XÓA BỎ các hạn chế và ép khuôn kỹ thuật:**
   - Xóa bỏ quy tắc snap duration về tập `[30, 45, 60, 90, 120, 180]` trong `InputUnderstandingEngine` và `ScriptDurationOptimizer`.
   - Xóa bỏ hạn chế schema Zod chỉ cho chọn 4 mốc thời lượng trong `videoRoutes.ts`.
   - Xóa bỏ giả định `targetPlatform: 'tiktok'` trong toàn bộ hệ thống.
   - Xóa bỏ tiền xử lý phân nhánh `ResearchEngine` thừa thãi trong `videoGenerator.ts`.

---

## 2. Kiến Trúc 6 Tầng Thống Nhất (The 6-Layer Universal Architecture)

Hệ thống được quy về **MỘT ENGINE DUY NHẤT** (`CanonicalVideoEngine`) gồm 6 tầng kết nối chặt chẽ qua các Data Contracts bất biến:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TẦNG 1: HIỂU Ý ĐỊNH & THIẾT LẬP HỢP ĐỒNG (Intent & Contracts)         │
│ • UniversalIntentUnderstandingEngine: Phân tích đa chiều request       │
│ • Intent Confidence Gate: Kiểm tra độ tin cậy, gắn NEEDS_CLARIFICATION │
│ • Tạo TopicContract (ranh giới bất biến) & DurationContract (cam kết)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 2: NGHIÊN CỨU & NÉN TRI THỨC THÍCH ỨNG (Adaptive Knowledge)       │
│ • AdaptiveResearchPlanner: Chỉ tìm điều cần thiết, có điều kiện dừng   │
│ • Discovery & Clean: Bóc tách bài viết thật, loại bỏ rác web          │
│ • FactVerificationEngine: VerifiedFact[] (Bắt buộc có Evidence)        │
│ • KnowledgeBrief: Nén dữ liệu cô đọng, loại bỏ toàn bộ metadata thừa    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 3: HOẠCH ĐỊNH NỘI DUNG & BIÊN KỊCH (Adaptive Content & Script)   │
│ • ContentPlanner: Sinh ContentStructurePlan động theo từng request     │
│   (Quyết định: Cần hook không? Cần CTA không? Độ sâu bao nhiêu beat?)  │
│ • UniversalScriptWriter: Viết văn tự nhiên, không rác, không văn mẫu   │
│ • Content Value Check & Topic Fidelity Check: Loại bỏ câu OFF_TOPIC    │
│ • IndependentScriptReviewer: Kiểm định độc lập -> ApprovedScript       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 4: ĐỒNG BỘ THỜI LƯỢNG QUA GIỌNG ĐỌC (Voice-Driven Duration Loop) │
│ • VoiceDirector (TTS): Phát âm thật -> Đo audio timestamps chính xác   │
│ • Duration Reconciliation Loop:                                        │
│   - Nếu audio > maxDuration: Rút gọn kịch bản tại tầng nội dung       │
│   - Nếu audio < minDuration: Bổ sung ý từ KnowledgeBrief               │
│   - Tái sinh TTS cho đến khi khớp chuẩn DurationContract               │
│ • Khóa cứng timeline: Audio là nguồn chân lý thời gian duy nhất        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 5: HÌNH ẢNH HÓA & XÁC MINH TƯ LIỆU (Visual & Asset Production)   │
│ • StoryboardPlanner: Phục vụ 100% ApprovedScript, không thêm claim mới │
│ • VisualIntentEngine: Xác định ý nghĩa hình ảnh của từng cảnh          │
│ • EntityAssetEngine & AssetVerifier: Ưu tiên ảnh thật cho thực thể thật│
│   - Fallback trung tính (biểu đồ, số liệu, typography) nếu thiếu       │
│ • RenderManifest: Đóng gói toàn bộ tài nguyên đã kiểm định             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 6: KẾT XUẤT & ĐẢM BẢO CHẤT LƯỢNG (Render & Post-QA)              │
│ • PreRenderQualityGate: Kiểm tra an toàn kỹ thuật (tràn chữ, audio)    │
│ • HyperFrames Engine: Render HTML/CSS/GSAP thành MP4 sắc nét          │
│ • Final Output QA: Đánh giá video cuối cùng (kỹ thuật, âm thanh, hình) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Chi Tiết Các Cấu Trúc Dữ Liệu Cốt Lõi (Core Contracts)

### 3.1. `UserIntentSpec`
```ts
export interface UserIntentSpec {
  requestId: string;
  originalUserRequest: string;
  primarySubject: string;
  userGoal: 'INFORM' | 'EDUCATE' | 'REVIEW' | 'ENTERTAIN' | 'INSPIRE' | 'PROMOTE' | 'DOCUMENT';
  communicationGoal: string;
  audience: string;
  contentMode: string;              // Mở, không giới hạn danh sách cứng
  informationDepth: 'HIGH' | 'MEDIUM' | 'SUMMARY';
  tone: string;                     // Điềm đạm, hào hứng, hài hước, trang trọng...
  factualityLevel: 'STRICT' | 'BALANCED' | 'CREATIVE';
  freshnessRequirement: 'LATEST' | 'RECENT' | 'EVERGREEN';
  requestedDurationSeconds: number; // Thời lượng người dùng yêu cầu (giữ nguyên)
  targetPlatform: string;           // 'web' | 'youtube' | 'tiktok' | 'internal' | 'general'
  targetAspectRatio: '9:16' | '16:9' | '1:1';
  visualExpectation: 'REAL_FOOTAGE' | 'INFOGRAPHIC' | 'TYPOGRAPHY' | 'MIXED';
  userConstraints: string[];
  excludedScope: string[];
  assumptions: string[];
  ambiguities: string[];
  confidenceScore: number;
  needsClarification: boolean;
}
```

### 3.2. `TopicContract`
```ts
export interface TopicContract {
  coreTopic: string;
  coreQuestion: string;
  requiredCoverage: string[];
  allowedExpansion: string[];
  prohibitedExpansion: string[];
  requiredEntities: string[];
  relevanceCriteria: string;
}
```

### 3.3. `DurationContract`
```ts
export interface DurationContract {
  requestedSeconds: number;
  minimumAcceptedSeconds: number; // e.g. requested - 2s
  maximumAcceptedSeconds: number; // e.g. requested + 2s
}
```

### 3.4. `ContentStructurePlan`
```ts
export interface ContentStructurePlan {
  structureReason: string;
  narrativeFlow: 'LINEAR' | 'INVERTED_PYRAMID' | 'STEP_BY_STEP' | 'COMPARATIVE' | 'DIRECT_STATEMENT';
  needHook: boolean;
  openingStyle: 'DIRECT_STATEMENT' | 'QUESTION' | 'KEY_FACT' | 'SCENE_SETTING';
  needCta: boolean;
  ctaMessage?: string;
  sections: Array<{
    sectionIndex: number;
    purpose: string;
    contentCore: string;
    targetSeconds: number;
  }>;
  endingStrategy: 'SUMMARY' | 'CONCLUSION' | 'OPEN_QUESTION' | 'DIRECT_SIGN_OFF';
}
```

---

## 4. Cơ Chế Thích Ứng Mọi Lĩnh Vực (Universal Domain Adaptation)

Hệ thống **không viết riêng từng engine** (như `travelEngine`, `foodEngine`, `newsEngine`), mà vận hành theo ma trận thích ứng từ `UserIntentSpec`:

| Yêu Cầu Của Người Dùng | Cách Engine Tự Thích Ứng |
|---|---|
| **Tin tức thời sự (News)** | `freshness: LATEST`, `factuality: STRICT`, `opening: DIRECT_STATEMENT`. Không hook giật gân, không câu đố, ưu tiên sự kiện và nguồn tin chính thống. |
| **Đánh giá sản phẩm (Review)** | `contentMode: REVIEW`, tập trung tiêu chí đánh giá (ưu/nhược, thông số), ưu tiên ảnh/video thật của sản phẩm. Không dùng văn mẫu triết lý. |
| **Giới thiệu du lịch / Văn hóa** | `contentMode: TRAVEL`, hình ảnh cảnh quan và di sản thực tế, giọng điệu truyền cảm hứng, giới thiệu đặc sắc địa phương. |
| **Giải thích khoa học (Explainer)** | `contentMode: EXPLAINER`, `narrativeFlow: STEP_BY_STEP`. Phân tách nguyên lý từ dễ đến sâu, ưu tiên đồ họa giải thích và số liệu trực quan. |
| **Hướng dẫn thực hành (Tutorial)** | `contentMode: TUTORIAL`, cấu trúc theo các bước thực hiện tuần tự, màn hình hiển thị text hướng dẫn súc tích. |
| **Nội dung ngắn đại chúng** | Khi user yêu cầu video giải trí ngắn: `needHook: true`, nhịp dựng nhanh, mở đầu ấn tượng. |

---

## 5. Kế Hoạch Triển Khai (Implementation Steps)

1. **Bước 1 — Xóa bỏ các file và logic hard-code cũ:**
   - Dọn sạch `hookCandidateEngine.ts`, `viralScriptEngine.ts`, `creativeAngleEngine.ts`, `contentStrategist.ts`, `storyArchitect.ts`.
   - Ngắt kết nối `creativeHistory.ts` khỏi pipeline.
2. **Bước 2 — Xây dựng `UserIntentSpec`, `TopicContract`, `DurationContract`:**
   - Refactor `InputUnderstandingEngine` thành `UniversalIntentEngine`.
   - Thêm `IntentConfidenceGate` để bắt các trường hợp mơ hồ (`NEEDS_CLARIFICATION`).
3. **Bước 3 — Xây dựng `AdaptiveResearchPlanner`:**
   - Thay thế việc tìm kiếm theo mẫu cố định bằng tìm kiếm theo câu hỏi thực sự cần xác minh.
4. **Bước 4 — Xây dựng `ContentPlanner` & `UniversalScriptWriter`:**
   - Tạo `ContentStructurePlan` động cho từng request.
   - Viết kịch bản tự nhiên, tuân thủ `TopicContract` và tiêu chuẩn 8 điểm không văn mẫu.
5. **Bước 5 — Triển khai `Voice-Driven Duration Reconciliation Loop`:**
   - Điều chỉnh độ dài kịch bản dựa trên thời lượng phát âm thực tế của TTS.
6. **Bước 6 — Đồng bộ Storyboard & RenderManifest:**
   - Bảo đảm Storyboard tuân thủ 100% kịch bản đã duyệt.
   - Thống nhất entry point trong `videoGenerator.ts`, `videoWorker.ts` và `cli.ts` về một pipeline duy nhất.
7. **Bước 7 — Kiểm thử Cross-Domain Regression:**
   - Chạy kiểm thử trên ma trận nhiều lĩnh vực (Khoa học, Du lịch, Sản phẩm, Tin tức, Hướng dẫn) để chứng minh tính thích ứng hoàn toàn.
