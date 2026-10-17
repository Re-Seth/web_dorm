// ==========================================
// Admin Dashboard API — ให้ข้อมูลตามรูปแบบที่หน้า AdminDashboard (มาจาก branch kit) ใช้
// แปลงจาก schema ปัจจุบัน: การชำระเงินอยู่ใน Booking, หอพักมาจากรายการ DORMS, ข้อมูลผู้เช่ามาจาก TenantProfile
// ต้อง register ก่อน adminRoutes เพราะ GET /api/admin/users ที่นี่ส่งข้อมูลครบกว่า (มี booking/profile)
// ==========================================
const { DORMS } = require('./adminRoutes');

const ROOMS_PER_FLOOR = 10; // ตรงกับผังห้องฝั่ง frontend (src/data/dorms.js)
const BED_CAPACITY = 4;
const ACTIVE = { status: { not: 'CANCELLED' } };

module.exports = function registerAdminDashboardRoutes({ app, prisma, authenticateToken }) {
  const requireAdmin = (req, res, next) =>
    req.user?.role === 'ADMIN'
      ? next()
      : res.status(403).json({ message: 'Forbidden: สงวนสิทธิ์สำหรับผู้จัดการหอพัก (Admin) เท่านั้น' });
  const guard = [authenticateToken, requireAdmin];
  const fail = (res, err, msg = 'Internal server error') => res.status(500).json({ message: msg, error: err.message });

  const dormOf = (dormId) => DORMS.find((d) => d.id === dormId);

  // โหลด user + โปรไฟล์ผู้เช่าของ userId ที่ระบุ แล้วคืน map id → user (รูปแบบเดียวกับ kit)
  async function usersById(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    const [users, profiles] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, username: true, name: true, email: true } }),
      prisma.tenantProfile.findMany({ where: { userId: { in: unique } } }),
    ]);
    const profileOf = Object.fromEntries(profiles.map((p) => [p.userId, p]));
    return Object.fromEntries(users.map((u) => [u.id, { ...u, profile: toKitProfile(profileOf[u.id]) }]));
  }

  const toKitProfile = (p) => p && {
    prefix: p.prefix,
    firstName: p.firstName,
    lastName: p.lastName,
    citizenId: p.citizenId,
    phone: p.mobile,
    dormId: p.dormId,
    gender: p.gender,
  };

  const toKitRoom = (room) => room && { ...room, dorm: { id: room.dormId, name: dormOf(room.dormId)?.name || room.dormId } };

  // การชำระเงินของ kit = ข้อมูลชำระเงินใน Booking (มีเลขใบเสร็จแล้วถือว่าเคยชำระ)
  const toKitPayment = (b) => b.receiptNo && {
    id: b.id,
    bookingId: b.id,
    receiptNo: b.receiptNo,
    amount: b.paymentAmount,
    method: (b.paymentMethod || 'QR').toLowerCase(),
    status: b.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
    paidAt: b.paidAt,
  };

  async function kitBookings(where = ACTIVE, take) {
    const bookings = await prisma.booking.findMany({ where, include: { room: true }, orderBy: { createdAt: 'desc' }, ...(take ? { take } : {}) });
    const users = await usersById(bookings.map((b) => b.userId));
    return bookings.map((b) => {
      const user = users[b.userId] || { id: b.userId, username: b.studentCode || '-', name: b.studentName, profile: null };
      // ผู้จองแบบเดิมที่ยังไม่มีโปรไฟล์ผู้เช่า: ใช้ชื่อ/เบอร์ที่บันทึกไว้ตอนจอง
      if (!user.profile) user.profile = { prefix: '', firstName: '', lastName: '', citizenId: '', phone: b.phone || '' };
      return { ...b, user, room: toKitRoom(b.room), payment: toKitPayment(b) };
    });
  }

  app.get('/api/admin/overview', ...guard, async (req, res) => {
    try {
      const [totalUsers, totalStudents, activeBookings, maint, recentBookings, recentMaintenance] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.booking.findMany({ where: ACTIVE, include: { room: true } }),
        prisma.maintenanceRequest.groupBy({ by: ['status'], _count: true }),
        kitBookings(ACTIVE, 5),
        prisma.maintenanceRequest.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      ]);

      const dormsSummary = DORMS.map((d) => {
        const totalRooms = d.floors * ROOMS_PER_FLOOR;
        const capacity = totalRooms * BED_CAPACITY;
        const occupied = activeBookings.filter((b) => b.room?.dormId === d.id).length;
        return {
          ...d,
          totalRooms,
          capacity,
          occupied,
          available: Math.max(0, capacity - occupied),
          percent: capacity ? +((occupied / capacity) * 100).toFixed(1) : 0,
        };
      });
      const totalRooms = dormsSummary.reduce((s, d) => s + d.totalRooms, 0);
      const totalCapacity = dormsSummary.reduce((s, d) => s + d.capacity, 0);
      const maintCount = (status) => maint.find((m) => m.status === status)?._count || 0;
      const reporters = await usersById(recentMaintenance.map((m) => m.userId));

      res.json({
        stats: {
          totalUsers,
          totalStudents,
          totalBookings: activeBookings.length,
          totalRooms,
          totalCapacity,
          occupancyRate: totalCapacity ? +((activeBookings.length / totalCapacity) * 100).toFixed(1) : 0,
          totalRevenue: activeBookings.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + (b.paymentAmount || 0), 0),
          pendingMaintenance: maintCount('PENDING'),
          inProgressMaintenance: maintCount('IN_PROGRESS'),
          completedMaintenance: maintCount('COMPLETED'),
        },
        dormsSummary,
        recentBookings,
        recentMaintenance: recentMaintenance.map((m) => ({ ...m, user: reporters[m.userId] || null })),
      });
    } catch (err) { fail(res, err, 'Failed to fetch admin overview'); }
  });

  app.get('/api/admin/residents', ...guard, async (req, res) => {
    try {
      const { dormId, floor, status } = req.query;
      const room = {
        ...(dormId ? { dormId: String(dormId) } : {}),
        ...(floor ? { floor: Number(floor) } : {}),
      };
      let residents = await kitBookings({
        ...(status ? { status: String(status) } : ACTIVE),
        ...(Object.keys(room).length ? { room } : {}),
      });
      const q = String(req.query.search || '').toLowerCase();
      if (q) {
        residents = residents.filter((r) =>
          [r.user?.username, r.user?.name, r.room?.code, r.user?.profile?.citizenId, r.user?.profile?.phone]
            .some((v) => String(v || '').toLowerCase().includes(q)));
      }
      res.json(residents);
    } catch (err) { fail(res, err, 'Failed to fetch residents'); }
  });

  // ยกเลิกการจอง = เปลี่ยนสถานะเป็น CANCELLED (เก็บประวัติไว้ เตียงว่างทันทีเพราะนับเฉพาะที่ไม่ถูกยกเลิก)
  app.post('/api/admin/bookings/cancel', ...guard, async (req, res) => {
    try {
      const id = Number(req.body?.bookingId);
      if (!id) return res.status(400).json({ message: 'bookingId is required' });
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return res.status(404).json({ message: 'ไม่พบรายการจองนี้' });
      await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
      res.json({ message: 'ยกเลิกการจองห้องพักเรียบร้อยแล้ว' });
    } catch (err) { fail(res, err, 'Failed to cancel booking'); }
  });

  app.get('/api/admin/payments', ...guard, async (req, res) => {
    try {
      const bookings = await kitBookings({ ...ACTIVE, receiptNo: { not: null } });
      res.json(bookings.map((b) => ({ ...b.payment, booking: { id: b.id, user: b.user, room: b.room } })));
    } catch (err) { fail(res, err, 'Failed to fetch payments'); }
  });

  app.patch('/api/admin/payments/:id/status', ...guard, async (req, res) => {
    try {
      const { status } = req.body || {};
      if (!['PAID', 'PENDING'].includes(status)) return res.status(400).json({ message: 'status ต้องเป็น PAID หรือ PENDING' });
      const id = Number(req.params.id);
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking?.receiptNo) return res.status(404).json({ message: 'ไม่พบรายการชำระเงินนี้' });
      const updated = await prisma.booking.update({
        where: { id },
        data: status === 'PAID'
          ? { paymentStatus: 'PAID', status: 'CONFIRMED', paidAt: booking.paidAt || new Date() }
          : { paymentStatus: 'UNPAID', status: 'PENDING' },
      });
      res.json({ message: 'อัปเดตสถานะการชำระเงินเรียบร้อย', payment: toKitPayment(updated) });
    } catch (err) { fail(res, err, 'Failed to update payment status'); }
  });

  app.get('/api/admin/users', ...guard, async (req, res) => {
    try {
      const [users, bookings, profiles] = await Promise.all([
        prisma.user.findMany({ select: { id: true, username: true, email: true, name: true, role: true, createdAt: true }, orderBy: { id: 'asc' } }),
        prisma.booking.findMany({ where: ACTIVE, include: { room: true }, orderBy: { createdAt: 'desc' } }),
        prisma.tenantProfile.findMany(),
      ]);
      res.json(users.map((u) => {
        const b = bookings.find((x) => x.userId === u.id);
        return {
          ...u,
          profile: toKitProfile(profiles.find((p) => p.userId === u.id)) || null,
          booking: b ? { ...b, room: toKitRoom(b.room), payment: toKitPayment(b) } : null,
        };
      }));
    } catch (err) { fail(res, err, 'Failed to fetch users'); }
  });

  app.patch('/api/admin/users/:id/role', ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { role } = req.body || {};
      if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ message: 'Role must be USER or ADMIN' });
      if (id === req.user.id && role !== 'ADMIN') return res.status(400).json({ message: 'ไม่สามารถลดสิทธิ์ตัวเองได้' });
      const user = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, username: true, role: true, name: true } });
      res.json({ message: `อัปเดตสิทธิ์ของ ${user.username} เป็น ${role} เรียบร้อย`, user });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ message: 'User not found' });
      fail(res, err, 'Failed to update user role');
    }
  });
};
