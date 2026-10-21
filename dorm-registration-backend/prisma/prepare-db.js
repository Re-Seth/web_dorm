// เตรียมฐานข้อมูลเดิมก่อน `prisma db push` (รันทุกครั้งตอนเริ่มระบบ — ทำซ้ำได้ ไม่มีผลถ้าข้อมูลเรียบร้อยอยู่แล้ว)
// schema บังคับ relation (FK) ไปที่ User และ receiptNo ไม่ซ้ำ — ข้อมูลเก่าที่ขัดกับกฎเหล่านี้จะทำให้ push ล้ม
// และ container รีสตาร์ทวนไม่หยุด จึงเก็บกวาดก่อน:
//   - โปรไฟล์/รีวิว/แจ้งซ่อม ของผู้ใช้ที่ถูกลบไปแล้ว → ลบ (เป็นข้อมูลส่วนบุคคลที่ไม่มีเจ้าของ)
//   - การจองของผู้ใช้ที่ถูกลบไปแล้ว → เก็บไว้เป็นประวัติ แต่ตัดการเชื่อม (userId = NULL)
//   - เลขใบเสร็จซ้ำ → เก็บไว้เฉพาะการจองแรก
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const STEPS = [
  ['ลบโปรไฟล์ที่ไม่มีเจ้าของ', 'DELETE FROM "TenantProfile" WHERE "userId" NOT IN (SELECT "id" FROM "User")'],
  ['ลบรีวิวที่ไม่มีเจ้าของ', 'DELETE FROM "Review" WHERE "userId" NOT IN (SELECT "id" FROM "User")'],
  ['ลบรายการแจ้งซ่อมที่ไม่มีเจ้าของ', 'DELETE FROM "MaintenanceRequest" WHERE "userId" NOT IN (SELECT "id" FROM "User")'],
  ['ตัดการเชื่อมการจองของผู้ใช้ที่ถูกลบ', 'UPDATE "Booking" SET "userId" = NULL WHERE "userId" IS NOT NULL AND "userId" NOT IN (SELECT "id" FROM "User")'],
  ['ล้างเลขใบเสร็จที่ซ้ำ', 'UPDATE "Booking" SET "receiptNo" = NULL WHERE "receiptNo" IS NOT NULL AND "id" NOT IN (SELECT MIN("id") FROM "Booking" WHERE "receiptNo" IS NOT NULL GROUP BY "receiptNo")'],
];

(async () => {
  const prisma = new PrismaClient();
  try {
    for (const [label, sql] of STEPS) {
      try {
        const n = await prisma.$executeRawUnsafe(sql);
        if (n > 0) console.log(`🧹 ${label}: ${n} แถว`);
      } catch (err) {
        // ฐานข้อมูลใหม่ยังไม่มีตาราง — ข้ามได้ (db push จะสร้างให้)
        if (!/no such table/i.test(String(err.message))) console.warn(`⚠️  ${label}: ${err.message}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
})();
