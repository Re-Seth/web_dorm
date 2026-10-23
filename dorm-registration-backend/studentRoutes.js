// ==========================================
// Student API — ฝั่งนิสิต: จองห้อง / ชำระเงิน / รีวิว  (ต้องล็อกอิน)
// + GET /api/admin/reviews สำหรับแอดมินดูรีวิว
// ==========================================
const { DORMS } = require('./adminRoutes');
const { DORMS_BY_GENDER } = require('./profileRoutes');
const { getRegistrationPeriod } = require('./registrationPeriod');
const { clip } = require('./validation');
const { REGISTRATION_FEE, RoomFullError, DuplicateBookingError, writeBooking, receiptNoFor } = require('./bookings');

module.exports = function registerStudentRoutes({ app, prisma, authenticateToken, requireAdmin, serverError: fail }) {

  const activeBooking = (userId) =>
    prisma.booking.findFirst({
      where: { userId, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: { room: true },
    });

  // ---------- จำนวนผู้พักจริงของแต่ละห้องในชั้นที่เลือก (ใช้วาดผังห้อง) ----------
  app.get('/api/rooms/availability', authenticateToken, async (req, res) => {
    try {
      const { dormId } = req.query;
      const dorm = DORMS.find((d) => d.id === dormId);
      const floor = Number(req.query.floor);
      if (!dorm || !Number.isInteger(floor) || floor < 1 || floor > dorm.floors) {
        return res.status(400).json({ message: 'ข้อมูลหอพัก/ชั้นไม่ถูกต้อง' });
      }
      const rooms = await prisma.room.findMany({
        where: { dormId, floor },
        include: { bookings: { where: { status: { not: 'CANCELLED' } }, select: { id: true } } },
        orderBy: { code: 'asc' },
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
  // กฎ: ต้องอยู่ในรอบเปิดลงทะเบียน / ต้องมีโปรไฟล์ผู้เช่า / อาคารต้องตรงกับเพศ / ห้องต้องมีอยู่จริงตามผัง
  // ชื่อและเบอร์ติดต่อของการจองดึงจากโปรไฟล์ (ไม่เชื่อค่าที่ client ส่งมา)
  app.post('/api/bookings', authenticateToken, async (req, res) => {
    try {
      if (!getRegistrationPeriod().isOpen) {
        return res.status(403).json({ message: 'ขณะนี้อยู่นอกรอบเปิดรับลงทะเบียน จึงยังจองห้องไม่ได้' });
      }
      const { dormId } = req.body;
      const floor = Number(req.body.floor);
      const code = String(req.body.roomCode || '').trim().toUpperCase();

      const profile = await prisma.tenantProfile.findUnique({ where: { userId: req.user.id } });
      if (!profile) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลผู้เช่าให้ครบก่อนจองห้อง' });
      }
      if (!DORMS_BY_GENDER[profile.gender]?.includes(dormId)) {
        return res.status(400).json({ message: 'อาคารนี้ไม่ตรงกับเพศของผู้สมัคร' });
      }

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room || room.dormId !== dormId || room.floor !== floor) {
        return res.status(404).json({ message: 'ไม่พบห้องนี้ในอาคารและชั้นที่เลือก' });
      }
      if (room.status !== 'AVAILABLE') {
        return res.status(400).json({ message: 'ห้องนี้ปิดปรับปรุงหรือไม่เปิดให้จอง' });
      }

      const existing = await activeBooking(req.user.id);
      if (existing?.paymentStatus === 'PAID') {
        return res.status(400).json({ message: 'คุณจองและชำระเงินเรียบร้อยแล้ว เปลี่ยนห้องไม่ได้' });
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
        studentName: clip(`${profile.prefix}${profile.firstName} ${profile.lastName}`, 200),
        studentCode: req.user.username,
        phone: profile.mobile,
        parentName: profile.emergencyName,
        parentPhone: profile.emergencyPhone,
      };
      const booking = await writeBooking(prisma, { roomId: room.id, userId: req.user.id }, (tx) => existing
        ? tx.booking.update({ where: { id: existing.id }, data, include: { room: true } })
        : tx.booking.create({ data: { ...data, paymentAmount: REGISTRATION_FEE }, include: { room: true } }));
      res.status(existing ? 200 : 201).json(booking);
    } catch (err) {
      if (err instanceof RoomFullError) return res.status(400).json({ message: 'ห้องนี้เต็มแล้ว กรุณาเลือกห้องอื่น' });
      if (err instanceof DuplicateBookingError) {
        return res.status(409).json({ message: 'คุณมีการจองที่กำลังดำเนินการอยู่แล้ว กรุณารีเฟรชหน้าแล้วลองใหม่' });
      }
      fail(res, err);
    }
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

      const paidAt = new Date();
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        include: { room: true },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentMethod: req.body.method === 'bank' ? 'BANK' : 'QR',
          paidAt,
          receiptNo: receiptNoFor(booking.id, paidAt),
        },
      });
      res.json(updated);
    } catch (err) { fail(res, err); }
  });

  // ---------- รีวิว (1 คน 1 รีวิว ส่งซ้ำคือแก้ไข) ----------
  app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
      const rating = Number(req.body.rating);
      const comment = typeof req.body.comment === 'string' ? clip(req.body.comment, 1000) : '';
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

  // รีวิวของตัวเอง (null = ยังไม่เคยรีวิว)
  app.get('/api/reviews/me', authenticateToken, async (req, res) => {
    try {
      res.json(await prisma.review.findUnique({ where: { userId: req.user.id } }));
    } catch (err) { fail(res, err); }
  });

  // ---------- แอดมินดูรีวิว ----------
  app.get('/api/admin/reviews', authenticateToken, requireAdmin, async (req, res) => {
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
