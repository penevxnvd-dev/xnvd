import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xnvd-secret-key-2024';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
  };
  userRole?: 'admin' | 'realtor';
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = decoded.userId;
    req.user = { id: decoded.userId, email: decoded.email };

    // Fetch user role from database
    const userRole = await prisma.userRole.findFirst({
      where: { userId: decoded.userId },
      select: { role: true }
    });

    if (userRole) {
      req.userRole = userRole.role as 'admin' | 'realtor';
      console.log(`[Auth] User ${decoded.email} has role: ${req.userRole}`);
    } else {
      console.log(`[Auth] User ${decoded.email} has no role assigned`);
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireRealtor = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  console.log(`[requireRealtor] Checking role for userId: ${req.userId}, role: ${req.userRole}`);
  if (req.userRole !== 'realtor' && req.userRole !== 'admin') {
    console.log(`[requireRealtor] Access denied - role is: ${req.userRole}`);
    return res.status(403).json({ error: 'Realtor access required' });
  }
  console.log(`[requireRealtor] Access granted`);
  next();
};

