// ==========================================
// เข้าสู่ระบบด้วยบัญชีทดลอง (สำหรับเว็บทดสอบเท่านั้น)
// เปิดด้วย DEMO_LOGIN=true ใน .env — ปิดไว้ (ค่าเริ่มต้น) endpoint จะตอบ 404
// บัญชีทดลองใช้รหัสผ่านสุ่ม จึงเข้าได้ทางปุ่มนี้ทางเดียว
// ==========================================
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DEMO_ACCOUNTS = {
  ADMIN: { username: 'demo-admin@demo.local', name: 'ผู้จัดการหอพัก (ทดลอง)' },
  USER: { username: 'demo-user@demo.local', name: 'ผู้เช่า (ทดลอง)' },
};

module.exports = function registerDemoLogin({ app, prisma, signToken, serverError }) {
  const enabled = process.env.DEMO_LOGIN === 'true';
  if (enabled) console.warn('⚠️  DEMO_LOGIN เปิดอยู่ — ใครก็เข้าระบบเป็น Admin ได้ ห้ามเปิดบนระบบจริง');

  app.get('/api/demo-login', (req, res) => res.json({ enabled }));

  app.post('/api/demo-login', async (req, res) => {
    if (!enabled) return res.status(404).json({ message: 'Not found' });
    const role = req.body?.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const { username, name } = DEMO_ACCOUNTS[role];
    try {
      const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const user = await prisma.user.upsert({
        where: { username },
        update: { role },
        create: { username, email: username, name, password, role },
      });
      res.json({
        message: 'Login successful',
        token: signToken(user),
        user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      serverError(res, err);
    }
  });
};
