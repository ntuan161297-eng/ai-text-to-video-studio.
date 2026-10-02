import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:4000/api';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runE2ETest() {
  console.log('🧪 BẮT ĐẦU END-TO-END TEST TOÀN DIỆN CHO MULTI-USER AI VIDEO APP');
  console.log('=================================================================\n');

  // 1. Kiểm tra health API
  console.log('👉 [1/6] Kiểm tra Health Check API...');
  const healthRes = await axios.get(`${API_BASE}/health`);
  console.log('✅ API Server đang hoạt động:', healthRes.data);

  // 2. Đăng ký & Đăng nhập User A
  console.log('\n👉 [2/6] Đăng ký & Đăng nhập Người dùng A...');
  const userAEmail = `tester_${Date.now()}@example.com`;
  const registerRes = await axios.post(`${API_BASE}/auth/register`, {
    email: userAEmail,
    password: 'password123',
    name: 'Kiểm Thử Viên A',
  });
  const tokenA = registerRes.data.token;
  console.log(`✅ Đã đăng ký User A: ${userAEmail} (ID: ${registerRes.data.user.id})`);

  // 3. Tạo video thông qua POST /api/videos
  console.log('\n👉 [3/6] Tạo video thông qua REST API POST /api/videos...');
  const createVideoRes = await axios.post(
    `${API_BASE}/videos`,
    {
      prompt: 'Tạo video ngắn 15 giây về sức mạnh của AI trong công việc văn phòng hiện đại',
      duration: 15,
      aspectRatio: '9:16',
      voice: 'vi-VN-HoaiMyNeural',
      style: 'Modern Tech',
      caption: true,
      bgm: true,
      engine: 'hyperframes',
    },
    {
      headers: { Authorization: `Bearer ${tokenA}` },
    }
  );

  const { videoId, jobId, status: initialStatus } = createVideoRes.data;
  console.log(`✅ API đã tiếp nhận job ngay lập tức:`);
  console.log(`   - Video ID: ${videoId}`);
  console.log(`   - Job ID: ${jobId}`);
  console.log(`   - Trạng thái ban đầu: ${initialStatus}`);

  // 4. Polling GET /api/videos/:id chờ Worker xử lý xong
  console.log('\n👉 [4/6] Worker đang xử lý job ở background. Bắt đầu polling GET /api/videos/:id...');
  let completed = false;
  let finalVideoData: any = null;
  const startTime = Date.now();

  for (let i = 0; i < 90; i++) {
    await sleep(2500);
    const statusRes = await axios.get(`${API_BASE}/videos/${videoId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const v = statusRes.data;
    console.log(
      `   [${((Date.now() - startTime) / 1000).toFixed(0)}s] Status: ${v.status} | Step: ${v.currentStep} | Progress: ${v.progress}%`
    );

    if (v.status === 'completed') {
      completed = true;
      finalVideoData = v;
      break;
    }

    if (v.status === 'failed') {
      throw new Error(`Video job bị thất bại: ${v.error}`);
    }
  }

  if (!completed || !finalVideoData) {
    throw new Error('Hết thời gian chờ tạo video (timeout)');
  }

  console.log('\n✅ Video đã được tạo thành công 100%!');
  console.log(`   - Output URL: ${finalVideoData.outputUrl}`);
  console.log(`   - Trạng thái DB: ${finalVideoData.status}`);
  console.log(`   - Tiến độ: ${finalVideoData.progress}%`);

  // 5. Kiểm tra file MP4 thực sự tồn tại trên đĩa cứng
  console.log('\n👉 [5/6] Xác minh file MP4 vật lý trên đĩa cứng...');
  const urlParts = finalVideoData.outputUrl.split('/output/');
  const fileName = urlParts[1];
  const localFilePath = path.resolve('./output', fileName);

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`File MP4 không tìm thấy tại đường dẫn: ${localFilePath}`);
  }

  const stat = fs.statSync(localFilePath);
  console.log(`✅ File MP4 đã được xác nhận:`);
  console.log(`   - Đường dẫn: ${localFilePath}`);
  console.log(`   - Dung lượng: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
  if (stat.size < 100000) {
    throw new Error('Dung lượng file MP4 quá nhỏ hoặc bất thường');
  }

  // 6. Kiểm tra Bảo mật Đa người dùng (Multi-user Isolation)
  console.log('\n👉 [6/6] Kiểm tra bảo mật: Không cho user khác đọc video này...');
  const userBEmail = `user_intruder_${Date.now()}@example.com`;
  const regB = await axios.post(`${API_BASE}/auth/register`, {
    email: userBEmail,
    password: 'password123',
    name: 'Người Dùng Khác B',
  });
  const tokenB = regB.data.token;

  try {
    await axios.get(`${API_BASE}/videos/${videoId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    throw new Error('LỖI BẢO MẬT: User B có thể đọc video của User A!');
  } catch (secErr: any) {
    if (secErr.response && secErr.response.status === 404) {
      console.log('✅ BẢO MẬT ĐÃ ĐƯỢC XÁC THỰC: User B bị chặn (404 Not Found) khi cố truy cập video của User A!');
    } else {
      throw secErr;
    }
  }

  console.log('\n🎉 =================================================================');
  console.log('🏆 TẤT CẢ CÁC BƯỚC END-TO-END TEST ĐỀU ĐÃ ĐẠT CHUẨN THÀNH CÔNG 100%!');
  console.log('=================================================================\n');
}

runE2ETest().catch((err) => {
  console.error('\n❌ E2E TEST THẤT BẠI:');
  console.error(err.message || err);
  if (err.response?.data) {
    console.error('API Response Data:', err.response.data);
  }
  process.exit(1);
});
