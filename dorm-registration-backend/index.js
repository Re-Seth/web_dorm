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

// ==========================================
// 1. Authentication Endpoints
// ==========================================

// POST /register - สมัครสมาชิก
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

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
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// POST /login - เข้าสู่ระบบ
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role }
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

// GET /users/:id - ดึงข้อมูล user ตาม ID
app.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /users/:id - แก้ไขข้อมูล user
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role } = req.body;

    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
    }

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
    res.status(500).json({ message: 'Internal server error', error: err.message });
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
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// ==========================================
// 3. Maintenance (แจ้งซ่อม) Endpoints
// ==========================================

// GET /api/maintenance - ดึงรายการแจ้งซ่อมทั้งหมด
app.get('/api/maintenance', async (req, res) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance requests', error: err.message });
  }
});

// POST /api/maintenance - สร้างรายการแจ้งซ่อมใหม่
app.post('/api/maintenance', async (req, res) => {
  try {
    const { roomId, userId, title, description } = req.body;
    const newRequest = await prisma.maintenanceRequest.create({
      data: {
        roomId: Number(roomId),
        userId: Number(userId || 1),
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
// 4. Real-time Power Monitoring (Socket.io)
// ==========================================

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