// ==========================================
// ตรวจข้อมูลบัญชีผู้ใช้ (ใช้ร่วมกันระหว่างหน้าสมัครสมาชิกและหลังบ้าน)
// ==========================================
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// frontend ใช้อีเมลเป็น username จึงต้องยอมรับ @ . + -
const USERNAME_RE = /^[A-Za-z0-9._@+-]{3,100}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72; // bcrypt ใช้แค่ 72 ไบต์แรก
const NAME_MAX = 100;

function passwordError(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return 'รหัสผ่านยาวเกินไป';
  return null;
}

function emailError(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email) ? null : 'อีเมลไม่ถูกต้อง';
}

function usernameError(username) {
  return typeof username === 'string' && USERNAME_RE.test(username) ? null : 'ชื่อผู้ใช้ไม่ถูกต้อง (3-100 ตัวอักษร a-z 0-9 . _ @ + -)';
}

function nameError(name) {
  if (name === undefined || name === null) return null;
  return typeof name === 'string' && name.length <= NAME_MAX ? null : `ชื่อยาวได้ไม่เกิน ${NAME_MAX} ตัวอักษร`;
}

// ตัดข้อความตามจำนวนตัวอักษรจริง (code point) — String.slice ตัดกลาง emoji แล้ว Prisma บันทึกไม่ได้ (500)
function clip(value, max) {
  return Array.from(String(value ?? '').trim()).slice(0, max).join('');
}

// ค่าจาก body ต้องเป็นข้อความ (กัน object/array ที่ทำให้ Prisma error หรือบันทึกเป็น "[object Object]")
const isText = (v) => typeof v === 'string' || typeof v === 'number';

module.exports = { passwordError, emailError, usernameError, nameError, clip, isText };
