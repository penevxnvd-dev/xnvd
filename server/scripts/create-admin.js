// Скрипт за създаване на админски акаунт
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@xnvd.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Администратор';

async function createAdmin() {
  try {
    console.log('\n=== Създаване на админски акаунт ===\n');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Парола:', ADMIN_PASSWORD);
    console.log('👤 Име:', ADMIN_NAME);
    console.log('\nСъздаване...\n');

    // Проверка дали потребителят вече съществува
    const existingProfile = await prisma.profile.findUnique({
      where: { email: ADMIN_EMAIL },
      include: { user: true }
    });

    let profile;

    if (existingProfile) {
      console.log('⚠ Потребителят вече съществува. Обновяване...');
      profile = existingProfile;

      // Обновяване на паролата
      if (existingProfile.user) {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await prisma.user.update({
          where: { profileId: existingProfile.id },
          data: { password: hashedPassword }
        });
        console.log('✓ Паролата е обновена');
      } else {
        // Създаване на user запис
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await prisma.user.create({
          data: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            profileId: existingProfile.id
          }
        });
        console.log('✓ User запис създаден');
      }
    } else {
      // Създаване на нов потребител
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      profile = await prisma.profile.create({
        data: {
          email: ADMIN_EMAIL,
          fullName: ADMIN_NAME,
          user: {
            create: {
              email: ADMIN_EMAIL,
              password: hashedPassword
            }
          }
        },
        include: { user: true }
      });
      console.log('✓ Потребител създаден успешно');
    }

    // Проверка/добавяне на админска роля
    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId: profile.id,
        role: 'admin'
      }
    });

    if (!existingRole) {
      await prisma.userRole.create({
        data: {
          userId: profile.id,
          role: 'admin'
        }
      });
      console.log('✓ Админска роля добавена успешно');
    } else {
      console.log('✓ Админската роля вече съществува');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Акаунтът е готов!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📧 Email:    ', ADMIN_EMAIL);
    console.log('🔑 Парола:   ', ADMIN_PASSWORD);
    console.log('👤 Име:      ', ADMIN_NAME);
    console.log('👑 Роля:     admin');
    console.log('\n🌐 Влезте на: http://localhost:5174/auth\n');

  } catch (error) {
    console.error('\n❌ Грешка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();


