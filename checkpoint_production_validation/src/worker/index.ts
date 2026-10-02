import 'dotenv/config';
import { getDatabase } from '../database/db.js';
import { getVideoQueue } from '../queue/videoQueue.js';
import { startWorker } from './videoWorker.js';

async function main() {
  console.log('👷 Đang khởi chạy Video Worker độc lập...');

  const db = await getDatabase();
  await db.init();

  await getVideoQueue();
  await startWorker();

  console.log('✨ Video Worker đã sẵn sàng nhận và xử lý jobs!');

  // Giữ tiến trình luôn chạy
  const keepAlive = () => setTimeout(keepAlive, 1000 * 60 * 60);
  keepAlive();
}

main().catch((err) => {
  console.error('❌ Lỗi worker:', err);
  process.exit(1);
});
