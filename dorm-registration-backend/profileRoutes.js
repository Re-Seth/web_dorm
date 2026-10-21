// ==========================================
// Tenant Profile API — ข้อมูลผู้เช่าจากหน้าลงทะเบียน (ต้องล็อกอิน)
// กฎคัดกรองอาคารตามเพศ: ชาย → เทาทอง 1 (tt1) / หญิง → เทาทอง 2, 3, 4
// นอกรอบเปิดรับลงทะเบียน: สร้างโปรไฟล์ใหม่ไม่ได้ และแก้ได้เฉพาะข้อมูลติดต่อ / ผู้ติดต่อฉุกเฉิน / ยานพาหนะ
// ==========================================
const { getRegistrationPeriod } = require('./registrationPeriod');

const DORMS_BY_GENDER = {
  Male: ['tt1'],
  Female: ['tt2', 'tt3', 'tt4'],
};
const EDUCATION_LEVELS = ['bachelor', 'master', 'doctoral', 'student', 'general'];

// ช่องที่แก้ได้เฉพาะช่วงเปิดรับลงทะเบียน
const LOCKED_WHEN_CLOSED = [
  'gender', 'dormId', 'prefix', 'firstName', 'lastName', 'nameEn', 'citizenId', 'birthDate', 'address',
  'educationLevel', 'school', 'faculty', 'studyYear',
];

const PHONE_RE = /^0\d{8,9}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_LENGTH = 200_000; // ~150KB หลังถอด base64

function isValidThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

const str = (v) => String(v ?? '').trim();

// คืน { data } ถ้าผ่าน หรือ { error } ถ้าไม่ผ่าน
function parseProfile(body) {
  const gender = str(body.gender);
  if (!DORMS_BY_GENDER[gender]) return { error: 'กรุณาเลือกเพศ' };

  const dormId = str(body.dormId);
  if (!DORMS_BY_GENDER[gender].includes(dormId)) {
    return { error: gender === 'Male' ? 'ผู้สมัครเพศชายพักได้เฉพาะเทาทอง 1' : 'ผู้สมัครเพศหญิงเลือกได้เฉพาะเทาทอง 2, 3 หรือ 4' };
  }

  const required = {
    prefix: 'คำนำหน้า',
    firstName: 'ชื่อจริง',
    lastName: 'นามสกุล',
    nameEn: 'ชื่อภาษาอังกฤษ',
    address: 'ที่อยู่ตามทะเบียนบ้าน',
    emergencyName: 'ชื่อผู้ติดต่อฉุกเฉินคนที่ 1',
    emergencyRelation: 'ความสัมพันธ์ของผู้ติดต่อฉุกเฉินคนที่ 1',
    emergencyAddress: 'ที่อยู่ผู้ติดต่อฉุกเฉินคนที่ 1',
    emergency2Name: 'ชื่อผู้ติดต่อฉุกเฉินคนที่ 2',
    emergency2Relation: 'ความสัมพันธ์ของผู้ติดต่อฉุกเฉินคนที่ 2',
    emergency2Address: 'ที่อยู่ผู้ติดต่อฉุกเฉินคนที่ 2',
  };
  for (const [key, label] of Object.entries(required)) {
    if (!str(body[key])) return { error: `กรุณากรอก${label}` };
  }

  const citizenId = str(body.citizenId);
  if (!isValidThaiId(citizenId)) return { error: 'เลขประจำตัวประชาชนไม่ถูกต้อง' };

  const birthDate = new Date(str(body.birthDate));
  if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return { error: 'วันเกิดไม่ถูกต้อง' };

  const educationLevel = str(body.educationLevel);
  if (!EDUCATION_LEVELS.includes(educationLevel)) return { error: 'กรุณาเลือกระดับการศึกษา / ประเภทผู้เช่า' };
  const school = str(body.school);
  const faculty = str(body.faculty);
  const studyYear = str(body.studyYear);
  if (educationLevel !== 'general' && (!school || !studyYear)) {
    return { error: 'กรุณากรอกสถานศึกษาและชั้นปี' };
  }

  const mobile = str(body.mobile);
  if (!PHONE_RE.test(mobile)) return { error: 'เบอร์โทรศัพท์ผู้เช่าไม่ถูกต้อง' };
  const contactEmail = str(body.contactEmail).toLowerCase();
  if (contactEmail && !EMAIL_RE.test(contactEmail)) return { error: 'อีเมลติดต่อไม่ถูกต้อง' };
  if (!PHONE_RE.test(str(body.emergencyPhone))) return { error: 'เบอร์โทรผู้ติดต่อฉุกเฉินคนที่ 1 ไม่ถูกต้อง' };
  if (!PHONE_RE.test(str(body.emergency2Phone))) return { error: 'เบอร์โทรผู้ติดต่อฉุกเฉินคนที่ 2 ไม่ถูกต้อง' };

  const vehicleType = ['car', 'motorcycle'].includes(body.vehicleType) ? body.vehicleType : 'none';
  const vehicle = { vehicleType, vehicleBrand: null, vehicleColor: null, vehiclePlate: null, vehicleProvince: null };
  if (vehicleType !== 'none') {
    for (const key of ['vehicleBrand', 'vehicleColor', 'vehiclePlate', 'vehicleProvince']) vehicle[key] = str(body[key]);
    if (Object.values(vehicle).some((v) => !v)) return { error: 'กรุณากรอกยี่ห้อ สี เลขทะเบียน และจังหวัดของรถให้ครบ' };
  }

  return {
    data: {
      gender,
      dormId,
      prefix: str(body.prefix),
      firstName: str(body.firstName),
      lastName: str(body.lastName),
      nameEn: str(body.nameEn),
      citizenId,
      birthDate,
      address: str(body.address),
      educationLevel,
      school: school || null,
      faculty: faculty || null,
      studyYear: studyYear || null,
      mobile,
      lineId: str(body.lineId) || null,
      contactEmail: contactEmail || null,
      emergencyName: str(body.emergencyName),
      emergencyRelation: str(body.emergencyRelation),
      emergencyPhone: str(body.emergencyPhone),
      emergencyAddress: str(body.emergencyAddress),
      emergency2Name: str(body.emergency2Name),
      emergency2Relation: str(body.emergency2Relation),
      emergency2Phone: str(body.emergency2Phone),
      emergency2Address: str(body.emergency2Address),
      ...vehicle,
      keepForNextTerm: body.keepForNextTerm === true,
    },
  };
}

// ความยาวสูงสุดของแต่ละช่อง (นับตัวอักษรจริง) — กันข้อความยาวผิดปกติเต็มฐานข้อมูล
const LONG_FIELDS = new Set(['address', 'emergencyAddress', 'emergency2Address']);
function tooLongField(data) {
  return Object.entries(data).find(([key, v]) =>
    typeof v === 'string' && Array.from(v).length > (LONG_FIELDS.has(key) ? 500 : 200))?.[0];
}

module.exports = function registerProfileRoutes({ app, prisma, authenticateToken, serverError: fail }) {

  const findProfile = (userId) => prisma.tenantProfile.findUnique({ where: { userId } });

  app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
      res.json(await findProfile(req.user.id));
    } catch (err) { fail(res, err); }
  });

  app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
      const { data, error } = parseProfile(req.body || {});
      if (error) return res.status(400).json({ message: error });
      if (tooLongField(data)) {
        return res.status(400).json({ message: 'ข้อมูลบางช่องยาวเกินไป (ที่อยู่ไม่เกิน 500 ตัวอักษร ช่องอื่นไม่เกิน 200)' });
      }

      // จองห้องไว้แล้ว → เปลี่ยนเพศจนไม่ตรงกับอาคารที่จองไม่ได้ (ต้องให้แอดมินยกเลิกการจองก่อน)
      const booking = await prisma.booking.findFirst({
        where: { userId: req.user.id, status: { not: 'CANCELLED' } },
        include: { room: true },
      });
      if (booking && !DORMS_BY_GENDER[data.gender].includes(booking.room.dormId)) {
        return res.status(400).json({ message: `คุณจองห้อง ${booking.room.code} ไว้แล้ว จึงเปลี่ยนเพศ/อาคารที่ไม่ตรงกับห้องนี้ไม่ได้` });
      }

      const existing = await findProfile(req.user.id);
      const { isOpen } = getRegistrationPeriod();
      if (!existing && !isOpen) {
        return res.status(403).json({ message: 'ขณะนี้อยู่นอกรอบเปิดรับลงทะเบียน' });
      }
      // ปิดรับแล้ว: คงข้อมูลส่วนตัว/การศึกษา/อาคารไว้ตามเดิม แก้ได้เฉพาะส่วนที่เหลือ
      if (existing && !isOpen) {
        for (const key of LOCKED_WHEN_CLOSED) data[key] = existing[key];
      }

      const profile = await prisma.tenantProfile.upsert({
        where: { userId: req.user.id },
        update: data,
        create: { ...data, userId: req.user.id },
      });
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name: `${profile.prefix}${profile.firstName} ${profile.lastName}` },
      });
      res.json(profile);
    } catch (err) { fail(res, err); }
  });

  // เปิด/ปิด "บันทึกข้อมูลไว้ใช้ลงทะเบียนภาคเรียนถัดไป" โดยไม่ต้องส่งข้อมูลทั้งชุด
  app.patch('/api/profile/keep', authenticateToken, async (req, res) => {
    try {
      if (!(await findProfile(req.user.id))) return res.status(404).json({ message: 'ยังไม่มีข้อมูลผู้เช่า' });
      const profile = await prisma.tenantProfile.update({
        where: { userId: req.user.id },
        data: { keepForNextTerm: req.body?.keepForNextTerm === true },
      });
      res.json(profile);
    } catch (err) { fail(res, err); }
  });

  // รูปโปรไฟล์บนบัตรผู้เช่า (null = ลบรูป)
  app.patch('/api/profile/photo', authenticateToken, async (req, res) => {
    try {
      const photo = req.body?.photo ?? null;
      if (photo !== null && (typeof photo !== 'string' || !PHOTO_RE.test(photo) || photo.length > MAX_PHOTO_LENGTH)) {
        return res.status(400).json({ message: 'ไฟล์รูปไม่ถูกต้องหรือใหญ่เกินไป' });
      }
      if (!(await findProfile(req.user.id))) return res.status(404).json({ message: 'ยังไม่มีข้อมูลผู้เช่า' });
      const profile = await prisma.tenantProfile.update({ where: { userId: req.user.id }, data: { photo } });
      res.json(profile);
    } catch (err) { fail(res, err); }
  });
};

module.exports.DORMS_BY_GENDER = DORMS_BY_GENDER;
