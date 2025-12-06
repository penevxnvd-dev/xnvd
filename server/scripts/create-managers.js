// Script to create accounts for managers and team leaders
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ACCOUNTS = [
  {
    email: 'krasi.katev@xnvd.com',
    password: 'Krasi123!',
    fullName: 'Краси Кътев',
    role: 'office_manager',
    city: 'Бургас',
    office: null, // Will be set to first office in Бургас
  },
  {
    email: 'lazar.bundev@xnvd.com',
    password: 'Lazar123!',
    fullName: 'Лазар Бундев',
    role: 'team_leader',
    city: 'Бургас',
    team: null, // Will be set to first team in Бургас
  },
  {
    email: 'georgi.penev@xnvd.com',
    password: 'Georgi123!',
    fullName: 'Георги Пенев',
    role: 'team_leader',
    city: 'Бургас',
    team: null, // Will be set to second team in Бургас or create new
  },
  {
    email: 'kamen.georgiev@xnvd.com',
    password: 'Kamen123!',
    fullName: 'Камен Георгиев',
    role: 'regional_manager',
    cities: ['Бургас', 'Пловдив'], // Regional manager can see multiple cities
  },
];

async function findOrCreateCity(cityName, countryName = 'България') {
  // Find country
  let country = await prisma.country.findFirst({
    where: { name: countryName },
  });

  if (!country) {
    country = await prisma.country.create({
      data: {
        name: countryName,
        code: countryName === 'България' ? 'BG' : 'XX',
      },
    });
    console.log(`✓ Създадена държава: ${countryName}`);
  }

  // Find or create city
  let city = await prisma.city.findFirst({
    where: {
      name: cityName,
      countryId: country.id,
    },
  });

  if (!city) {
    city = await prisma.city.create({
      data: {
        name: cityName,
        countryId: country.id,
      },
    });
    console.log(`✓ Създаден град: ${cityName}`);
  }

  return city;
}

async function findOrCreateOffice(officeName, cityId) {
  let office = await prisma.office.findFirst({
    where: {
      name: officeName,
      cityId: cityId,
    },
  });

  if (!office) {
    office = await prisma.office.create({
      data: {
        name: officeName,
        cityId: cityId,
      },
    });
    console.log(`✓ Създаден офис: ${officeName}`);
  }

  return office;
}

async function findOrCreateTeam(teamName, officeId) {
  let team = await prisma.team.findFirst({
    where: {
      name: teamName,
      officeId: officeId,
    },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: teamName,
        officeId: officeId,
      },
    });
    console.log(`✓ Създаден екип: ${teamName}`);
  }

  return team;
}

async function createAccount(accountData) {
  try {
    console.log(`\n=== Създаване на акаунт: ${accountData.fullName} ===`);

    // Check if profile already exists
    let profile = await prisma.profile.findUnique({
      where: { email: accountData.email },
      include: { user: true, userRoles: true },
    });

    const hashedPassword = await bcrypt.hash(accountData.password, 10);

    if (profile) {
      console.log(`⚠️  ${accountData.fullName} вече съществува. Обновяване...`);
      
      // Update password
      if (profile.user) {
        await prisma.user.update({
          where: { profileId: profile.id },
          data: { password: hashedPassword },
        });
      }
    } else {
      // Create new profile and user
      profile = await prisma.profile.create({
        data: {
          email: accountData.email,
          fullName: accountData.fullName,
          user: {
            create: {
              email: accountData.email,
              password: hashedPassword,
            },
          },
        },
        include: { user: true },
      });
      console.log(`✓ Профил създаден: ${accountData.fullName}`);
    }

    // Handle role-specific setup
    if (accountData.role === 'office_manager') {
      const city = await findOrCreateCity(accountData.city);
      
      // Find first office in the city or create one
      let office = await prisma.office.findFirst({
        where: { cityId: city.id },
      });

      if (!office) {
        office = await findOrCreateOffice(`Офис ${accountData.city}`, city.id);
      }

      // Set manager_id on office
      await prisma.office.update({
        where: { id: office.id },
        data: { managerId: profile.id },
      });
      console.log(`✓ Назначен като мениджър на офис: ${office.name}`);

    } else if (accountData.role === 'team_leader') {
      const city = await findOrCreateCity(accountData.city);
      
      // Find first office in the city
      let office = await prisma.office.findFirst({
        where: { cityId: city.id },
      });

      if (!office) {
        office = await findOrCreateOffice(`Офис ${accountData.city}`, city.id);
      }

      // Find or create team
      let team;
      if (accountData.team) {
        team = await findOrCreateTeam(accountData.team, office.id);
      } else {
        // Find existing team without leader or create new
        team = await prisma.team.findFirst({
          where: {
            officeId: office.id,
            leaderId: null,
          },
        });

        if (!team) {
          // Create new team with leader name
          const teamName = accountData.fullName.includes('Лазар') 
            ? 'Лазар Бундев' 
            : accountData.fullName.includes('Георги') && accountData.fullName.includes('Пенев')
            ? 'Георги Пенев'
            : `Екип ${accountData.fullName}`;
          
          team = await findOrCreateTeam(teamName, office.id);
        }
      }

      // Set leader_id on team
      await prisma.team.update({
        where: { id: team.id },
        data: { leaderId: profile.id },
      });
      console.log(`✓ Назначен като ръководител на екип: ${team.name}`);

    } else if (accountData.role === 'regional_manager') {
      // Set manager_id on cities
      for (const cityName of accountData.cities) {
        const city = await findOrCreateCity(cityName);
        await prisma.city.update({
          where: { id: city.id },
          data: { managerId: profile.id },
        });
        console.log(`✓ Назначен като регионален мениджър на град: ${cityName}`);
      }
    }

    // Create role in user_roles
    const existingRole = await prisma.$queryRaw`
      SELECT id FROM user_roles 
      WHERE user_id = ${profile.id}::uuid AND role = ${accountData.role}::app_role
      LIMIT 1
    `;

    if (!existingRole || existingRole.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO user_roles (user_id, role)
        VALUES (${profile.id}::uuid, ${accountData.role}::app_role)
        ON CONFLICT (user_id, role) DO NOTHING
      `;
      console.log(`✓ Роля "${accountData.role}" добавена`);
    } else {
      console.log(`✓ Роля "${accountData.role}" вече съществува`);
    }

    console.log(`✅ ${accountData.fullName} готов!`);
    console.log(`   Email: ${accountData.email}`);
    console.log(`   Парола: ${accountData.password}`);
    console.log(`   Роля: ${accountData.role}`);

  } catch (error) {
    console.error(`❌ Грешка при създаване на ${accountData.fullName}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Създаване на мениджърски и ръководни акаунти');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // First, update enum if needed (this will be done via migration)
    console.log('📝 Проверка на роли...');
    
    // Create all accounts
    for (const account of ACCOUNTS) {
      await createAccount(account);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Всички акаунти са създадени успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 СЪЗДАДЕНИ АКАУНТИ:');
    ACCOUNTS.forEach((acc, index) => {
      console.log(`\n${index + 1}. ${acc.fullName}`);
      console.log(`   📧 Email: ${acc.email}`);
      console.log(`   🔑 Парола: ${acc.password}`);
      console.log(`   👔 Роля: ${acc.role}`);
      if (acc.role === 'office_manager') {
        console.log(`   🏢 Град: ${acc.city}`);
      } else if (acc.role === 'team_leader') {
        console.log(`   👥 Град: ${acc.city}`);
      } else if (acc.role === 'regional_manager') {
        console.log(`   🌍 Градове: ${acc.cities.join(', ')}`);
      }
    });

    console.log('\n🌐 Влезте на: http://localhost:8080/auth\n');

  } catch (error) {
    console.error('\n❌ Фатална грешка:', error);
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

