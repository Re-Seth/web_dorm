// สร้างบัญชีแอดมินเริ่มต้น:  npm run seed
// ตั้งค่าผ่าน .env:  ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('กรุณาตั้ง ADMIN_PASSWORD ใน .env ก่อนรัน seed');
    process.exit(1);
  }
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { username },
    update: { role: 'ADMIN', password: hashed },
    create: { username, email, password: hashed, name: 'Administrator', role: 'ADMIN' },
  });
  console.log(`✅ Admin พร้อมใช้งาน: ${user.username} (id ${user.id})`);
})().finally(() => prisma.$disconnect());
