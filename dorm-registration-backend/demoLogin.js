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

// เลขบัตรประชาชนตัวอย่างที่ผ่าน checksum (ไม่ใช่ของใครจริง)
function sampleCitizenId(base = '110000000000') {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(base[i]) * (13 - i);
  return base + ((11 - (sum % 11)) % 10);
}

// โปรไฟล์ผู้เช่าตัวอย่างของบัญชีทดลอง — ให้ทดสอบเลือกห้อง/ชำระเงิน/แจ้งซ่อมได้ทันที (ข้อมูลสมมติทั้งหมด)
const DEMO_PROFILE = {
  gender: 'Male',
  dormId: 'tt1',
  prefix: 'นาย',
  firstName: 'ทดลอง',
  lastName: 'ผู้เช่า',
  nameEn: 'Demo Tenant',
  citizenId: sampleCitizenId(),
  birthDate: new Date('2005-01-01T00:00:00Z'),
  address: 'ที่อยู่ตัวอย่างสำหรับบัญชีทดลอง',
  educationLevel: 'bachelor',
  school: 'มหาวิทยาลัยตัวอย่าง',
  faculty: 'คณะตัวอย่าง',
  studyYear: '1',
  mobile: '0800000000',
  contactEmail: 'demo-user@demo.local',
  emergencyName: 'ผู้ปกครอง ตัวอย่าง',
  emergencyRelation: 'บิดา',
  emergencyPhone: '0811111111',
  emergencyAddress: 'ที่อยู่ตัวอย่าง',
  emergency2Name: 'ญาติ ตัวอย่าง',
  emergency2Relation: 'มารดา',
  emergency2Phone: '0822222222',
  emergency2Address: 'ที่อยู่ตัวอย่าง',
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
      if (role === 'USER') {
        await prisma.tenantProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: { ...DEMO_PROFILE, userId: user.id },
        });
      }
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
