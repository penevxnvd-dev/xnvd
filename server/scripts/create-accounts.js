// Script to create admin and realtor accounts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@xnvd.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Администратор';

const REALTOR_EMAIL = 'realtor@xnvd.com';
const REALTOR_PASSWORD = 'Realtor123!';
const REALTOR_NAME = 'Реализатор';

async function createAccount(email, password, fullName, role, isRealtor = false) {
  const existingProfile = await prisma.profile.findUnique({
    where: { email },
    include: { user: true, realtor: true, userRoles: true }
  });

  let profile;

  if (existingProfile) {
    console.log(`⚠️  ${fullName} вече съществува. Обновяване...`);
    profile = existingProfile;

    // Update password
    if (existingProfile.user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { profileId: existingProfile.id },
        data: { password: hashedPassword }
      });
      console.log(`✓ Паролата е обновена за ${fullName}`);
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          profileId: existingProfile.id
        }
      });
      console.log(`✓ User запис създаден за ${fullName}`);
    }
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const data = {
      email,
      fullName,
      user: {
        create: {
          email,
          password: hashedPassword
        }
      },
      // userRoles will be created separately to avoid enum issues
    };

    if (isRealtor) {
      data.realtor = {
        create: {
          level: 1,
          hireDate: new Date()
        }
      };
    }

    profile = await prisma.profile.create({
      data,
      include: { user: true, realtor: true }
    });
    console.log(`✓ ${fullName} създаден успешно`);
  }

  // Create role separately (using raw SQL to avoid Prisma enum issues)
  const existingRole = await prisma.$queryRaw`
    SELECT id FROM user_roles 
    WHERE user_id = ${profile.id}::uuid AND role = ${role}::app_role
    LIMIT 1
  `;

  if (!existingRole || existingRole.length === 0) {
    await prisma.$executeRaw`
      INSERT INTO user_roles (user_id, role)
      VALUES (${profile.id}::uuid, ${role}::app_role)
      ON CONFLICT (user_id, role) DO NOTHING
    `;
    console.log(`✓ Роля "${role}" добавена за ${fullName}`);
  } else {
    console.log(`✓ Роля "${role}" вече съществува за ${fullName}`);
  }

  return profile;
}

async function main() {
  try {
    console.log('\n=== Създаване на акаунти ===\n');

    // Create admin
    console.log('\n📋 Създаване на админски акаунт...');
    const admin = await createAccount(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, 'admin', false);

    // Create realtor
    console.log('\n📋 Създаване на реализаторски акаунт...');
    const realtor = await createAccount(REALTOR_EMAIL, REALTOR_PASSWORD, REALTOR_NAME, 'realtor', true);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Всички акаунти са готови!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👑 АДМИН АКАУНТ:');
    console.log(`   📧 Email:    ${ADMIN_EMAIL}`);
    console.log(`   🔑 Парола:   ${ADMIN_PASSWORD}`);
    console.log(`   👤 Име:      ${ADMIN_NAME}`);
    console.log(`   🆔 ID:       ${admin.id}\n`);

    console.log('🏠 РЕАЛИЗАТОР АКАУНТ:');
    console.log(`   📧 Email:    ${REALTOR_EMAIL}`);
    console.log(`   🔑 Парола:   ${REALTOR_PASSWORD}`);
    console.log(`   👤 Име:      ${REALTOR_NAME}`);
    console.log(`   🆔 ID:       ${realtor.id}`);
    if (realtor.realtor) {
      console.log(`   📊 Ниво:     ${realtor.realtor.level}`);
      console.log(`   🆔 Realtor ID: ${realtor.realtor.id}`);
    }
    console.log('\n🌐 Влезте на: http://localhost:8080/auth\n');

  } catch (error) {
    console.error('\n❌ Грешка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Фатална грешка:', error);
    process.exit(1);
  });

