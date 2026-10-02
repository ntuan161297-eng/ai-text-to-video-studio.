# BÁO CÁO KIỂM TOÁN VĂN MẪU & CÔNG THỨC NỘI DUNG (CONTENT TEMPLATE AUDIT)
**Dự án:** Universal Multi-Domain Video Engine  
**Mục tiêu:** Bóc tách tận gốc các mẫu câu hùng biện (rhetorical formulas), các cấu trúc kịch bản đóng khung (rigid skeletons) và giải quyết triệt để vấn đề "nói một giọng" của engine.

---

## 1. Nguồn Gốc Sâu Xa Của Các Mẫu Câu Hùng Biện Cố Định

Qua rà soát chi tiết, hiện tượng các video xuất xưởng đều dùng chung một bộ mẫu câu tu từ ("Đa số mọi người...", "Sự thật bất ngờ...", "Cho đến khi tận mắt thấy...") **KHÔNG PHẢI do LLM tự suy diễn ngẫu nhiên**, mà bắt nguồn từ **4 MODULE CỨNG TRONG CODE**:

### 1.1. Module 1: `src/brain/hookCandidateEngine.ts` (Dòng 43-108)
Đây là "thủ phạm" trực tiếp sinh ra các câu mở đầu kích động:
- **Cơ chế 2 (Contradiction - Điểm 95, luôn được chọn đầu tiên khi không có số liệu):**
  ```ts
  hookText: `Đa số đều nghĩ ${mainEntity} chỉ bình thường, cho đến khi tận mắt thấy điều này!`
  ```
  *(Đây chính là nguồn gốc trực tiếp của mẫu câu "đa số mọi người..." và "cho đến khi..." mà người dùng phản ánh).*
- **Cơ chế 1 (Specific Fact - Điểm 93):**
  ```ts
  hookText: `Con số ${keyStat} này của ${mainEntity} đang khiến cả thị trường phải nhìn nhận lại!`
  ```
- **Cơ chế 4 (Reveal - Điểm 91):**
  ```ts
  hookText: `Sự thật đằng sau ${mainEntity} sẽ khiến bạn phải thay đổi hoàn toàn suy nghĩ!`
  ```
- **Cơ chế 5 (Question - Điểm 92):**
  ```ts
  hookText: `Liệu ${mainEntity} có thực sự xuất sắc như những gì người ta đang đồn thổi?`
  ```

### 1.2. Module 2: `src/providers/llm/ruleBasedLLM.ts` (Dòng 48-79)
File này chứa sẵn mảng `defaultThemes` với các câu văn mẫu bằng tiếng Việt:
- Scene 1: `"Bạn có biết điều này không? ${title}! Hãy xem hết video để không bỏ lỡ."`
- Scene 2: `"Đa số mọi người đều hiểu nhầm về vấn đề này. Sự thật thực sự khiến nhiều người bất ngờ."`
- Scene 3: `"Điểm mấu chốt nằm ở chỗ mọi thứ thay đổi rất nhanh khi bạn nắm được nguyên lý cơ bản này."`
- Scene 4: `"Khi áp dụng đúng cách, hiệu quả mang lại sẽ vượt xa những gì bạn có thể tưởng tượng."`
- Scene 5: `"Hãy lưu ngay video này lại và bình luận ý kiến của bạn bên dưới nhé!"`

### 1.3. Module 3: `src/brain/seniorScriptWriter.ts` (Dòng 95-145)
Tạo ra các câu nối chuyển ý sáo rỗng:
- Đoạn Setup:
  ```ts
  `Khi nhìn vào ${mainEntity}, điểm khiến giới chuyên môn chú ý trước hết là nền tảng thiết kế vượt trội và tính thực tiễn cao.`
  ```
- Đoạn Đột phá:
  ```ts
  `Mấu chốt nằm ở chỗ, ${cleanClaim...}`
  `Yếu tố cốt lõi thay đổi cuộc chơi chính là khả năng tối ưu hóa hiệu năng, mang lại trải nghiệm hoàn toàn khác biệt.`
  ```
- Đoạn Bằng chứng:
  ```ts
  `Minh chứng rõ nhất là ${cleanClaim...}`
  `Các kiểm nghiệm thực tế đã chứng minh đây không chỉ là lời hứa, mà là năng lực đã được định lượng rõ ràng.`
  ```
- Đoạn Kết (Luôn áp dụng cho 100% video):
  ```ts
  `Tựu trung lại, ${mainEntity} đã chứng minh một điều rõ ràng: khi giá trị thực tế gặp đúng thời điểm, sự bứt phá là điều tất yếu.`
  ```

### 1.4. Module 4: `src/services/viralScriptEngine.ts` (Dòng 42-60)
- Mẫu câu: `"Nếu bạn nghĩ ${topic} chỉ có nắng gió, thì 60 giây sau đây sẽ thay đổi hoàn toàn suy nghĩ của bạn!"`

---

## 2. Bản Đồ Các Cấu Trúc Khung (Rigid Skeletons) Đang Bó Buộc Hệ Thống

| Tên Khung Cũ | Vị Trí Code | Cách Vận Hành Cứng Nhắc | Tác Hại |
|---|---|---|---|
| **Viral Short Arc** | `src/brain/scriptDurationOptimizer.ts` & `seniorScriptWriter.ts` | Bắt buộc mọi video phải đi qua: `Hook -> Setup -> Progression -> Evidence -> Payoff -> CTA` | Video 30s giải thích định nghĩa toán học cũng bị ép phải có Setup, Đột phá, Bằng chứng và Kêu gọi bình luận. |
| **Fixed Shot Slicing** | `src/production/shotPlanner.ts` | Cứ mỗi beat tự động chặt đôi làm 2 shot: `Shot 1 (45%) -> Shot 2 (55%)` | Không có lý do nghệ thuật, tạo nhịp cắt cơ học vô nghĩa. |
| **5 Story Arcs Cố Định** | `src/engine/storyArchitect.ts` | Ép vào 1 trong 5: `HERO_JOURNEY`, `PROBLEM_AGITATION`, `MYSTERY_REVEAL`, `DIRECT_VALUE`, `COMPARATIVE_SHOWDOWN` | Khóa tư duy của hệ thống vào các kịch bản kể chuyện hư cấu. |
| **4 Mẫu CTA Switch-case** | `src/brain/seniorScriptWriter.ts` | Dựa vào danh mục để gán: Bình luận, Lưu, Theo dõi, Đánh giá | Người dùng không yêu cầu vẫn bị nhét CTA vào cuối video. |

---

## 3. Nguyên Tắc Cốt Lõi: Content Mode KHÔNG Phải Là Script Template

Content Mode (chế độ nội dung) chỉ là một thuộc tính mô tả **MỤC ĐÍCH GIAO TIẾP**:
- `EXPLAINER`: Mục tiêu là làm rõ nguyên lý/cơ chế.
- `DOCUMENTARY`: Mục tiêu là thuật lại sự kiện lịch sử/khoa học với dẫn chứng.
- `NEWS`: Mục tiêu là truyền tải sự thật mới nhất nhanh chóng, trung lập.
- `REVIEW`: Mục tiêu là đánh giá ưu nhược điểm khách quan.
- `TUTORIAL / HOW-TO`: Mục tiêu là hướng dẫn từng bước thực hành.
- `SHOWCASE / INTRO`: Mục tiêu là làm nổi bật các đặc tính chính.

**Quy tắc bất biến:**
1. Hai video cùng là `EXPLAINER` vẫn có thể có:
   - Một video mở đầu bằng câu hỏi trực tiếp, video kia mở đầu bằng kết quả thực nghiệm.
   - Một video dùng cấu trúc 3 phần, video kia dùng cấu trúc đối chiếu A/B.
   - Một video có giọng điệu nghiêm túc, video kia nhẹ nhàng dễ hiểu.
2. Tuyệt đối không dùng Switch-case trên Content Mode để gán các chuỗi văn bản mẫu.
3. Không bắt buộc Content Mode phải nằm trong một danh sách đóng hữu hạn.

---

## 4. Giải Pháp: Sinh Cấu Trúc Động Theo Từng Request (Dynamic ContentStructurePlan)

Mỗi request sẽ do `ContentPlanner` thiết kế một `ContentStructurePlan` riêng biệt:

```ts
interface ContentStructurePlan {
  structureReason: string; // Lý do lựa chọn cấu trúc này dựa trên UserIntentSpec
  narrativeFlow: 'LINEAR' | 'INVERTED_PYRAMID' | 'STEP_BY_STEP' | 'COMPARATIVE' | 'DIRECT_STATEMENT';
  needHook: boolean;       // Chỉ true nếu mục tiêu là thu hút đại chúng
  needCta: boolean;        // Chỉ true nếu người dùng yêu cầu
  sections: Array<{
    sectionIndex: number;
    purpose: string;       // Mục đích phục vụ TopicContract của đoạn này
    contentCore: string;   // Ý chính cần truyền đạt lấy từ KnowledgeBrief
    targetDurationSec: number;
  }>;
  endingStrategy: 'SUMMARY' | 'CONCLUSION' | 'OPEN_QUESTION' | 'DIRECT_SIGN_OFF';
}
```

Mỗi section tồn tại là vì **nhu cầu truyền tải thông tin của request hiện tại**, không phải vì "template đòi hỏi phải có 5 đoạn".
