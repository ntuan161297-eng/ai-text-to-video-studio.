# BÁO CÁO KIỂM TOÁN PROMPT & HƯỚNG DẪN LLM (PROMPT TEMPLATE AUDIT)
**Dự án:** Universal Multi-Domain Video Engine  
**Mục tiêu:** Rà soát toàn bộ các câu lệnh hệ thống (System Prompts), các ví dụ Few-Shot và các mẫu Prompt đang gửi cho LLM nhằm ngăn chặn nguy cơ nhiễm phong cách hoặc khóa cứng hành vi.

---

## 1. Rà Soát Toàn Bộ Các Điểm Gọi LLM Trong Hệ Thống

Hiện tại, mã nguồn có 3 LLM Providers:
1. `src/providers/llm/geminiLLM.ts`
2. `src/providers/llm/openAILLM.ts`
3. `src/providers/llm/ruleBasedLLM.ts`

Ngoài ra, trong pipeline HyperFrames (`MasterVideoEngine`), kịch bản hiện tại được lắp ráp cơ học qua `SeniorScriptWriter.ts` chứ không gọi trực tiếp API LLM. Tuy nhiên, khi chuyển sang Adaptive Architecture có sự tham gia của LLM vào tầng `AdaptiveScriptWriter` và `ContentPlanner`, các System Prompts phải được thanh lọc triệt để.

---

## 2. Các Lỗi Nghiêm Trọng Trong System Prompt Hiện Tại

### 2.1. Lỗi Khóa Thể Loại Kênh (Channel Role Lock-in)
- **Văn bản hiện tại trong `geminiLLM.ts` (L21) và `openAILLM.ts` (L21):**
  ```text
  "Bạn là đạo diễn kịch bản video ngắn TikTok/Shorts/Reels chuyên nghiệp bằng tiếng Việt."
  ```
- **Tác hại:**
  - Định hình ngay lập tức "nhân cách AI" (persona) thành một nhà sáng tạo nội dung giật tít, câu view trên mạng xã hội.
  - LLM tự động sử dụng từ ngữ khoa trương, nhịp điệu dồn dập, dùng các từ cảm thán không phù hợp với các video học thuật, tin tức, giới thiệu doanh nghiệp hoặc video nghệ thuật.
- **Khắc phục:**
  - Thay bằng persona trung tính:
  ```text
  "Bạn là chuyên gia biên kịch video đa phương tiện chuyên nghiệp. Nhiệm vụ của bạn là truyền tải chính xác và hiệu quả nhất yêu cầu của người dùng, tôn trọng mục tiêu giao tiếp, tính xác thực của dữ kiện và thời lượng được chỉ định."
  ```

### 2.2. Lỗi Khóa Bố Cục Hình Ảnh (Visual Ratio Lock-in)
- **Văn bản hiện tại trong `geminiLLM.ts` (L30) và `openAILLM.ts` (L30):**
  ```text
  "cinematic, 9:16 vertical ratio, aesthetic photography"
  ```
- **Tác hại:** Mọi visual prompt đều bị ép thành tỷ lệ dọc 9:16, khiến khi người dùng chọn tỷ lệ 16:9 (ngang) hoặc 1:1 (vuông), AI sinh ảnh và layout video vẫn hành xử như video dọc.
- **Khắc phục:** Tỷ lệ khung hình và phong cách hình ảnh phải được đưa vào dưới dạng biến số động từ `UserIntentSpec.targetAspectRatio` và `UserIntentSpec.visualExpectation`.

### 2.3. Lỗi Ép Cứng Tốc Độ Đọc Cố Định
- **Văn bản hiện tại:**
  ```text
  "- Tốc độ đọc tiếng Việt: khoảng 3 - 3.5 từ/giây. Với video ${targetDuration}s, tổng số từ của toàn bộ voice-over nên khoảng ${Math.round(targetDuration * 3.2)} từ."
  ```
- **Tác hại:** Tốc độ 3.5 từ/giây là tốc độ đọc dồn dập của video TikTok tin nhanh. Với một video suy ngẫm, phóng sự tài liệu hay hướng dẫn học tập, tốc độ chỉ nên từ 2.2 - 2.6 từ/giây. Ép 3.5 từ/giây khiến kịch bản quá nhiều chữ, khi TTS đọc chậm sẽ gây tràn thời lượng nghiêm trọng.
- **Khắc phục:** Cho phép `ContentPlanner` xác định tốc độ phù hợp dựa trên `desiredTone` và `contentMode`.

---

## 3. Nguy Cơ Từ Các Ví Dụ Few-Shot (Few-Shot Style Contamination)

**Quy tắc bất biến:**
1. **Không bao giờ đưa kịch bản mẫu hoàn chỉnh vào System Prompt:** Khi đưa một đoạn kịch bản về xe máy điện hoặc du lịch làm mẫu JSON, LLM sẽ bắt chước từ vựng, cấu trúc câu và giọng điệu của kịch bản đó cho các chủ đề hoàn toàn khác.
2. **Chỉ hướng dẫn bằng nguyên tắc (Principles), không dùng văn mẫu (Phrases):**
   - *Cách làm SAI:* "Ví dụ câu mở đầu: Đa số mọi người đều hiểu nhầm về..." -> Model sẽ nhại lại cấu trúc "Đa số mọi người...".
   - *Cách làm ĐÚNG:* "Câu mở đầu phải khẳng định ngay chủ thể của video trong vòng 5 từ đầu tiên hoặc nêu bật câu hỏi cốt lõi của người xem."
3. **Schema JSON phải dùng Placeholder trung tính:**
   ```json
   {
     "sections": [
       {
         "sectionIndex": 1,
         "purpose": "State the main thesis clearly",
         "voiceText": "[Lời dẫn tự nhiên bằng tiếng Việt làm rõ luận điểm chính mà không dùng từ ngữ sáo rỗng]",
         "screenHeadline": "[Tiêu đề ngắn 3-5 từ nêu bật ý chính]"
       }
     ]
   }
   ```

---

## 4. Bảng Tiêu Chuẩn Viết Phổ Quát (Universal Writing Standards)

Mọi hướng dẫn biên kịch gửi tới Writer (cả code lẫn LLM) phải tuân thủ 8 nguyên tắc phổ quát:

| Nguyên Tắc | Định Nghĩa Yêu Cầu | Tiêu Chí Kiểm Tra (Gate) |
|---|---|---|
| **1. Relevance (Bám sát đề)** | Mọi câu chữ phải phục vụ trực tiếp cho `TopicContract`. | Không có thông tin ngoài lề, không lan man sang chủ đề khác. |
| **2. Clarity (Rõ ràng)** | Mỗi câu chỉ truyền tải một ý rõ ràng, mạch lạc, dễ nghe. | Không dùng câu ghép phức tạp quá 25 từ gây khó thở cho giọng đọc. |
| **3. Specificity (Cụ thể)** | Dùng danh từ riêng, số liệu và sự thật cụ thể thay vì lời nói chung chung. | Cấm các tính từ sáo rỗng: *"vô cùng tuyệt vời"*, *"thực sự bứt phá"*, *"thay đổi cuộc chơi"*. |
| **4. Accuracy (Chính xác)** | 100% factual claims phải bắt nguồn từ `KnowledgeBrief`. | Không tự bịa thông số, ngày tháng, danh tính. |
| **5. Natural Speech (Tự nhiên)** | Câu văn viết để NÓI (spoken Vietnamese), không phải văn viết sách báo. | Không dùng cấu trúc dịch thuật thô thiển tiếng Anh ("được thực hiện bởi...", "điều này dẫn đến việc..."). |
| **6. No Filler (Không rác)** | Loại bỏ toàn bộ các câu đệm vô giá trị ("như chúng ta đã biết", "hôm nay tôi sẽ kể cho các bạn"). | Xóa ngay câu đó nếu nội dung chính của video không hề bị ảnh hưởng. |
| **7. Proportional Depth (Độ sâu tương xứng)** | Thời lượng ngắn -> chọn lọc 1-2 ý cốt lõi; thời lượng dài -> mở rộng bối cảnh và dẫn chứng. | Không dồn ép 10 ý vào video 30 giây. |
| **8. Intent-Driven Tone (Giọng điệu theo ý định)** | Tông giọng thích ứng theo `UserIntentSpec.desiredTone` (điềm đạm, trang trọng, hào hứng, sâu lắng). | Không mặc định một tông giọng giật gân cho mọi video. |
