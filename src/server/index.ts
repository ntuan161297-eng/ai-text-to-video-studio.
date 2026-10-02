import dotenv from 'dotenv';
dotenv.config({ override: true });
import { app } from './app.js';
import { getDatabase } from '../database/db.js';
import { getVideoQueue } from '../queue/videoQueue.js';
import { startWorker } from '../worker/videoWorker.js';
import { SecretStore } from '../ai/secretStore.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  console.log('🚀 Đang khởi động Backend Server AI Text to Video...');

  // Khởi tạo Database
  const db = await getDatabase();
  await db.init();

  // Tự động khôi phục khóa AI từ Database vào process.env
  try {
    const creds = await db.getAICredentials();
    const readyGemini = creds.find((c) => c.provider === 'GEMINI' && c.status === 'READY');
    if (readyGemini && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0)) {
      process.env.GEMINI_API_KEY = SecretStore.decrypt({
        encryptedKey: readyGemini.encryptedKey,
        iv: readyGemini.iv,
        authTag: readyGemini.authTag,
      });
    }
    const readyOpenAI = creds.find((c) => c.provider === 'OPENAI' && c.status === 'READY');
    if (readyOpenAI && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim().length === 0)) {
      process.env.OPENAI_API_KEY = SecretStore.decrypt({
        encryptedKey: readyOpenAI.encryptedKey,
        iv: readyOpenAI.iv,
        authTag: readyOpenAI.authTag,
      });
    }
  } catch {}

  // Khởi tạo Queue
  await getVideoQueue();

  // Khởi động Worker (trong standalone mode hoặc dev mode, worker chạy kèm để tiện xử lý)
  if (process.env.START_WORKER !== 'false') {
    await startWorker();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`✅ Backend Server đã khởi động thành công!`);
    console.log(`🌐 ĐỊA CHỈ TRUY CẬP ỨNG DỤNG: http://localhost:3000`);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
    const semanticProvider = hasGemini ? 'Gemini' : hasOpenAI ? 'OpenAI' : 'Chưa cấu hình API Key (vào web cài đặt)';
    console.log(`🔑 Trạng thái AI Key: ${semanticProvider}`);
    console.log(`📁 Thư mục lưu Video: http://localhost:${PORT}/output`);
    console.log(`👉 Hãy mở trình duyệt Web và truy cập: http://localhost:3000`);
    console.log(`======================================================\n`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Lỗi nghiêm trọng khi khởi động server:', err);
  process.exit(1);
});

// Trigger reload for dynamic filenames, thumbnails, and TikTok captions
