// สำรองฐานข้อมูล SQLite เป็นไฟล์เดียวที่สมบูรณ์ (ใช้ได้แม้เปิด WAL / มีคนใช้งานอยู่)
// ใช้: node prisma/backup.js /data/backup-latest.db   (docker-start.ps1 เรียกก่อนอัปเดต container)
require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const target = process.argv[2];
if (!target || /['"]/.test(target)) {
  console.error('ใช้: node prisma/backup.js <ไฟล์ปลายทาง.db>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    fs.rmSync(target, { force: true }); // VACUUM INTO ไม่ยอมเขียนทับไฟล์เดิม
    await prisma.$executeRawUnsafe(`VACUUM INTO '${target}'`);
    console.log(`✅ สำรองฐานข้อมูลไว้ที่ ${target}`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error('❌ สำรองฐานข้อมูลไม่สำเร็จ:', err.message);
  process.exit(1);
});
