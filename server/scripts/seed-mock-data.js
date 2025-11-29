// Script to populate database with mock data
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seedMockData() {
  try {
    console.log('🌱 Seeding database with mock data...\n');

    // 1. Create Country (Bulgaria)
    console.log('📍 Creating country...');
    let country = await prisma.country.findFirst({ where: { name: 'България' } });
    if (!country) {
      country = await prisma.country.create({
        data: {
          name: 'България',
          code: 'BG'
        }
      });
      console.log('✅ Country created:', country.name);
    } else {
      console.log('✅ Country already exists:', country.name);
    }

    // 2. Create City (Burgas)
    console.log('\n🏙️  Creating city...');
    let city = await prisma.city.findFirst({ 
      where: { name: 'Бургас', countryId: country.id } 
    });
    if (!city) {
      city = await prisma.city.create({
        data: {
          name: 'Бургас',
          countryId: country.id
        }
      });
      console.log('✅ City created:', city.name);
    } else {
      console.log('✅ City already exists:', city.name);
    }

    // 3. Create Office
    console.log('\n🏢 Creating office...');
    let office = await prisma.office.findFirst({ 
      where: { name: 'Бургас', cityId: city.id } 
    });
    if (!office) {
      office = await prisma.office.create({
        data: {
          name: 'Бургас',
          cityId: city.id,
          address: 'Хан Крум 6'
        }
      });
      console.log('✅ Office created:', office.name);
    } else {
      console.log('✅ Office already exists:', office.name);
    }

    // 4. Create Team Leaders (as Profiles with Realtor records)
    console.log('\n👥 Creating team leaders and agents...');
    
    const leaders = [
      {
        name: 'Краси Кътев',
        email: 'krasi.katev@xnvd.com',
        position: 'Регионален мениджър',
        password: 'Leader123!',
        teamName: 'Екип Краси Кътев'
      },
      {
        name: 'Лазар Бундев',
        email: 'lazar.bundev@xnvd.com',
        position: 'Ръководител',
        password: 'Leader123!',
        teamName: 'Екип Лазар Бундев'
      },
      {
        name: 'Георги Пенев',
        email: 'georgi.penev@xnvd.com',
        position: 'Треньор',
        password: 'Leader123!',
        teamName: 'Екип Георги Пенев'
      }
    ];

    const createdLeaders = [];
    for (const leaderData of leaders) {
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

    // 5. Create Agents (Realtors)
    const agents = [
      {
        name: 'Росен',
        email: 'rosen@xnvd.com',
        position: 'Реализатор',
        password: 'Agent123!',
        level: 3,
        hireDate: '2021-03-15',
        phone: '+359 888 123 456',
        teamIndex: 0, // Краси Кътев's team
        deals: [
          {
            clientName: 'Иван Иванов',
            dealValue: 500000,
            commission: 50000,
            dealDate: '2024-01-15'
          },
          {
            clientName: 'Елица Георгиева',
            dealValue: 750000,
            commission: 75000,
            dealDate: '2024-02-20'
          }
        ]
      },
      {
        name: 'Руска Тодорова',
        email: 'ruska.todorova@xnvd.com',
        position: 'Реализатор',
        password: 'Agent123!',
        level: 1,
        hireDate: '2023-10-10',
        phone: '+359 888 567 890',
        teamIndex: 1, // Лазар Бундев's team
        deals: [
          {
            clientName: 'Лилия Тодорова',
            dealValue: 300000,
            commission: 30000,
            dealDate: '2024-03-05'
          }
        ]
      }
    ];

    for (const agentData of agents) {
      let agentProfile = await prisma.profile.findUnique({ 
        where: { email: agentData.email },
        include: { user: true, realtor: true }
      });

      if (!agentProfile) {
        const hashedPassword = await bcrypt.hash(agentData.password, 10);
        agentProfile = await prisma.profile.create({
          data: {
            email: agentData.email,
            fullName: agentData.name,
            user: {
              create: {
                email: agentData.email,
                password: hashedPassword
              }
            },
            realtor: {
              create: {
                level: agentData.level,
                hireDate: new Date(agentData.hireDate),
                teamId: createdLeaders[agentData.teamIndex].team.id
              }
            }
          },
          include: { user: true, realtor: true }
        });
        console.log('✅ Created agent:', agentData.name);

        // Create deals for this agent
        if (agentProfile.realtor) {
          for (const dealData of agentData.deals) {
            await prisma.deal.create({
              data: {
                realtorId: agentProfile.realtor.id,
                clientName: dealData.clientName,
                dealValue: dealData.dealValue,
                commission: dealData.commission,
                dealDate: new Date(dealData.dealDate)
              }
            });
          }
        }
        console.log(`  ✅ Created ${agentData.deals.length} deals for ${agentData.name}`);
      } else {
        console.log('✅ Agent already exists:', agentData.name);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Mock data seeding complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMockData();

