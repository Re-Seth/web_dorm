// ==========================================
// งานที่ใช้ร่วมกันของการจอง: กันจองเกินความจุห้อง / จองซ้ำ, ค่าลงทะเบียน และออกเลขใบเสร็จ
// ==========================================
const { Prisma } = require('@prisma/client');

// ค่าลงทะเบียน (บาท) — แหล่งเดียวของยอดเงิน ทั้งที่บันทึกในฐานข้อมูลและที่หน้าเว็บแสดง
const REGISTRATION_FEE = Number(process.env.REGISTRATION_FEE) || 1999;

class RoomFullError extends Error {}
class DuplicateBookingError extends Error {}

const ACTIVE = { status: { not: 'CANCELLED' } };

// เขียนการจองใน transaction แล้วตรวจซ้ำหลังเขียน — ถ้าผิดกฎให้ rollback:
//   - ห้องเกินความจุ (หลายคนกดจองห้องเดียวกันพร้อมกัน)
//   - ผู้ใช้คนเดียวมีการจองที่ยังไม่ถูกยกเลิกมากกว่า 1 รายการ (กดยืนยันซ้ำ / ส่งพร้อมกันหลายแท็บ)
// การนับก่อนเขียนอย่างเดียวกันกรณีส่งพร้อมกันไม่ได้
function writeBooking(prisma, { roomId, userId }, write) {
  return prisma.$transaction(async (tx) => {
    const result = await write(tx);
    const room = await tx.room.findUnique({ where: { id: roomId } });
    const taken = await tx.booking.count({ where: { roomId, ...ACTIVE } });
    if (taken > room.capacity) throw new RoomFullError();
    if (userId) {
      const mine = await tx.booking.count({ where: { userId, ...ACTIVE } });
      if (mine > 1) throw new DuplicateBookingError();
    }
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

// เลขใบเสร็จผูกกับ id การจอง (1 การจอง = 1 ใบเสร็จ) จึงไม่ซ้ำกัน เช่น RCPT-20261018-000042
function receiptNoFor(bookingId, paidAt = new Date()) {
  const ymd = paidAt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(/-/g, '');
  return `RCPT-${ymd}-${String(bookingId).padStart(6, '0')}`;
}

module.exports = { REGISTRATION_FEE, RoomFullError, DuplicateBookingError, writeBooking, receiptNoFor };
