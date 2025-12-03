// Script to create account for Георги Калушев in Краси Кътев team
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const EMAIL = 'georgi.kalushev@xnvd.com';
const PASSWORD = 'Georgi123!';
const FULL_NAME = 'Георги Калушев';
const TEAM_NAME = 'Краси Кътев';

async function main() {
  try {
    console.log('\n=== Създаване на акаунт за Георги Калушев ===\n');

    // Find the team
    const team = await prisma.team.findFirst({
      where: { name: TEAM_NAME },
      include: { leader: true }
    });

    if (!team) {
      throw new Error(`Екип "${TEAM_NAME}" не е намерен!`);
    }

    console.log(`✅ Намерен екип: ${team.name} (ID: ${team.id})`);
    if (team.leader) {
      console.log(`   Лидер: ${team.leader.fullName}`);
    }

    // Check if user already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { email: EMAIL },
      include: { user: true, realtor: true, userRoles: true }
    });

    let profile;

    if (existingProfile) {
      console.log(`⚠️  ${FULL_NAME} вече съществува. Обновяване...`);
      profile = existingProfile;

      // Update password
      if (existingProfile.user) {
        const hashedPassword = await bcrypt.hash(PASSWORD, 10);
        await prisma.user.update({
          where: { profileId: existingProfile.id },
          data: { password: hashedPassword }
        });
        console.log(`✓ Паролата е обновена`);
      }

      // Update realtor team if needed
      if (existingProfile.realtor) {
        if (existingProfile.realtor.teamId !== team.id) {
          await prisma.realtor.update({
            where: { id: existingProfile.realtor.id },
            data: { teamId: team.id }
          });
          console.log(`✓ Реализаторът е преместен в екип "${TEAM_NAME}"`);
        } else {
          console.log(`✓ Реализаторът вече е в екип "${TEAM_NAME}"`);
        }
      } else {
        // Create realtor record
        await prisma.realtor.create({
          data: {
            userId: profile.id,
            teamId: team.id,
            level: 1,
            hireDate: new Date()
          }
        });
        console.log(`✓ Създаден реализаторски запис`);
      }
    } else {
      // Create new account
      const hashedPassword = await bcrypt.hash(PASSWORD, 10);
      
      profile = await prisma.profile.create({
        data: {
          email: EMAIL,
          fullName: FULL_NAME,
          user: {
            create: {
              email: EMAIL,
              password: hashedPassword
            }
          },
          realtor: {
            create: {
              teamId: team.id,
              level: 1,
              hireDate: new Date()
            }
          }
        },
        include: { user: true, realtor: true }
      });
      console.log(`✓ ${FULL_NAME} създаден успешно`);
    }

    // Create realtor role
    const existingRole = await prisma.$queryRaw`
      SELECT id FROM user_roles 
      WHERE user_id = ${profile.id}::uuid AND role = 'realtor'::app_role
      LIMIT 1
    `;

    if (!existingRole || existingRole.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO user_roles (user_id, role)
        VALUES (${profile.id}::uuid, 'realtor'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING
      `;
      console.log(`✓ Роля "realtor" добавена`);
    } else {
      console.log(`✓ Роля "realtor" вече съществува`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Акаунтът е готов!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👤 ДАННИ ЗА АКАУНТА:');
    console.log(`   📧 Email:    ${EMAIL}`);
    console.log(`   🔑 Парола:   ${PASSWORD}`);
    console.log(`   👤 Име:      ${FULL_NAME}`);
    console.log(`   🆔 Profile ID: ${profile.id}`);
    if (profile.realtor) {
      console.log(`   🆔 Realtor ID: ${profile.realtor.id}`);
      console.log(`   📊 Ниво:     ${profile.realtor.level}`);
      console.log(`   👥 Екип:     ${TEAM_NAME}`);
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
