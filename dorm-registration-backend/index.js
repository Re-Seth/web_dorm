const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ==========================================
// Middleware: ตรวจสอบ JWT Token
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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
      process.env.JWT_SECRET,
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
  // ฝั่ง Client ให้ลบ Token ออกจาก LocalStorage / Cookies
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

// GET /users - ดึงข้อมูล user ทั้งหมด (Pagination)
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

    // อนุญาตเฉพาะแก้ไขตัวเอง หรือผู้ใช้ระดับ ADMIN
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

    // อนุญาตเฉพาะ ADMIN หรือเจ้าของบัญชีลบได้
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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});