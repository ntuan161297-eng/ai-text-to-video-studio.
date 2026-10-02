# 🚀 HƯỚNG DẪN TRIỂN KHAI & PHÁT HÀNH AI TEXT-TO-VIDEO STUDIO

Tài liệu này bao gồm 2 phương án triển khai:
- **🌟 PHƯƠNG ÁN 1 (KHUYÊN DÙNG): Đóng gói thành file cài đặt Windows `.EXE` trọn gói (Người nhận không cần cài thêm bất cứ thứ gì, kể cả Node.js hay Git).**
- **💻 PHƯƠNG ÁN 2: Dành cho lập trình viên (Đẩy code lên GitHub và clone về máy mới bằng lệnh).**

---

## 🌟 PHƯƠNG ÁN 1: BỘ CÀI ĐẶT WINDOWS (.EXE) TRỌN GÓI "1-CLICK"

### 1. File cài đặt nằm ở đâu?
File cài đặt hoàn chỉnh đã được đóng gói sẵn tại:
📁 **`installer\output\AI_Studio_Setup_v1.0.exe`** (Dung lượng ~200MB)

> **Điểm đặc biệt của file .EXE này:**
> - ✅ Tích hợp sẵn **Node.js Portable (v20)** bên trong.
> - ✅ Tích hợp sẵn **Toàn bộ thư viện dependencies** và **Bản build Web UI**.
> - ✅ Tích hợp sẵn **Chrome Headless** để render video chất lượng cao.
> - ❌ **Người dùng máy mới KHÔNG CẦN cài Node.js, KHÔNG CẦN cài Git, KHÔNG CẦN gõ bất kỳ dòng lệnh nào!**

---

### 2. Người dùng máy mới cài đặt thế nào?
1. Bạn gửi file `AI_Studio_Setup_v1.0.exe` cho người dùng (qua Google Drive, OneDrive, Zalo hoặc chép USB).
2. Người nhận nhấp đúp vào file `AI_Studio_Setup_v1.0.exe`.
3. Bấm **Tiếp tục (Next)** -> **Cài đặt (Install)**.
4. Màn hình Desktop sẽ tự động xuất hiện biểu tượng: **"AI Text to Video Studio"**.
5. Nhấp đúp biểu tượng ngoài màn hình: Trình duyệt sẽ tự động mở `http://localhost:3000` và sẵn sàng sử dụng ngay lập tức!
6. Khi muốn tắt ứng dụng: Vào Start Menu -> chọn **"Dừng Studio (Tat Studio)"**.

---

### 3. Khi bạn sửa code hoặc cập nhật tính năng mới, làm sao tạo lại file .EXE mới?
Bạn chỉ cần nhấp đúp vào file kịch bản tự động:
👉 **`Tao_Bo_Cai_Exe.bat`** (ngay thư mục gốc của dự án)
Hệ thống sẽ tự động quét bản cập nhật mới nhất, nén lại và xuất ra file `.exe` mới trong `installer\output\` chỉ sau 1-2 phút!

---

## 📌 PHƯƠNG ÁN 2: TRIỂN KHAI QUA GITHUB (CHO LẬP TRÌNH VIÊN)

### Bước 1.1: Cài đặt Git trên máy tính của bạn (Nếu chưa có)
1. Tải bản cài đặt Git chính thức cho Windows tại: [https://git-scm.com/download/win](https://git-scm.com/download/win) (Bấm chọn **64-bit Git for Windows Setup**).
2. Mở file vừa tải về, bấm **Next -> Next -> Install** theo mặc định là xong.

### Bước 1.2: Tạo một Repository (Kho lưu trữ) mới trên GitHub
1. Truy cập [https://github.com](https://github.com) và đăng nhập (hoặc đăng ký tài khoản miễn phí).
2. Bấm vào biểu tượng dấu **`+`** ở góc trên cùng bên phải -> Chọn **New repository**.
3. Điền các thông tin:
   * **Repository name**: ví dụ `ai-text-to-video-studio`.
   * **Quyền riêng tư**:
     * Chọn **Private** (nếu bạn muốn chỉ mình bạn và người bạn cho phép mới xem được code).
     * Hoặc chọn **Public** (nếu bạn muốn ai có link cũng tải được).
   * **Lưu ý**: KHÔNG tích chọn "Add a README file" hay ".gitignore" (vì trong dự án của chúng ta đã có sẵn file `.gitignore` chuẩn rồi).
4. Bấm **Create repository**. Bạn sẽ nhận được đường link dạng:
   `https://github.com/TÊN_GITHUB_CỦA_BẠN/ai-text-to-video-studio.git`

### Bước 1.3: Đẩy toàn bộ code lên GitHub bằng CMD / Terminal
Mở thư mục dự án này trên máy tính của bạn, mở terminal hoặc CMD tại thư mục dự án và chạy lần lượt các lệnh sau:

```bash
# 1. Khởi tạo Git trong thư mục dự án
git init

# 2. Thêm tất cả file mã nguồn (File .gitignore đã tự động loại bỏ node_modules và video nặng)
git add .

# 3. Tạo commit đầu tiên
git commit -m "Phiên bản AI Text-to-Video Studio hoàn thiện"

# 4. Đặt tên nhánh chính là main
git branch -M main

# 5. Liên kết tới kho lưu trữ GitHub của bạn (Thay link bằng link ở Bước 1.2 của bạn)
git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/ai-text-to-video-studio.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```
*(Nếu GitHub yêu cầu đăng nhập, một cửa sổ trình duyệt sẽ bật lên, bạn chỉ cần bấm **Authorize** hoặc đăng nhập tài khoản GitHub của bạn là xong).*

---

## 💻 PHẦN 2: CÁCH CÀI ĐẶT TRÊN MÁY TÍNH MỚI (MÁY NGƯỜI DÙNG KHÁC)

Khi sang một máy tính mới hoàn toàn, bạn hoặc người dùng chỉ cần thực hiện 3 bước cực kỳ đơn giản:

### Bước 2.1: Chuẩn bị môi trường (Chỉ làm 1 lần duy nhất trên máy mới)
1. **Cài Node.js**: Tải và cài đặt bản **Node.js LTS** tại: [https://nodejs.org/](https://nodejs.org/) (Cứ bấm Next liên tục).
2. **Cài Git**: Tải và cài Git tại: [https://git-scm.com/](https://git-scm.com/) (Để máy tính có thể kéo code về và sau này tự động bấm nút cập nhật).

### Bước 2.2: Tải mã nguồn về máy mới
Mở cửa sổ Command Prompt (CMD) hoặc PowerShell trên máy mới (ví dụ tại ổ đĩa `D:\` hoặc thư mục bất kỳ), gõ lệnh:

```bash
git clone https://github.com/TÊN_GITHUB_CỦA_BẠN/ai-text-to-video-studio.git
cd ai-text-to-video-studio
```
*(Hoặc nếu không muốn dùng lệnh git clone, bạn có thể tải file `.zip` từ GitHub về rồi giải nén ra thư mục).*

### Bước 2.3: Chạy cài đặt tự động 1-Click
Trong thư mục vừa tải về, người dùng sẽ thấy sẵn các file tiện ích:
1. **Nhấp đúp chuột vào file**:
   👉 `1_Cai_Dat_Lan_Dau.bat`
   *Script sẽ tự động khởi tạo file `.env`, tạo thư mục lưu trữ, cài đặt toàn bộ thư viện backend và build giao diện web hoàn chỉnh trong khoảng 1-2 phút.*
2. Sau khi cài xong, **nhấp đúp chuột vào file**:
   👉 `2_Khoi_Dong_Studio.bat`
   *Hệ thống sẽ tự động khởi chạy Backend Server (Port 4000), Giao diện Web (Port 3000) và tự động mở trình duyệt tại địa chỉ `http://localhost:3000`.*

---

## 🔑 PHẦN 3: HƯỚNG DẪN NGƯỜI DÙNG LẤY GOOGLE GEMINI API KEY (MIỄN PHÍ 0Đ)

Hệ thống của bạn đã được tối ưu để **chỉ cần duy nhất 01 key AI cho phần Kịch bản**. Giọng đọc (Edge TTS), Tìm kiếm ảnh, Sinh ảnh AI (Pollinations), Nhạc nền và Xuất video MP4 đều chạy **hoàn toàn miễn phí**.

Để không làm tốn chi phí của bạn, người dùng mới tự lấy key miễn phí của riêng họ theo các bước sau (chỉ mất 60 giây):

1. **Truy cập trang Google AI Studio**:
   👉 [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. **Đăng nhập bằng tài khoản Google (Gmail thông thường)** bất kỳ.
3. Bấm vào nút màu xanh **"Create API key"** -> Chọn **"Create API key in new project"**.
4. Bấm **Copy** chuỗi API Key vừa được tạo (chuỗi bắt đầu bằng `AIzaSy...`).
5. **Dán vào ứng dụng**:
   * Mở giao diện ứng dụng tại `http://localhost:3000`.
   * Vào mục **Cài đặt** -> chọn thẻ **AI & API** (hoặc bấm biểu tượng chìa khóa ở góc phải).
   * Chọn nhà cung cấp: **Google Gemini**, dán chuỗi API Key vào ô và bấm **"Lưu API Key"**.
   * Bấm nút **"Kiểm tra kết nối"** -> Báo màu xanh *"Kết nối thành công!"* là xong.

> 💡 **Lợi ích**: Hạn mức miễn phí của Google Gemini (Free Tier) cho phép gọi 15 lượt kịch bản mỗi phút hoàn toàn miễn phí, không yêu cầu nhập thẻ Visa/Mastercard. Mỗi người dùng một key riêng biệt, không ai ảnh hưởng đến ai.

---

## 🔄 PHẦN 4: CƠ CHẾ CẬP NHẬT KHI BẠN RA PHIÊN BẢN MỚI

Khi bạn hoàn thiện thêm tính năng hoặc sửa lỗi trên máy của bạn:

### 1. Phía bạn (Chủ phần mềm):
Bạn chỉ cần mở terminal trên máy bạn và đẩy bản mới lên GitHub:
```bash
git add .
git commit -m "Cập nhật tính năng mới"
git push
```

### 2. Phía máy người dùng (Khách hàng / Bạn bè thử nghiệm):
Họ có 2 cách để nhận bản mới nhất cực kỳ nhanh:
* **Cách 1 (Khuyên dùng)**: Người dùng chỉ cần nhấp đúp chuột vào file:
  👉 `3_Cap_Nhat_Phien_Ban_Moi.bat`
  *File sẽ tự động kết nối lên GitHub, kéo các đoạn mã mới về và tự động cập nhật hệ thống trong 10-15 giây mà không làm mất video hay cài đặt cũ của họ.*
* **Cách 2**: Vào trực tiếp Web UI mục **Cài đặt** -> Bấm nút **"Cập nhật hệ thống"** để cập nhật trực tiếp trên trình duyệt.
