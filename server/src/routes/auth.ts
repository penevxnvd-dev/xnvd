import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1)
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = registerSchema.parse(req.body);

    // Check if user exists
    const existingProfile = await prisma.profile.findUnique({
      where: { email }
    });

    if (existingProfile) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create profile and user
    const profile = await prisma.profile.create({
      data: {
        email,
        fullName,
        user: {
          create: {
            email,
            password: hashedPassword
          }
        }
      },
      include: {
        user: true
      }
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: profile.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName
      },
      token
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    // Check for database connection errors
    const isDbError = error.message?.includes('Can\'t reach database server') || 
                      error.message?.includes('database server');
    
    if (isDbError) {
      return res.status(503).json({ 
        error: 'Database connection failed',
        message: 'PostgreSQL database is not running. Please start it with: sudo systemctl start postgresql',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find profile and user
    const profile = await prisma.profile.findUnique({
      where: { email },
      include: {
        user: true,
        userRoles: true
      }
    });

    if (!profile || !profile.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, profile.user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: profile.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        roles: profile.userRoles.map(ur => ur.role)
      },
      token
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    // Check for database connection errors
    const isDbError = error.message?.includes('Can\'t reach database server') || 
                      error.message?.includes('database server');
    
    if (isDbError) {
      return res.status(503).json({ 
        error: 'Database connection failed',
        message: 'PostgreSQL database is not running. Please start it with: sudo systemctl start postgresql',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const user = await prisma.profile.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.userRoles.map(ur => ur.role)
      }
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;

