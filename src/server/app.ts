import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/authRoutes.js';
import { videoRouter } from './routes/videoRoutes.js';
import { adminAiRouter } from './routes/adminAiRoutes.js';
import { userAiRouter } from './routes/userAiRoutes.js';
import { systemRouter } from './routes/systemRoutes.js';

export const app = express();

// Security: Rate limiting (bỏ qua localhost và môi trường dev để tránh nghẽn khi polling tiến độ video)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5000, // Tăng lên 5000 requests / 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip.includes('127.0.0.1') || ip.includes('::1') || process.env.NODE_ENV !== 'production';
  },
  message: { error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' },
});

// Middleware
app.use(cors({
  origin: '*', // Cho phép frontend dev/production kết nối
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiter to /api
app.use('/api/', apiLimiter);

// Phục vụ tĩnh file video trong thư mục output cho HTML5 Video Player
const outputDir = path.resolve(process.env.OUTPUT_DIR || './output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Cho phép CORS khi stream video tĩnh
app.use('/output', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Accept-Ranges', 'bytes');
  next();
}, express.static(outputDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/videos', videoRouter);
app.use('/api/admin/ai', adminAiRouter);
app.use('/api/user/ai', userAiRouter);

// Điều hướng thân thiện khi người dùng mở nhầm http://localhost:4000 thay vì http://localhost:3000
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AI Text-to-Video Studio</title>
      <meta http-equiv="refresh" content="2;url=http://localhost:3000">
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 500px; border: 1px solid #334155; }
        h1 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
        p { color: #94a3b8; line-height: 1.6; }
        .btn { display: inline-block; margin-top: 1.5rem; padding: 0.85rem 2rem; background: #2563eb; color: #fff; text-decoration: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; }
        .btn:hover { background: #1d4ed8; }
        .badge { background: #10b981; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="card">
        <div><span class="badge">✅ Máy chủ Backend Đang Chạy</span></div>
        <h1 style="margin-top: 1rem;">AI Text-to-Video Studio</h1>
        <p>Cổng <strong>4000</strong> là máy chủ xử lý dữ liệu. Giao diện làm việc của bạn ở cổng <strong>3000</strong>.</p>
        <p>Đang tự động chuyển bạn sang giao diện Web...</p>
        <a class="btn" href="http://localhost:3000">👉 Nhấp vào đây để Vào Giao Diện Studio</a>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.1.0',
  });
});

// AI Content Engine Configuration Status (Section R)
app.get('/api/config/status', (req: Request, res: Response) => {
  dotenv.config({ override: true });
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
  const isConfigured = hasGemini || hasOpenAI;

  res.json({
    configured: isConfigured,
    provider: hasGemini ? 'Gemini' : hasOpenAI ? 'OpenAI' : 'NONE',
    message: isConfigured
      ? 'Semantic AI Engine Ready'
      : 'AI CONTENT ENGINE NOT CONFIGURED',
  });
});

// 404 handler cho /api
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint không tồn tại' });
  }
  next();
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Lỗi hệ thống nội bộ',
  });
});
