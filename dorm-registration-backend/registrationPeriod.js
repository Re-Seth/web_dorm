// ==========================================
// รอบเปิดรับลงทะเบียนประจำภาคเรียน
// ตั้งค่าได้ใน .env: REG_TERM, REG_OPEN_AT, REG_CLOSE_AT (ISO 8601 พร้อมเขตเวลา)
// ==========================================
const { REGISTRATION_FEE } = require('./bookings');

function getRegistrationPeriod(now = new Date()) {
  const term = process.env.REG_TERM || 'ภาคเรียนที่ 2/2569';
  const openAt = new Date(process.env.REG_OPEN_AT || '2026-10-17T00:00:00+07:00');
  const closeAt = new Date(process.env.REG_CLOSE_AT || '2027-03-31T23:59:59+07:00');
  const status = now < openAt ? 'UPCOMING' : now > closeAt ? 'CLOSED' : 'OPEN';
  return {
    term,
    openAt: openAt.toISOString(),
    closeAt: closeAt.toISOString(),
    serverTime: now.toISOString(),
    status,
    isOpen: status === 'OPEN',
    fee: REGISTRATION_FEE, // ค่าลงทะเบียน (บาท) — หน้าเว็บใช้แสดงยอดก่อนจอง
  };
}

module.exports = function registerPeriodRoutes({ app }) {
  app.get('/api/registration-period', (req, res) => res.json(getRegistrationPeriod()));
};

module.exports.getRegistrationPeriod = getRegistrationPeriod;
