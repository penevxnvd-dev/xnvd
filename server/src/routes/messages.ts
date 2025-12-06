import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRealtor, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get conversation with a specific user
router.get('/conversation/:userId', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.userId!;
    const otherUserId = req.params.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        read: false
      },
      data: { read: true }
    });

    res.json(messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: msg.content,
      read: msg.read,
      createdAt: msg.createdAt.toISOString(),
      sender: {
        id: msg.sender.id,
        fullName: msg.sender.fullName,
        email: msg.sender.email
      },
      receiver: {
        id: msg.receiver.id,
        fullName: msg.receiver.fullName,
        email: msg.receiver.email
      }
    })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Get all conversations (list of users you've chatted with)
router.get('/conversations', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.userId!;

    // Get all unique conversation partners
    const sentMessages = await prisma.message.findMany({
      where: { senderId: currentUserId },
      select: { receiverId: true },
      distinct: ['receiverId']
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: currentUserId },
      select: { senderId: true },
      distinct: ['senderId']
    });

    const partnerIds = new Set([
      ...sentMessages.map(m => m.receiverId),
      ...receivedMessages.map(m => m.senderId)
    ]);

    // Get last message for each conversation
    const conversations = await Promise.all(
      Array.from(partnerIds).map(async (partnerId) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: partnerId },
              { senderId: partnerId, receiverId: currentUserId }
            ]
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            receiver: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        const partner = lastMessage?.senderId === currentUserId 
          ? lastMessage.receiver 
          : lastMessage?.sender;

        const unreadCount = await prisma.message.count({
          where: {
            senderId: partnerId,
            receiverId: currentUserId,
            read: false
          }
        });

        return {
          userId: partnerId,
          partner: partner ? {
            id: partner.id,
            fullName: partner.fullName,
            email: partner.email
          } : null,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt.toISOString(),
            isFromMe: lastMessage.senderId === currentUserId
          } : null,
          unreadCount
        };
      })
    );

    res.json(conversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Send a message
router.post('/', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.userId!;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    const message = await prisma.message.create({
      data: {
        senderId: currentUserId,
        receiverId,
        content: content.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    res.json({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        fullName: message.sender.fullName,
        email: message.sender.email
      },
      receiver: {
        id: message.receiver.id,
        fullName: message.receiver.fullName,
        email: message.receiver.email
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Mark messages as read
router.put('/read/:userId', authenticate, requireRealtor, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.userId!;
    const otherUserId = req.params.userId;

    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        read: false
      },
      data: { read: true }
    });

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;

