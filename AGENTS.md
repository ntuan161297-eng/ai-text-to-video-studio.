# ANTIGRAVITY AGENT BEHAVIOR — REVISION & INTENT CLASSIFICATION

## Mandatory Intent Classification (Section 14)

Khi người dùng nhận xét/góp ý về output của video hiện tại:
TUYỆT ĐỐI KHÔNG tự động generate video khác ngay.

Trước tiên xác định rõ intent:
1. **User yêu cầu sửa video hiện tại** → `REVISE_EXISTING`
   - Bắt buộc xác định `baseVideoId` và `baseVersionId`.
   - Phân loại `revisionScope`: `SCRIPT`, `VISUAL`, `VOICE`, `CAPTION`, `FULL`.
   - Áp dụng Copy-on-Write (v1 giữ nguyên, tạo v2).
2. **User chỉ đang thảo luận / chẩn đoán / góp ý** → `FEEDBACK_ONLY`
   - Chỉ phân tích vấn đề, liệt kê các phân cảnh/yếu tố cần cải thiện.
   - TUYỆT ĐỐI KHÔNG render tự động khi user chưa ra lệnh.
   - Các câu như:
     - "video này ảnh chưa đúng"
     - "caption chưa đẹp"
     - "voice bị cụt"
     - "scene 3 nhìn hơi tối"
     Mặc định là FEEDBACK / DIAGNOSIS, KHÔNG phải lệnh render mới.
3. **User yêu cầu video mới** → `CREATE_NEW`
   - Blank state hoàn toàn, không kế thừa prompt, script, assets, voice, research từ video cũ.
