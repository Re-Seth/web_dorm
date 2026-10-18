// ==========================================
// งานที่ใช้ร่วมกันของการจอง: กันจองเกินความจุห้อง และออกเลขใบเสร็จ
// ==========================================
const { Prisma } = require('@prisma/client');

class RoomFullError extends Error {}

// เขียนการจองใน transaction แล้วนับผู้พักซ้ำหลังเขียน — ถ้าเกินความจุให้ rollback
// (กันกรณีหลายคนกดจองห้องเดียวกันพร้อมกัน ซึ่งการนับก่อนเขียนอย่างเดียวกันไม่ได้)
function writeWithinCapacity(prisma, roomId, write) {
  return prisma.$transaction(async (tx) => {
    const result = await write(tx);
    const room = await tx.room.findUnique({ where: { id: roomId } });
    const taken = await tx.booking.count({ where: { roomId, status: { not: 'CANCELLED' } } });
    if (taken > room.capacity) throw new RoomFullError();
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

// เลขใบเสร็จผูกกับ id การจอง (1 การจอง = 1 ใบเสร็จ) จึงไม่ซ้ำกัน เช่น RCPT-20261018-000042
function receiptNoFor(bookingId, paidAt = new Date()) {
  const ymd = paidAt.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(/-/g, '');
  return `RCPT-${ymd}-${String(bookingId).padStart(6, '0')}`;
}

module.exports = { RoomFullError, writeWithinCapacity, receiptNoFor };
