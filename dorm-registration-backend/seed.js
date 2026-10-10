const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DORMS = [
  { id: 'tt1', name: 'หอพักเทาทอง 1', gender: 'ชาย', floors: 4 },
  { id: 'tt2', name: 'หอพักเทาทอง 2', gender: 'หญิง', floors: 4 },
  { id: 'tt3', name: 'หอพักเทาทอง 3', gender: 'หญิง', floors: 5 },
  { id: 'tt4', name: 'หอพักเทาทอง 4', gender: 'หญิง', floors: 5 },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Seed Dorms & Rooms
  for (let dIdx = 0; dIdx < DORMS.length; dIdx++) {
    const dormData = DORMS[dIdx];
    const dorm = await prisma.dorm.upsert({
      where: { id: dormData.id },
      update: { name: dormData.name, gender: dormData.gender, floors: dormData.floors },
      create: {
        id: dormData.id,
        name: dormData.name,
        gender: dormData.gender,
        floors: dormData.floors,
      },
    });

    const dormIndex = dIdx + 1;
    for (let floor = 1; floor <= dormData.floors; floor++) {
      for (let i = 1; i <= 10; i++) {
        const roomId = `${dormData.id}-${floor}-${i}`;
        const roomCode = `${String.fromCharCode(64 + dormIndex)}${floor}${String(i).padStart(2, '0')}`;

        await prisma.room.upsert({
          where: { id: roomId },
          update: { code: roomCode, floor, capacity: 4 },
          create: {
            id: roomId,
            dormId: dorm.id,
            code: roomCode,
            floor,
            capacity: 4,
          },
        });
      }
    }
  }

  // 2. Seed a default admin/demo user if no users exist
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const defaultPassword = await bcrypt.hash('123456', 10);
    const demoUser = await prisma.user.create({
      data: {
        username: '64010001',
        email: 'student@buu.ac.th',
        password: defaultPassword,
        name: 'สมชาย รักเรียน',
        role: 'USER',
        profile: {
          create: {
            prefix: 'นาย',
            firstName: 'สมชาย',
            lastName: 'รักเรียน',
            citizenId: '1234567890123',
            phone: '0812345678',
            fatherPrefix: 'นาย',
            fatherFirstName: 'บุญมี',
            fatherLastName: 'รักเรียน',
            fatherPhone: '0898765432',
            motherPrefix: 'นาง',
            motherFirstName: 'สมศรี',
            motherLastName: 'รักเรียน',
            motherPhone: '0876543210',
          },
        },
      },
    });

    // Create a demo booking for room A101
    const demoBooking = await prisma.booking.create({
      data: {
        userId: demoUser.id,
        roomId: 'tt1-1-1',
        status: 'CONFIRMED',
        payment: {
          create: {
            receiptNo: 'RCPT-64010001',
            amount: 1999,
            method: 'qr',
            status: 'PAID',
          },
        },
      },
    });

    console.log('✅ Demo user and booking created:', demoUser.username);
  }

  // 3. Ensure Admin account exists
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      role: 'ADMIN',
      name: 'ผู้จัดการหอพักเทาทอง'
    },
    create: {
      username: 'admin',
      email: 'admin@taothong.dorm',
      password: adminPassword,
      name: 'ผู้จัดการหอพักเทาทอง',
      role: 'ADMIN',
      profile: {
        create: {
          prefix: 'นาย',
          firstName: 'ผู้จัดการ',
          lastName: 'หอพักเทาทอง',
          phone: '038102222'
        }
      }
    }
  });
  console.log('👑 Admin user initialized:', adminUser.username);

  console.log('🎉 Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
