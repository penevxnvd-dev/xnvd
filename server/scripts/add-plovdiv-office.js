// Script to add Plovdiv office with team leaders
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function addPlovdivOffice() {
  try {
    console.log('🌱 Adding Plovdiv office...\n');

    // 1. Get Bulgaria country
    const country = await prisma.country.findFirst({ where: { name: 'България' } });
    if (!country) {
      throw new Error('Country България not found');
    }

    // 2. Create or get Plovdiv city
    console.log('🏙️  Creating/getting Plovdiv city...');
    let city = await prisma.city.findFirst({ 
      where: { name: 'Пловдив', countryId: country.id } 
    });
    if (!city) {
      city = await prisma.city.create({
        data: {
          name: 'Пловдив',
          countryId: country.id
        }
      });
      console.log('✅ City created: Пловдив');
    } else {
      console.log('✅ City already exists: Пловдив');
    }

    // 3. Create Plovdiv office
    console.log('\n🏢 Creating Plovdiv office...');
    let office = await prisma.office.findFirst({ 
      where: { name: 'Пловдив', cityId: city.id } 
    });
    if (!office) {
      office = await prisma.office.create({
        data: {
          name: 'Пловдив',
          cityId: city.id,
          address: 'Мария Луиза 43'
        }
      });
      console.log('✅ Office created: Пловдив');
    } else {
      await prisma.office.update({
        where: { id: office.id },
        data: { address: 'Мария Луиза 43' }
      });
      console.log('✅ Office updated: Пловдив');
    }

    // 4. Create Regional Manager - Камен Георгиев
    console.log('\n👥 Creating regional manager and team leaders...');
    
    const regionalManager = {
      name: 'Камен Георгиев',
      email: 'kamen.georgiev@xnvd.com',
      password: 'Leader123!',
      position: 'Регионален мениджър'
    };

    let kamensProfile = await prisma.profile.findUnique({ 
      where: { email: regionalManager.email },
      include: { user: true, realtor: true }
    });

    if (!kamensProfile) {
      const hashedPassword = await bcrypt.hash(regionalManager.password, 10);
      kamensProfile = await prisma.profile.create({
        data: {
          email: regionalManager.email,
          fullName: regionalManager.name,
          user: {
            create: {
              email: regionalManager.email,
              password: hashedPassword
            }
          },
          realtor: {
            create: {
              level: 5,
              hireDate: new Date('2020-01-01')
            }
          }
        },
        include: { user: true, realtor: true }
      });
      console.log('✅ Created regional manager:', regionalManager.name);
    } else {
      console.log('✅ Regional manager already exists:', regionalManager.name);
    }

    // 5. Create Team Leaders - Старшия and Амити
    const teamLeaders = [
      {
        name: 'Старшия',
        email: 'starshiya@xnvd.com',
        password: 'Leader123!',
        teamName: 'Екип Старшия'
      },
      {
        name: 'Амити',
        email: 'amiti@xnvd.com',
        password: 'Leader123!',
        teamName: 'Екип Амити'
      }
    ];

    const createdLeaders = [];
    for (const leaderData of teamLeaders) {
      let profile = await prisma.profile.findUnique({ 
        where: { email: leaderData.email },
        include: { user: true, realtor: true }
      });

      if (!profile) {
        const hashedPassword = await bcrypt.hash(leaderData.password, 10);
        profile = await prisma.profile.create({
          data: {
            email: leaderData.email,
            fullName: leaderData.name,
            user: {
              create: {
                email: leaderData.email,
                password: hashedPassword
              }
            },
            realtor: {
              create: {
                level: 5,
                hireDate: new Date('2020-01-01')
              }
            }
          },
          include: { user: true, realtor: true }
        });
        console.log('✅ Created leader:', leaderData.name);
      } else {
        console.log('✅ Leader already exists:', leaderData.name);
      }

      // Create team for this leader
      let team = await prisma.team.findFirst({
        where: { 
          name: leaderData.teamName,
          officeId: office.id
        }
      });

      if (!team) {
        team = await prisma.team.create({
          data: {
            name: leaderData.teamName,
            officeId: office.id,
            leaderId: profile.id
          }
        });
        console.log('  ✅ Team created:', leaderData.teamName);
      }

      createdLeaders.push({ profile, team });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Plovdiv office setup complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addPlovdivOffice();

