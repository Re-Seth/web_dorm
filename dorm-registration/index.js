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

// Middleware เช็ก Token ยืนยันตัวตน
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  });
};

// POST /register - สมัครสมาชิก
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, name }
    });

    res.status(201).json({ message: 'User registered', userId: user.id });
  } catch (err) {
    res.status(400).json({ error: 'Username or Email already exists' });
  }
});

// POST /login - เข้าสู่ระบบ
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
});

// GET /me - ดึงข้อมูลตัวเอง
app.get('/me', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, email: true, name: true, role: true, createdAt: true }
  });
  res.json(user);
});

// GET /check-username - ตรวจสอบ username
app.get('/check-username', async (req, res) => {
  const { name } = req.query;
  const existingUser = await prisma.user.findUnique({ where: { username: name } });
  res.json({ available: !existingUser });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));