import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'ai-video-secret-key-super-safe-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'USER';
  };
}

export function isExplicitAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.trim().toLowerCase());
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    const db = await getDatabase();
    const user = await db.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại hoặc phiên đăng nhập hết hạn' });
    }

    // Role resolution: explicit admin config takes precedence or persisted role
    const effectiveRole: 'ADMIN' | 'USER' = 
      isExplicitAdminEmail(user.email) ? 'ADMIN' : (user.role === 'ADMIN' ? 'ADMIN' : 'USER');

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'ADMIN_ACCESS_REQUIRED: Quyền truy cập chỉ dành cho Quản trị viên' });
    }
    next();
  });
}

export function generateToken(user: { id: string; email: string; name: string; role?: 'ADMIN' | 'USER' }): string {
  const effectiveRole = isExplicitAdminEmail(user.email) ? 'ADMIN' : (user.role || 'USER');
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
