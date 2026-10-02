import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../../database/db.js';
import { generateToken, requireAuth, AuthenticatedRequest } from '../auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email('Email không đúng định dạng').max(100),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(100),
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(50),
});

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errMsg = (parseResult.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ';
      return res.status(400).json({ error: errMsg });
    }

    const { email, password, name } = parseResult.data;
    const db = await getDatabase();

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email này đã được đăng ký tài khoản' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    const user = await db.createUser({
      id: userId,
      email,
      password_hash,
      name,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errMsg = (parseResult.error as any).issues?.[0]?.message || 'Dữ liệu không hợp lệ';
      return res.status(400).json({ error: errMsg });
    }

    const { email, password } = parseResult.data;
    const db = await getDatabase();

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const token = generateToken(user);

    return res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});
