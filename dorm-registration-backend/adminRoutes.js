// ==========================================
// Admin API — ระบบหลังบ้านจัดการหอพัก ใช้งานได้เปล่าเนี่ย
// ทุก endpoint ภายใต้ /api/admin ต้องใช้ JWT ของ user ที่ role = ADMIN
// ==========================================
const bcrypt = require('bcryptjs');
const { passwordError, emailError, usernameError, nameError, clip, isText } = require('./validation');
const { REGISTRATION_FEE, RoomFullError, DuplicateBookingError, writeBooking, receiptNoFor } = require('./bookings');

// ต้องตรงกับ src/data/dorms.js ฝั่ง frontend
const DORMS = [
  { id: 'tt1', name: 'หอพักเทาทอง 1', gender: 'ชาย', floors: 4 },
  { id: 'tt2', name: 'หอพักเทาทอง 2', gender: 'หญิง', floors: 4 },
  { id: 'tt3', name: 'หอพักเทาทอง 3', gender: 'หญิง', floors: 5 },
  { id: 'tt4', name: 'หอพักเทาทอง 4', gender: 'หญิง', floors: 5 },
];

const ROOMS_PER_FLOOR = 10; // ผังห้องมาตรฐาน: รหัสอาคาร (A-D) + ชั้น + เลขห้อง 01-10 เช่น A101
const PAYMENT_METHODS = ['CASH', 'QR', 'BANK'];
const ROOM_STATUSES = ['AVAILABLE', 'MAINTENANCE', 'CLOSED'];

// รหัสห้องตามผัง เช่น ('tt1', 1, 1) → A101
const roomCode = (dormIndex, floor, n) => `${String.fromCharCode(65 + dormIndex)}${floor}${String(n).padStart(2, '0')}`;

// สร้างห้องทุกห้องตามผังที่ยังไม่มีในฐานข้อมูล (ข้ามห้องที่มีอยู่แล้ว) — นิสิตจองได้เฉพาะห้องที่มีอยู่จริงในตารางนี้
async function ensureRooms(prisma) {
  const existing = new Set((await prisma.room.findMany({ select: { code: true } })).map((r) => r.code));
  let created = 0;
  for (const [di, d] of DORMS.entries()) {
    for (let f = 1; f <= d.floors; f++) {
      for (let i = 1; i <= ROOMS_PER_FLOOR; i++) {
        const code = roomCode(di, f, i);
        if (existing.has(code)) continue;
        await prisma.room.create({ data: { dormId: d.id, floor: f, code, capacity: 4 } });
        created++;
      }
    }
  }
  return created;
}

// จำนวนเตียงต่อห้องที่แอดมินตั้งได้
const parseCapacity = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
};
const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'];
const MAINT_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

module.exports = function registerAdminRoutes({ app, prisma, authenticateToken, requireAdmin, serverError: fail, kickUserSockets }) {
  const guard = [authenticateToken, requireAdmin];

  // นับเฉพาะการจองที่ยังไม่ถูกยกเลิก
  const activeCount = (room) =>
    (room.bookings || []).filter((b) => b.status !== 'CANCELLED').length;

  app.get('/api/admin/dorms', ...guard, (req, res) => res.json(DORMS));

  // ---------- Stats ----------
  app.get('/api/admin/stats', ...guard, async (req, res) => {
    try {
      const [rooms, bookings, maint, users] = await Promise.all([
        prisma.room.findMany({ include: { bookings: true } }),
        prisma.booking.findMany(),
        prisma.maintenanceRequest.findMany(),
        prisma.user.count({ where: { role: 'USER' } }),
      ]);
      const capacity = rooms.reduce((s, r) => s + r.capacity, 0);
      const occupied = rooms.reduce((s, r) => s + activeCount(r), 0);
      const paid = bookings.filter((b) => b.paymentStatus === 'PAID' && b.status !== 'CANCELLED');
      res.json({
        rooms: {
          total: rooms.length,
          full: rooms.filter((r) => activeCount(r) >= r.capacity).length,
          maintenance: rooms.filter((r) => r.status === 'MAINTENANCE').length,
        },
        beds: { capacity, occupied, rate: capacity ? +((occupied / capacity) * 100).toFixed(1) : 0 },
        bookings: {
          total: bookings.length,
          pending: bookings.filter((b) => b.status === 'PENDING').length,
          unpaid: bookings.filter((b) => b.paymentStatus === 'UNPAID' && b.status !== 'CANCELLED').length,
        },
        revenue: paid.reduce((s, b) => s + b.paymentAmount, 0),
        maintenance: {
          pending: maint.filter((m) => m.status === 'PENDING').length,
          inProgress: maint.filter((m) => m.status === 'IN_PROGRESS').length,
          completed: maint.filter((m) => m.status === 'COMPLETED').length,
        },
        users,
      });
    } catch (err) { fail(res, err); }
  });

  // ---------- Rooms ----------
  app.get('/api/admin/rooms', ...guard, async (req, res) => {
    try {
      const where = {};
      if (req.query.dormId) where.dormId = String(req.query.dormId);
      if (req.query.floor) where.floor = Number(req.query.floor);
      const rooms = await prisma.room.findMany({
        where,
        include: { bookings: { where: { status: { not: 'CANCELLED' } } } },
        orderBy: { code: 'asc' },
      });
      res.json(rooms.map((r) => ({ ...r, occupied: r.bookings.length })));
    } catch (err) { fail(res, err); }
  });

  app.post('/api/admin/rooms', ...guard, async (req, res) => {
    try {
      const { dormId, code } = req.body;
      const dorm = DORMS.find((d) => d.id === dormId);
      const floor = Number(req.body.floor);
      const capacity = req.body.capacity === undefined ? 4 : parseCapacity(req.body.capacity);
      if (!dorm || !Number.isInteger(floor) || floor < 1 || floor > dorm.floors || !isText(code) || !clip(code, 10)) {
        return res.status(400).json({ message: 'dormId, floor และ code ไม่ถูกต้อง' });
      }
      if (!capacity) return res.status(400).json({ message: 'จำนวนเตียงต้องเป็น 1-10' });
      const room = await prisma.room.create({
        data: { dormId, floor, code: clip(code, 10).toUpperCase(), capacity },
      });
      res.status(201).json(room);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ message: 'รหัสห้องนี้มีอยู่แล้ว' });
      fail(res, err);
    }
  });

  app.patch('/api/admin/rooms/:id', ...guard, async (req, res) => {
    try {
      const { capacity, status } = req.body;
      const data = {};
      if (capacity !== undefined) {
        data.capacity = parseCapacity(capacity);
        if (!data.capacity) return res.status(400).json({ message: 'จำนวนเตียงต้องเป็น 1-10' });
      }
      if (status !== undefined) {
        if (!ROOM_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
        data.status = status;
      }
      res.json(await prisma.room.update({ where: { id: Number(req.params.id) }, data }));
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'Room not found' });
      fail(res, err);
    }
  });

  app.delete('/api/admin/rooms/:id', ...guard, async (req, res) => {
    try {
      await prisma.room.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Room deleted' });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'Room not found' });
      if (err.code === 'P2003') {
        return res.status(400).json({ message: 'ห้องนี้มีประวัติการจอง ลบไม่ได้ — ให้เปลี่ยนสถานะเป็น CLOSED แทน' });
      }
      fail(res, err);
    }
  });

  // สร้างห้องทั้งหมดตามผังเดิม (10 ห้อง/ชั้น, รหัสแบบ A101) — ข้ามห้องที่มีอยู่แล้ว
  app.post('/api/admin/rooms/seed', ...guard, async (req, res) => {
    try {
      const created = await ensureRooms(prisma);
      res.json({ message: `สร้างห้องใหม่ ${created} ห้อง`, created });
    } catch (err) { fail(res, err); }
  });

  // ---------- Bookings ----------
  app.get('/api/admin/bookings', ...guard, async (req, res) => {
    try {
      const where = {};
      if (req.query.status) where.status = String(req.query.status);
      if (req.query.paymentStatus) where.paymentStatus = String(req.query.paymentStatus);
      const rows = await prisma.booking.findMany({
        where, include: { room: true }, orderBy: { createdAt: 'desc' },
      });
      res.json(rows);
    } catch (err) { fail(res, err); }
  });

  app.post('/api/admin/bookings', ...guard, async (req, res) => {
    try {
      const { roomId } = req.body;
      const fields = ['studentName', 'studentCode', 'phone', 'parentName', 'parentPhone'];
      if (fields.some((k) => req.body[k] != null && !isText(req.body[k]))) {
        return res.status(400).json({ message: 'ข้อมูลผู้จองไม่ถูกต้อง' });
      }
      const [studentName, studentCode, phone, parentName, parentPhone] = fields.map((k) => clip(req.body[k], 200) || null);
      if (!roomId || !studentName) {
        return res.status(400).json({ message: 'roomId และ studentName จำเป็นต้องกรอก' });
      }
      const room = await prisma.room.findUnique({
        where: { id: Number(roomId) },
        include: { bookings: { where: { status: { not: 'CANCELLED' } } } },
      });
      if (!room) return res.status(404).json({ message: 'Room not found' });
      if (room.status !== 'AVAILABLE') return res.status(400).json({ message: 'ห้องนี้ไม่เปิดให้จอง' });
      if (room.bookings.length >= room.capacity) return res.status(400).json({ message: 'ห้องเต็มแล้ว' });
      const booking = await writeBooking(prisma, { roomId: room.id }, (tx) => tx.booking.create({
        data: { roomId: room.id, studentName, studentCode, phone, parentName, parentPhone, paymentAmount: REGISTRATION_FEE },
      }));
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof RoomFullError) return res.status(400).json({ message: 'ห้องเต็มแล้ว' });
      fail(res, err);
    }
  });

  app.patch('/api/admin/bookings/:id', ...guard, async (req, res) => {
    try {
      const { status, paymentStatus, paymentMethod } = req.body;
      const id = Number(req.params.id);
      const current = await prisma.booking.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ message: 'Booking not found' });
      const data = {};
      if (status !== undefined) {
        if (!BOOKING_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
        data.status = status;
      }
      if (paymentStatus !== undefined) {
        if (!['UNPAID', 'PAID'].includes(paymentStatus)) return res.status(400).json({ message: 'Invalid paymentStatus' });
        data.paymentStatus = paymentStatus;
        if (paymentStatus === 'PAID') {
          data.paidAt = new Date();
          data.paymentMethod = PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'CASH';
          data.receiptNo = receiptNoFor(id, data.paidAt);
        } else {
          data.paidAt = null; data.paymentMethod = null; data.receiptNo = null;
        }
      }
      const update = (tx) => tx.booking.update({ where: { id }, data, include: { room: true } });
      // เปิดการจองที่ยกเลิกไปแล้วกลับมา → ต้องผ่านการตรวจความจุห้อง/การจองซ้ำเหมือนจองใหม่
      const reviving = current.status === 'CANCELLED' && data.status && data.status !== 'CANCELLED';
      res.json(reviving ? await writeBooking(prisma, { roomId: current.roomId, userId: current.userId }, update) : await update(prisma));
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'Booking not found' });
      if (err instanceof RoomFullError) return res.status(400).json({ message: 'ห้องเต็มแล้ว เปิดการจองนี้กลับมาไม่ได้' });
      if (err instanceof DuplicateBookingError) return res.status(400).json({ message: 'ผู้ใช้นี้มีการจองอื่นอยู่แล้ว' });
      fail(res, err);
    }
  });

  app.delete('/api/admin/bookings/:id', ...guard, async (req, res) => {
    try {
      await prisma.booking.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Booking deleted' });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'Booking not found' });
      fail(res, err);
    }
  });

  // ---------- Maintenance (ฝั่งแอดมิน ต้องล็อกอิน) ----------
  app.get('/api/admin/maintenance', ...guard, async (req, res) => {
    try {
      res.json(await prisma.maintenanceRequest.findMany({ orderBy: { createdAt: 'desc' } }));
    } catch (err) { fail(res, err); }
  });

  app.patch('/api/admin/maintenance/:id', ...guard, async (req, res) => {
    try {
      const { status } = req.body;
      if (!MAINT_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      res.json(await prisma.maintenanceRequest.update({ where: { id: Number(req.params.id) }, data: { status } }));
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'Request not found' });
      fail(res, err);
    }
  });

  app.delete('/api/admin/maintenance/:id', ...guard, async (req, res) => {
    try {
      await prisma.maintenanceRequest.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Request deleted' });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'Request not found' });
      fail(res, err);
    }
  });

  // ---------- Users ----------
  app.get('/api/admin/users', ...guard, async (req, res) => {
    try {
      res.json(await prisma.user.findMany({
        select: { id: true, username: true, email: true, name: true, role: true, createdAt: true },
        orderBy: { id: 'asc' },
      }));
    } catch (err) { fail(res, err); }
  });

  app.post('/api/admin/users', ...guard, async (req, res) => {
    try {
      const { username, email, password, name, role } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'username, email, password จำเป็นต้องกรอก' });
      }
      const invalid = usernameError(username) || emailError(email) || passwordError(password) || nameError(name);
      if (invalid) return res.status(400).json({ message: invalid });
      const user = await prisma.user.create({
        data: {
          username, email, name,
          password: await bcrypt.hash(password, 10),
          role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        },
        select: { id: true, username: true, email: true, name: true, role: true },
      });
      res.status(201).json(user);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ message: 'Username หรือ Email ซ้ำ' });
      fail(res, err);
    }
  });

  app.patch('/api/admin/users/:id', ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { role, name, email, password } = req.body;
      if (id === req.user.id && role && role !== 'ADMIN') {
        return res.status(400).json({ message: 'ไม่สามารถลดสิทธิ์ตัวเองได้' });
      }
      const invalid = (email !== undefined && emailError(email)) || nameError(name) || (password && passwordError(password));
      if (invalid) return res.status(400).json({ message: invalid });
      const data = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email;
      if (role !== undefined) data.role = role === 'ADMIN' ? 'ADMIN' : 'USER';
      if (password) {
        data.password = await bcrypt.hash(password, 10);
        data.passwordChangedAt = new Date(); // บังคับออกจากระบบทุกเครื่องของผู้ใช้นั้น
      }
      const user = await prisma.user.update({
        where: { id }, data,
        select: { id: true, username: true, email: true, name: true, role: true },
      });
      if (data.role || data.password) kickUserSockets(id);
      res.json(user);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'User not found' });
      if (err.code === 'P2002') return res.status(400).json({ message: 'Email ซ้ำ' });
      fail(res, err);
    }
  });

  app.delete('/api/admin/users/:id', ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (id === req.user.id) return res.status(400).json({ message: 'ไม่สามารถลบบัญชีตัวเองได้' });
      await prisma.$transaction([
        prisma.booking.updateMany({ where: { userId: id, status: { not: 'CANCELLED' } }, data: { status: 'CANCELLED' } }),
        prisma.user.delete({ where: { id } }),
      ]);
      kickUserSockets(id);
      res.json({ message: 'User deleted' });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'User not found' });
      fail(res, err);
    }
  });
};

module.exports.DORMS = DORMS;
module.exports.ensureRooms = ensureRooms;
