import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/authRoutes.js';
import { videoRouter } from './routes/videoRoutes.js';

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
