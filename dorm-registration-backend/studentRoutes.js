// ==========================================
// Student API — ฝั่งนิสิต: จองห้อง / ชำระเงิน / รีวิว  (ต้องล็อกอิน)
// + GET /api/admin/reviews สำหรับแอดมินดูรีวิว
// ==========================================
const DORM_IDS = ['tt1', 'tt2', 'tt3', 'tt4'];
const { DORMS_BY_GENDER } = require('./profileRoutes');
const CAPACITY = 4;

module.exports = function registerStudentRoutes({ app, prisma, authenticateToken }) {
  const fail = (res, err) =>
    res.status(500).json({ message: 'Internal server error', error: err.message });

  const activeBooking = (userId) =>
    prisma.booking.findFirst({
      where: { userId, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: { room: true },
    });

  // ---------- จำนวนผู้พักจริงของแต่ละห้องในชั้นที่เลือก (ใช้วาดผังห้อง) ----------
  // ห้องที่ยังไม่มีในฐานข้อมูล = ยังไม่มีใครจอง (ฝั่ง frontend ถือเป็น 0 คน)
  app.get('/api/rooms/availability', authenticateToken, async (req, res) => {
    try {
      const { dormId } = req.query;
      const floor = Number(req.query.floor);
      if (!DORM_IDS.includes(dormId) || !Number.isInteger(floor) || floor < 1) {
        return res.status(400).json({ message: 'ข้อมูลหอพัก/ชั้นไม่ถูกต้อง' });
      }
      const rooms = await prisma.room.findMany({
        where: { dormId, floor },
        include: { bookings: { where: { status: { not: 'CANCELLED' } }, select: { id: true } } },
      });
      res.json(rooms.map((r) => ({
        code: r.code,
        capacity: r.capacity,
        status: r.status,
        occupied: r.bookings.length,
      })));
    } catch (err) { fail(res, err); }
  });

  // ---------- จองห้อง (ถ้ามีการจองที่ยังไม่ชำระ จะเปลี่ยนห้องให้) ----------
  app.post('/api/bookings', authenticateToken, async (req, res) => {
    try {
      const { dormId, roomCode, studentName, phone, parentName, parentPhone } = req.body;
      const floor = Number(req.body.floor);

      const dormIndex = DORM_IDS.indexOf(dormId);
      const code = String(roomCode || '').trim().toUpperCase();
      if (dormIndex < 0 || !Number.isInteger(floor) || floor < 1) {
        return res.status(400).json({ message: 'ข้อมูลหอพัก/ชั้นไม่ถูกต้อง' });
      }
      // รหัสห้องต้องตรงรูปแบบ: อักษรอาคาร + ชั้น + เลขห้อง 2 หลัก เช่น A101
      const expected = new RegExp(`^${String.fromCharCode(65 + dormIndex)}${floor}\\d{2}$`);
      if (!expected.test(code)) {
        return res.status(400).json({ message: 'รหัสห้องไม่ตรงกับหอพักและชั้นที่เลือก' });
      }
      if (!studentName || !String(studentName).trim()) {
        return res.status(400).json({ message: 'ต้องกรอกข้อมูลนิสิตก่อนจองห้อง' });
      }

      // ผู้ที่กรอกโปรไฟล์ผู้เช่าแล้ว จองได้เฉพาะอาคารตามเพศ
      const profile = await prisma.tenantProfile.findUnique({ where: { userId: req.user.id } });
      if (profile && !DORMS_BY_GENDER[profile.gender]?.includes(dormId)) {
        return res.status(400).json({ message: 'อาคารนี้ไม่ตรงกับเพศของผู้สมัคร' });
      }

      const existing = await activeBooking(req.user.id);
      if (existing?.paymentStatus === 'PAID') {
        return res.status(400).json({ message: 'คุณจองและชำระเงินเรียบร้อยแล้ว' });
      }

      const room = await prisma.room.upsert({
        where: { code },
        update: {},
        create: { code, dormId, floor, capacity: CAPACITY },
      });
      if (room.status !== 'AVAILABLE') {
        return res.status(400).json({ message: 'ห้องนี้ไม่เปิดให้จอง' });
      }
      const taken = await prisma.booking.count({
        where: {
          roomId: room.id,
          status: { not: 'CANCELLED' },
          ...(existing ? { id: { not: existing.id } } : {}),
        },
      });
      if (taken >= room.capacity) {
        return res.status(400).json({ message: 'ห้องนี้เต็มแล้ว กรุณาเลือกห้องอื่น' });
      }

      const data = {
        roomId: room.id,
        userId: req.user.id,
        studentName: String(studentName).trim(),
        studentCode: req.user.username,
        phone: phone || null,
        parentName: parentName || null,
        parentPhone: parentPhone || null,
      };
      const booking = existing
        ? await prisma.booking.update({ where: { id: existing.id }, data })
        : await prisma.booking.create({ data });
      res.status(existing ? 200 : 201).json(booking);
    } catch (err) { fail(res, err); }
  });

  app.get('/api/bookings/me', authenticateToken, async (req, res) => {
    try {
      res.json((await activeBooking(req.user.id)) || null);
    } catch (err) { fail(res, err); }
  });

  // ---------- ชำระเงิน ----------
  // หมายเหตุ: ยังเป็นการชำระเงินจำลอง (ไม่มี payment gateway) — แอดมินตรวจ/ยกเลิกได้ที่หน้า "การจอง & ชำระเงิน"
  app.post('/api/bookings/pay', authenticateToken, async (req, res) => {
    try {
      const booking = await activeBooking(req.user.id);
      if (!booking) return res.status(404).json({ message: 'ยังไม่มีการจองห้อง' });
      if (booking.paymentStatus === 'PAID') return res.json(booking); // ซ้ำได้ ไม่เก็บเงินสองรอบ

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentMethod: req.body.method === 'bank' ? 'BANK' : 'QR',
          paidAt: new Date(),
          receiptNo: 'RCPT-' + Date.now().toString().slice(-8),
        },
      });
      res.json(updated);
    } catch (err) { fail(res, err); }
  });

  // ---------- รีวิว (1 คน 1 รีวิว ส่งซ้ำคือแก้ไข) ----------
  app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
      const rating = Number(req.body.rating);
      const comment = String(req.body.comment || '').trim().slice(0, 1000);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'คะแนนต้องเป็น 1-5' });
      }
      const review = await prisma.review.upsert({
        where: { userId: req.user.id },
        update: { rating, comment },
        create: { userId: req.user.id, rating, comment },
      });
      res.status(201).json(review);
    } catch (err) { fail(res, err); }
  });

  // ---------- แอดมินดูรีวิว ----------
  app.get('/api/admin/reviews', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    try {
      const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
      const users = await prisma.user.findMany({
        where: { id: { in: reviews.map((r) => r.userId) } },
        select: { id: true, username: true },
      });
      const nameOf = Object.fromEntries(users.map((u) => [u.id, u.username]));
      res.json(reviews.map((r) => ({ ...r, username: nameOf[r.userId] || '—' })));
    } catch (err) { fail(res, err); }
  });
};
