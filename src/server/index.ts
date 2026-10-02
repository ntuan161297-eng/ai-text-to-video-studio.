import dotenv from 'dotenv';
dotenv.config({ override: true });
import { app } from './app.js';
import { getDatabase } from '../database/db.js';
import { getVideoQueue } from '../queue/videoQueue.js';
import { startWorker } from '../worker/videoWorker.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  console.log('🚀 Đang khởi động Backend Server AI Text to Video...');

  // Khởi tạo Database
  const db = await getDatabase();
  await db.init();

  // Khởi tạo Queue
  await getVideoQueue();

  // Khởi động Worker (trong standalone mode hoặc dev mode, worker chạy kèm để tiện xử lý)
  if (process.env.START_WORKER !== 'false') {
    await startWorker();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🌟 Backend API Server đang chạy tại: http://localhost:${PORT}`);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
    const semanticProvider = hasGemini ? 'Gemini' : hasOpenAI ? 'OpenAI' : 'NONE';
    console.log(`🧠 Semantic Provider Status: ${semanticProvider !== 'NONE' ? `CONFIGURED (${semanticProvider})` : 'NOT CONFIGURED'}`);
    console.log(`📁 Video Output Directory: http://localhost:${PORT}/output`);
    console.log(`======================================================\n`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Lỗi nghiêm trọng khi khởi động server:', err);
  process.exit(1);
});

// Trigger reload for dynamic filenames, thumbnails, and TikTok captions
