const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { passwordError, emailError, usernameError, nameError } = require('./validation');
require('dotenv').config();

// ต้องตั้ง JWT_SECRET ใน .env เสมอ — ถ้าใช้ค่าที่เดาได้ คนอื่นจะปลอม token เป็น Admin ได้
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('❌ กรุณาตั้ง JWT_SECRET ใน .env (อย่างน้อย 16 ตัวอักษร) ก่อนเริ่มเซิร์ฟเวอร์');
  process.exit(1);
}

// origin ของ frontend ที่อนุญาต (คั่นด้วย ,) — ค่าเริ่มต้น: Vite dev และ Docker
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080')
  .split(',').map((s) => s.trim()).filter(Boolean);

const app = express();
const server = http.createServer(app); // ใช้ร่วมกับ Socket.io
const prisma = new PrismaClient();

// ตั้งค่า Socket.io สำหรับ Real-time
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json({ limit: '300kb' })); // รองรับรูปโปรไฟล์บนบัตรผู้เช่า

// :id ทุก route ต้องเป็นตัวเลข (กัน NaN ไปถึง Prisma แล้วกลายเป็น 500)
app.param('id', (req, res, next, id) => {
  if (!/^\d{1,9}$/.test(id)) return res.status(400).json({ message: 'id ไม่ถูกต้อง' });
  next();
});

// error ภายใน: log ไว้ฝั่งเซิร์ฟเวอร์ ไม่ส่งรายละเอียดกลับให้ผู้ใช้
const serverError = (res, err, message = 'Internal server error') => {
  console.error(err);
  res.status(500).json({ message });
};

const limiter = (windowMinutes, limit, message, options = {}) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message },
  ...options,
});
// นับเฉพาะครั้งที่ล้มเหลว แยกตาม IP + บัญชี — นักศึกษาหลายคนในหอใช้ IP เดียวกัน (NAT) จึงไม่ควรบล็อกกันเอง
const loginLimiter = limiter(15, 10, 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ใน 15 นาที', {
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.username ?? req.user?.id ?? '').toLowerCase()}`,
});
const registerLimiter = limiter(15, 30, 'สมัครสมาชิกบ่อยเกินไป กรุณาลองใหม่ภายหลัง');
const lookupLimiter = limiter(1, 30, 'เรียกใช้งานบ่อยเกินไป กรุณาลองใหม่ภายหลัง');

const signToken = (user) =>
  jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

// ตรวจ token แล้วโหลดผู้ใช้จากฐานข้อมูล — ใช้ role ล่าสุดเสมอ (ถูกลดสิทธิ์/ลบบัญชีแล้วมีผลทันที)
// และ token ที่ออกก่อนเปลี่ยนรหัสผ่านจะใช้ไม่ได้อีก
async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, username: true, role: true, passwordChangedAt: true },
  });
  if (!user) return null;
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) return null;
  return { id: user.id, username: user.username, role: user.role };
}

// ==========================================
// Middleware: ตรวจสอบ JWT Token
// ==========================================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Token required' });
  }

  try {
    const user = await userFromToken(token);
    if (!user) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  } catch (err) {
    serverError(res, err);
  }
};

const requireAdmin = (req, res, next) =>
  req.user?.role === 'ADMIN'
    ? next()
    : res.status(403).json({ message: 'Forbidden: สงวนสิทธิ์สำหรับผู้จัดการหอพัก (Admin) เท่านั้น' });

// ==========================================
// 1. Authentication Endpoints
// ==========================================

// POST /register - สมัครสมาชิก
app.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    const invalid = usernameError(username) || emailError(email) || passwordError(password) || nameError(name);
    if (invalid) return res.status(400).json({ message: invalid });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, name },
      select: { id: true, username: true, email: true, name: true, createdAt: true }
    });

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Username or Email already exists' });
    }
    serverError(res, err);
  }
});

// POST /login - เข้าสู่ระบบ
app.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // เข้าสู่ระบบได้ทั้ง username หรืออีเมล
    const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: username }] } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.json({
      message: 'Login successful',
      token: signToken(user),
      user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /logout - ออกจากระบบ (token เป็นแบบ stateless ฝั่ง client ลบ token ทิ้งเอง)
app.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// POST /change-password - เปลี่ยนรหัสผ่าน (token เดิมทั้งหมดใช้ไม่ได้ ส่ง token ใหม่กลับไป)
app.post('/change-password', authenticateToken, loginLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    const invalid = passwordError(newPassword);
    if (invalid) return res.status(400).json({ message: invalid });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword, passwordChangedAt: new Date() }
    });

    res.json({ message: 'Password updated successfully', token: signToken(updated) });
  } catch (err) {
    serverError(res, err);
  }
});

// ==========================================
// 2. User Management Endpoints
// ==========================================

// GET /me - ดึงข้อมูลตัวเอง
app.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true, updatedAt: true }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /check-username/:name - ตรวจสอบ username ว่างไหม
app.get('/check-username/:name', lookupLimiter, async (req, res) => {
  try {
    const { name } = req.params;
    const existingUser = await prisma.user.findUnique({ where: { username: name } });

    res.json({
      username: name,
      available: !existingUser
    });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /users - ดึงข้อมูล user ทั้งหมด (เฉพาะ Admin)
app.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
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
    serverError(res, err);
  }
});

// GET /users/:id - ดึงข้อมูล user ตาม ID (ตัวเอง หรือ Admin)
app.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /users/:id - แก้ไขข้อมูล user (เปลี่ยน role ได้เฉพาะ Admin)
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role } = req.body;
    const isAdmin = req.user.role === 'ADMIN';

    if (req.user.id !== id && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
    }
    if (role !== undefined) {
      if (!isAdmin) return res.status(403).json({ message: 'Forbidden: เปลี่ยนสิทธิ์ผู้ใช้ได้เฉพาะ Admin' });
      if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ message: 'Role must be USER or ADMIN' });
      if (id === req.user.id && role !== 'ADMIN') return res.status(400).json({ message: 'ไม่สามารถลดสิทธิ์ตัวเองได้' });
    }
    const invalid = (email !== undefined && emailError(email)) || nameError(name);
    if (invalid) return res.status(400).json({ message: invalid });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, role },
      select: { id: true, username: true, email: true, name: true, role: true, updatedAt: true }
    });

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    serverError(res, err);
  }
});

// DELETE /users/:id - ลบ user
app.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own account' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: `User ID ${id} deleted successfully` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    serverError(res, err);
  }
});

// ==========================================
// 3. Maintenance (แจ้งซ่อม) Endpoints
// ==========================================

const MAINTENANCE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

// แนบชื่อผู้แจ้ง (user) ให้รายการแจ้งซ่อม — หน้าผู้จัดการหอพักใช้แสดง "ผู้แจ้ง"
async function withReporters(requests) {
  const ids = [...new Set(requests.map((r) => r.userId).filter(Boolean))];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, name: true } })
    : [];
  return requests.map((r) => ({ ...r, user: users.find((u) => u.id === r.userId) || null }));
}

// ส่งเหตุการณ์แจ้งซ่อมให้เฉพาะผู้จัดการหอพัก และผู้แจ้งรายการนั้น
const emitMaintenance = (event, request) =>
  io.to('admins').to(`user:${request.userId}`).emit(event, request);

// GET /api/maintenance - Admin เห็นทั้งหมด / ผู้ใช้ทั่วไปเห็นเฉพาะที่ตัวเองแจ้ง
app.get('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      where: req.user.role === 'ADMIN' ? {} : { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(await withReporters(requests));
  } catch (err) {
    serverError(res, err, 'Failed to fetch maintenance requests');
  }
});

// POST /api/maintenance - สร้างรายการแจ้งซ่อมใหม่ (ผู้แจ้งคือผู้ใช้ที่ล็อกอินอยู่)
app.post('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    const roomId = Number(req.body.roomId);
    if (!Number.isInteger(roomId) || roomId < 1) {
      return res.status(400).json({ message: 'หมายเลขห้องไม่ถูกต้อง' });
    }
    if (!String(title || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ message: 'กรุณาระบุอุปกรณ์ที่ชำรุดและรายละเอียดอาการ' });
    }
    const newRequest = await prisma.maintenanceRequest.create({
      data: {
        roomId,
        userId: req.user.id,
        title: String(title).trim().slice(0, 200),
        description: String(description).trim().slice(0, 2000),
        status: 'PENDING'
      }
    });
    const [withUser] = await withReporters([newRequest]);
    // แจ้งเตือนผู้จัดการหอพักแบบ Real-time (กระดิ่งบนแถบด้านบน)
    emitMaintenance('maintenance_created', withUser);
    res.status(201).json(withUser);
  } catch (err) {
    serverError(res, err, 'Failed to create request');
  }
});

// PATCH /api/maintenance/:id/status - อัปเดตสถานะการแจ้งซ่อม (เฉพาะ Admin)
app.patch('/api/maintenance/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!MAINTENANCE_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }
    const updated = await prisma.maintenanceRequest.update({
      where: { id: Number(id) },
      data: { status }
    });
    emitMaintenance('maintenance_updated', updated);
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Request not found' });
    serverError(res, err, 'Failed to update status');
  }
});

// ==========================================
// 5. Admin API (ระบบหลังบ้าน) — ดูรายละเอียดใน adminRoutes.js
// ==========================================
// หน้าแดชบอร์ดผู้ดูแล (จาก branch kit) — ต้องมาก่อน adminRoutes
const deps = { app, prisma, authenticateToken, requireAdmin, serverError };
require('./adminDashboardRoutes')(deps);
require('./adminRoutes')(deps);
require('./studentRoutes')(deps);
require('./profileRoutes')(deps);
require('./registrationPeriod')({ app });
require('./demoLogin')({ app, prisma, signToken, serverError });

// ==========================================
// 4. Real-time Power Monitoring (Socket.io)
// ==========================================

// ไม่บังคับ token (ฟีดค่าไฟเปิดให้ทุกคน) แต่ถ้าแนบมาจะเข้าห้องของผู้ใช้/ผู้จัดการ เพื่อรับการแจ้งเตือนแจ้งซ่อม
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const user = token ? await userFromToken(token) : null;
    if (user) {
      socket.join(`user:${user.id}`);
      if (user.role === 'ADMIN') socket.join('admins');
    }
    next();
  } catch (err) {
    console.error(err);
    next();
  }
});

let accumulatedUnits = 142.5; // หน่วยไฟสะสมเริ่มต้น (kWh)
const UNIT_RATE = 7.0;        // ค่าไฟหน่วยละ 7 บาท

// จำลองการอ่านค่ามิเตอร์ไฟฟ้าทุก 3 วินาที
setInterval(() => {
  const current = +(Math.random() * 4.5 + 0.5).toFixed(2);
  const voltage = +(218 + Math.random() * 5).toFixed(1);
  const power = +((voltage * current) / 1000).toFixed(3); // kW

  accumulatedUnits += +(power * (3 / 3600)).toFixed(4);
  const estimatedCost = +(accumulatedUnits * UNIT_RATE).toFixed(2);

  const powerData = {
    roomId: 101,
    voltage,
    current,
    power: +(power * 1000).toFixed(0), // Watt
    energyUnits: +accumulatedUnits.toFixed(2),
    estimatedCost,
    timestamp: new Date().toLocaleTimeString()
  };

  io.emit('power_update', powerData);
}, 3000);

io.on('connection', (socket) => {
  console.log('⚡ Client connected to Real-time Power feed:', socket.id);
});

// ==========================================
// Start Server (ใช้ server.listen แทน app.listen เพื่อรองรับ WebSocket)
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
});
