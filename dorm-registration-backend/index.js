const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // ใช้ร่วมกับ Socket.io
const prisma = new PrismaClient();

// ตั้งค่า Socket.io สำหรับ Real-time
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

app.use(cors());
app.use(express.json());

// ค่าเริ่มต้นสำหรับ JWT Secret กรณีไม่ได้ตั้งใน .env
const JWT_SECRET = process.env.JWT_SECRET || 'dorm_secret_key_1234';

// ==========================================
// Middleware: ตรวจสอบ JWT Token
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware เสริมสำหรับกรณีที่ไม่บังคับ Token (optional)
const optionalToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

// Middleware: ตรวจสอบสิทธิ์ผู้จัดการหอพัก (ADMIN)
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: สงวนสิทธิ์สำหรับผู้จัดการหอพัก (Admin) เท่านั้น' });
};

// ==========================================
// 1. Authentication Endpoints
// ==========================================

// POST /register - สมัครสมาชิก
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, name, phone } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username และ Password จำเป็นต้องระบุ' });
    }

    const resolvedEmail = email || `${username}@buu.ac.th`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email: resolvedEmail,
        password: hashedPassword,
        name: name || username,
        profile: {
          create: {
            phone: phone || '',
            firstName: name || '',
          }
        }
      },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true }
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Username หรือ Email นี้มีผู้ใช้งานแล้ว' });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// POST /login - เข้าสู่ระบบ
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        booking: {
          include: {
            room: { include: { dorm: true } },
            payment: true
          }
        }
      }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile,
        booking: user.booking
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// POST /logout - ออกจากระบบ
app.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// POST /change-password - เปลี่ยนรหัสผ่าน
app.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// GET /me - ดึงข้อมูลผู้ใช้ปัจจุบันพร้อม Profile, Booking, Payment, Review
app.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        profile: true,
        booking: {
          include: {
            room: { include: { dorm: true } },
            payment: true
          }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// GET /check-username/:name - ตรวจสอบ username ว่างไหม
app.get('/check-username/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const existingUser = await prisma.user.findUnique({ where: { username: name } });

    res.json({
      username: name,
      available: !existingUser
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// GET /users - ดึงข้อมูล user ทั้งหมด
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, username: true, email: true, name: true, role: true, createdAt: true },
        orderBy: { id: 'asc' }
      }),
      prisma.user.count()
    ]);

    res.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// ==========================================
// 2. ข้อมูลนิสิตและผู้ปกครอง (Student Profile)
// ==========================================

// GET /api/student-profile - ดึงข้อมูลนิสิตและผู้ปกครอง
app.get('/api/student-profile', authenticateToken, async (req, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch student profile', error: err.message });
  }
});

// POST /api/student-profile - บันทึกหรืออัปเดตข้อมูลนิสิตและผู้ปกครอง
app.post('/api/student-profile', authenticateToken, async (req, res) => {
  try {
    const {
      prefix,
      firstName,
      lastName,
      citizenId,
      phone,
      fatherPrefix,
      fatherFirstName,
      fatherLastName,
      fatherPhone,
      motherPrefix,
      motherFirstName,
      motherLastName,
      motherPhone
    } = req.body;

    const profileData = {
      prefix: prefix || '',
      firstName: firstName || '',
      lastName: lastName || '',
      citizenId: citizenId || '',
      phone: phone || '',
      fatherPrefix: fatherPrefix || '',
      fatherFirstName: fatherFirstName || '',
      fatherLastName: fatherLastName || '',
      fatherPhone: fatherPhone || '',
      motherPrefix: motherPrefix || '',
      motherFirstName: motherFirstName || '',
      motherLastName: motherLastName || '',
      motherPhone: motherPhone || ''
    };

    const profile = await prisma.studentProfile.upsert({
      where: { userId: req.user.id },
      update: profileData,
      create: {
        userId: req.user.id,
        ...profileData
      }
    });

    if (firstName && lastName) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name: `${prefix || ''} ${firstName} ${lastName}`.trim() }
      });
    }

    res.json({ message: 'บันทึกข้อมูลนิสิตเรียบร้อยแล้ว', profile });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save student profile', error: err.message });
  }
});

// ==========================================
// 3. หอพักและห้องพัก (Dormitories & Rooms)
// ==========================================

// GET /api/dorms - ดึงรายการหอพักทั้งหมด
app.get('/api/dorms', async (req, res) => {
  try {
    const dorms = await prisma.dorm.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(dorms);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dorms', error: err.message });
  }
});

// GET /api/dorms/:dormId/rooms - ดึงห้องพักตามหอพักและชั้น พร้อมจำนวนคนที่จองจริง
app.get('/api/dorms/:dormId/rooms', async (req, res) => {
  try {
    const { dormId } = req.params;
    const floor = req.query.floor ? parseInt(req.query.floor) : undefined;

    const where = { dormId };
    if (floor) where.floor = floor;

    const rooms = await prisma.room.findMany({
      where,
      include: {
        bookings: {
          select: { id: true, userId: true, status: true }
        }
      },
      orderBy: { code: 'asc' }
    });

    // แปลงข้อมูลให้ส่งค่า occupied ออกไปตรงๆ
    const formattedRooms = rooms.map((room) => ({
      id: room.id,
      code: room.code,
      dormId: room.dormId,
      floor: room.floor,
      capacity: room.capacity,
      occupied: room.bookings.length,
      isFull: room.bookings.length >= room.capacity
    }));

    res.json(formattedRooms);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rooms', error: err.message });
  }
});

// ==========================================
// 4. การจองห้องพัก (Bookings)
// ==========================================

// POST /api/bookings - จองห้องพัก
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;

    if (!roomId) {
      return res.status(400).json({ message: 'กรุณาระบุ roomId ที่ต้องการจอง' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        bookings: true,
        dorm: true
      }
    });

    if (!room) {
      return res.status(404).json({ message: 'ไม่พบห้องพักที่ระบุ' });
    }

    if (room.bookings.length >= room.capacity) {
      return res.status(400).json({ message: 'ขออภัย ห้องพักนี้เต็มแล้ว' });
    }

    // ตรวจสอบว่าผู้ใช้เคยจองไปแล้วหรือไม่
    const existingBooking = await prisma.booking.findUnique({
      where: { userId }
    });

    let booking;
    if (existingBooking) {
      booking = await prisma.booking.update({
        where: { userId },
        data: { roomId, status: 'CONFIRMED' },
        include: { room: { include: { dorm: true } }, payment: true }
      });
    } else {
      booking = await prisma.booking.create({
        data: {
          userId,
          roomId,
          status: 'CONFIRMED'
        },
        include: { room: { include: { dorm: true } }, payment: true }
      });
    }

    res.status(201).json({ message: 'จองห้องพักสำเร็จ', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to book room', error: err.message });
  }
});

// GET /api/bookings/my - ดึงข้อมูลการจองของผู้ใช้ปัจจุบัน
app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { userId: req.user.id },
      include: {
        room: { include: { dorm: true } },
        payment: true
      }
    });

    res.json(booking || null);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch booking', error: err.message });
  }
});

// ==========================================
// 5. การชำระเงินและใบเสร็จ (Payments & Receipts)
// ==========================================

// POST /api/payments - บันทึกการชำระเงิน
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { method, amount } = req.body;
    const userId = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { userId }
    });

    if (!booking) {
      return res.status(400).json({ message: 'ไม่พบรายการจองห้องพัก กรุณาจองห้องก่อนชำระเงิน' });
    }

    const receiptNo = 'RCPT-' + Date.now().toString().slice(-8);

    const payment = await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        method: method || 'qr',
        amount: Number(amount) || 1999,
        status: 'PAID',
        paidAt: new Date()
      },
      create: {
        bookingId: booking.id,
        receiptNo,
        amount: Number(amount) || 1999,
        method: method || 'qr',
        status: 'PAID'
      }
    });

    res.json({ message: 'ชำระเงินสำเร็จ', payment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process payment', error: err.message });
  }
});

// GET /api/payments/receipt - ดึงข้อมูลใบเสร็จรับเงิน
app.get('/api/payments/receipt', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        booking: {
          include: {
            room: { include: { dorm: true } },
            payment: true
          }
        }
      }
    });

    if (!user || !user.booking || !user.booking.payment) {
      return res.status(404).json({ message: 'ยังไม่พบประวัติการชำระเงิน' });
    }

    res.json({
      receiptNo: user.booking.payment.receiptNo,
      amount: user.booking.payment.amount,
      method: user.booking.payment.method,
      paidAt: user.booking.payment.paidAt,
      student: user.profile || { firstName: user.name || user.username },
      room: user.booking.room,
      dorm: user.booking.room.dorm
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch receipt', error: err.message });
  }
});

// ==========================================
// 6. แบบประเมินและรีวิว (Reviews & Feedback)
// ==========================================

// POST /api/reviews - ส่งรีวิว
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating) {
      return res.status(400).json({ message: 'กรุณาให้คะแนนความพึงพอใจ' });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        rating: Number(rating),
        comment: comment || ''
      }
    });

    res.status(201).json({ message: 'บันทึกความคิดเห็นเรียบร้อยแล้ว', review });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit review', error: err.message });
  }
});

// GET /api/reviews - ดึงรายการรีวิว
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, name: true } }
      }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
  }
});

// ==========================================
// 7. แจ้งซ่อม (Maintenance)
// ==========================================

// GET /api/maintenance - ดึงรายการแจ้งซ่อมทั้งหมด
app.get('/api/maintenance', async (req, res) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, name: true } }
      }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance requests', error: err.message });
  }
});

// POST /api/maintenance - สร้างรายการแจ้งซ่อมใหม่
app.post('/api/maintenance', optionalToken, async (req, res) => {
  try {
    const { roomId, userId, title, description } = req.body;
    const finalUserId = req.user?.id || (userId ? Number(userId) : null);

    const newRequest = await prisma.maintenanceRequest.create({
      data: {
        roomId: Number(roomId) || 101,
        userId: finalUserId,
        title,
        description,
        status: 'PENDING'
      }
    });
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create request', error: err.message });
  }
});

// PATCH /api/maintenance/:id/status - อัปเดตสถานะการแจ้งซ่อม
app.patch('/api/maintenance/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await prisma.maintenanceRequest.update({
      where: { id: Number(id) },
      data: { status }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// ==========================================
// 8. มอนิเตอร์ไฟฟ้าแบบเรียลไทม์ (Socket.io & SQLite DB)
// ==========================================

let accumulatedUnits = 142.5; // หน่วยไฟสะสมเริ่มต้น (kWh)
const UNIT_RATE = 7.0;        // ค่าไฟหน่วยละ 7 บาท
let tickCount = 0;

// จำลองการอ่านค่ามิเตอร์ไฟฟ้าทุก 3 วินาที
setInterval(async () => {
  const current = +(Math.random() * 4.5 + 0.5).toFixed(2);
  const voltage = +(218 + Math.random() * 5).toFixed(1);
  const powerKw = +((voltage * current) / 1000).toFixed(3); // kW
  const powerWatt = +(powerKw * 1000).toFixed(0);

  accumulatedUnits += +(powerKw * (3 / 3600)).toFixed(4);
  const estimatedCost = +(accumulatedUnits * UNIT_RATE).toFixed(2);

  const powerData = {
    roomId: 101,
    voltage,
    current,
    power: powerWatt,
    energyUnits: +accumulatedUnits.toFixed(2),
    estimatedCost,
    timestamp: new Date().toLocaleTimeString()
  };

  // ส่งข้อมูล Real-time ผ่าน Socket.io
  io.emit('power_update', powerData);

  // บันทึกลง SQLite Database ทุกๆ 10 ticks (30 วินาที)
  tickCount++;
  if (tickCount % 10 === 0) {
    try {
      await prisma.powerUsage.create({
        data: {
          roomId: 101,
          voltage,
          current,
          power: Number(powerWatt),
          energyUnits: +accumulatedUnits.toFixed(2)
        }
      });
    } catch (e) {
      // ignore write error in background
    }
  }
}, 3000);

// GET /api/power/history - ดึงประวัติการใช้ไฟฟ้าจาก SQLite
app.get('/api/power/history', async (req, res) => {
  try {
    const history = await prisma.powerUsage.findMany({
      where: { roomId: 101 },
      take: 20,
      orderBy: { recordedAt: 'desc' }
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch power history', error: err.message });
  }
});

// ==========================================
// 9. ระบบผู้จัดการหอพัก (Admin & Dorm Management)
// ==========================================

// GET /api/admin/overview - สรุปสถิติภาพรวมสำหรับผู้จัดการหอพัก
app.get('/api/admin/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalBookings,
      totalRooms,
      payments,
      pendingMaintenance,
      inProgressMaintenance,
      completedMaintenance,
      dorms,
      recentBookings,
      recentMaintenance
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.booking.count(),
      prisma.room.count(),
      prisma.payment.findMany({ where: { status: 'PAID' } }),
      prisma.maintenanceRequest.count({ where: { status: 'PENDING' } }),
      prisma.maintenanceRequest.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.maintenanceRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.dorm.findMany({
        include: {
          rooms: {
            include: {
              bookings: true
            }
          }
        },
        orderBy: { id: 'asc' }
      }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, name: true, profile: true } },
          room: { include: { dorm: true } },
          payment: true
        }
      }),
      prisma.maintenanceRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, name: true } }
        }
      })
    ]);

    const totalCapacity = totalRooms * 4; // แต่ละห้องความจุ 4 คน
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const occupancyRate = totalCapacity > 0 ? +((totalBookings / totalCapacity) * 100).toFixed(1) : 0;

    const dormsSummary = dorms.map((d) => {
      const dormCapacity = d.rooms.reduce((acc, r) => acc + (r.capacity || 4), 0);
      const dormBookings = d.rooms.reduce((acc, r) => acc + r.bookings.length, 0);
      return {
        id: d.id,
        name: d.name,
        gender: d.gender,
        floors: d.floors,
        totalRooms: d.rooms.length,
        capacity: dormCapacity,
        occupied: dormBookings,
        available: Math.max(0, dormCapacity - dormBookings),
        percent: dormCapacity > 0 ? +((dormBookings / dormCapacity) * 100).toFixed(1) : 0
      };
    });

    res.json({
      stats: {
        totalUsers,
        totalStudents,
        totalBookings,
        totalRooms,
        totalCapacity,
        occupancyRate,
        totalRevenue,
        pendingMaintenance,
        inProgressMaintenance,
        completedMaintenance
      },
      dormsSummary,
      recentBookings,
      recentMaintenance
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admin overview', error: err.message });
  }
});

// GET /api/admin/residents - รายชื่อผู้พักทั้งหมดพร้อมตัวกรอง
app.get('/api/admin/residents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dormId, floor, search, status } = req.query;

    const bookings = await prisma.booking.findMany({
      where: {
        ...(dormId ? { room: { dormId } } : {}),
        ...(floor ? { room: { floor: parseInt(floor) } } : {}),
        ...(status ? { status } : {})
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        room: {
          include: {
            dorm: true
          }
        },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // กรองคำค้นหา (ชื่อนิสิต, รหัสนิสิต, รหัสห้อง)
    let filtered = bookings;
    if (search) {
      const q = search.toLowerCase();
      filtered = bookings.filter((b) => {
        const username = b.user?.username?.toLowerCase() || '';
        const name = b.user?.name?.toLowerCase() || '';
        const roomCode = b.room?.code?.toLowerCase() || '';
        const citizenId = b.user?.profile?.citizenId || '';
        return username.includes(q) || name.includes(q) || roomCode.includes(q) || citizenId.includes(q);
      });
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch residents', error: err.message });
  }
});

// POST /api/admin/bookings/cancel - ผู้จัดการยกเลิกการจองห้องพัก
app.post('/api/admin/bookings/cancel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { payment: true }
    });

    if (!booking) {
      return res.status(404).json({ message: 'ไม่พบรายการจองนี้' });
    }

    // ลบการชำระเงินที่เกี่ยวข้องก่อน
    if (booking.payment) {
      await prisma.payment.delete({ where: { id: booking.payment.id } });
    }

    // ลบการจอง
    await prisma.booking.delete({ where: { id: Number(bookingId) } });

    res.json({ message: 'ยกเลิกการจองห้องพักเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel booking', error: err.message });
  }
});

// GET /api/admin/payments - รายการชำระเงินทั้งหมด
app.get('/api/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            user: { select: { id: true, username: true, name: true, profile: true } },
            room: { include: { dorm: true } }
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payments', error: err.message });
  }
});

// PATCH /api/admin/payments/:id/status - อัปเดตสถานะการชำระเงิน
app.patch('/api/admin/payments/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const payment = await prisma.payment.update({
      where: { id: Number(id) },
      data: { status }
    });

    res.json({ message: 'อัปเดตสถานะการชำระเงินเรียบร้อย', payment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update payment status', error: err.message });
  }
});

// GET /api/admin/users - ดึงรายชื่อผู้ใช้ทั้งหมด
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        profile: true,
        booking: {
          include: {
            room: { include: { dorm: true } },
            payment: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// PATCH /api/admin/users/:id/role - เปลี่ยน Role ของผู้ใช้ (ADMIN / USER)
app.patch('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Role must be USER or ADMIN' });
    }

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { role },
      select: { id: true, username: true, role: true, name: true }
    });

    res.json({ message: `อัปเดตสิทธิ์ของ ${updated.username} เป็น ${role} เรียบร้อย`, user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user role', error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Client connected to Real-time Power feed:', socket.id);
});

// ==========================================
// Start Server
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
});