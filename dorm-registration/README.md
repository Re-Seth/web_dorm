# หอพักเทาทอง — ระบบลงทะเบียนหอพักนิสิต (Frontend)

โครง frontend (React + Vite + Tailwind CSS) ที่สร้างตาม User Journey Map:
รับรู้ข่าวสาร → เข้าสู่ระบบ (OTP) → กรอกข้อมูล → เลือกห้อง → ชำระเงิน → ใบเสร็จ → รีวิว

## เทคโนโลยีที่ใช้

- **React 18 + Vite** — โครงสร้างหลัก, build เร็ว, deploy ง่าย
- **React Router v6** — จัดการเส้นทางหน้าเว็บทั้งหมด
- **Tailwind CSS** — ดีไซน์ธีม "เทาทอง" (charcoal + gold) ที่กำหนดเองใน `tailwind.config.js`
- **React Context (`AuthContext`, `RegistrationContext`)** — เก็บสถานะการล็อกอินและข้อมูลลงทะเบียนทั้งหมด พร้อม persist ลง `localStorage` เพื่อกันข้อมูลหายเมื่อรีเฟรช

## โครงสร้างโปรเจกต์

```
dorm-registration/
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
├── vercel.json              # config สำหรับ deploy บน Vercel (SPA rewrite)
├── public/_redirects        # config สำหรับ deploy บน Netlify
└── src/
    ├── main.jsx              # entry point, ครอบ Provider ทั้งหมด
    ├── App.jsx                # นิยาม routes ทั้งหมด
    ├── index.css              # Tailwind + base styles + shared classes (.btn-primary, .field ฯลฯ)
    ├── context/
    │   ├── AuthContext.jsx        # สถานะ login/logout
    │   └── RegistrationContext.jsx # ข้อมูลนิสิต/ผู้ปกครอง/ห้อง/การชำระเงิน/รีวิว
    ├── data/
    │   └── dorms.js            # mock ข้อมูลหอพัก/ชั้น/ห้อง (แทนที่ด้วย API จริงภายหลัง)
    ├── components/
    │   ├── OtpInput.jsx         # ช่องกรอก OTP 6 หลัก
    │   ├── StepIndicator.jsx    # แถบแสดงขั้นตอน (wizard)
    │   ├── PersonFields.jsx     # ฟอร์มข้อมูลบุคคล (ใช้ซ้ำกับนิสิต/บิดา/มารดา)
    │   ├── RoomCell.jsx         # ช่องห้องพักที่เปลี่ยนสีตามจำนวนผู้เข้าพัก
    │   ├── ConfirmModal.jsx     # ป็อปอัพยืนยันการทำรายการ
    │   ├── ProtectedRoute.jsx   # กันหน้าที่ต้อง login ก่อน
    │   └── Layout/
    │       ├── MainLayout.jsx   # โครง sidebar + topbar
    │       ├── Sidebar.jsx      # เมนูนำทางหลัก พร้อมสถานะ ✓ ของแต่ละขั้นตอน
    │       └── Topbar.jsx
    └── pages/
        ├── AuthPage.jsx              # หน้า 1-2: ลงทะเบียน/เข้าสู่ระบบ + ยืนยัน OTP
        ├── Dashboard.jsx             # หน้าหลักหลัง login
        ├── RegisterDorm/
        │   ├── RegisterWizard.jsx    # ครอบ 3 ขั้นตอนย่อยด้วย StepIndicator
        │   ├── StudentInfoStep.jsx   # หน้า 4: ข้อมูลนิสิต
        │   ├── ParentInfoStep.jsx    # หน้า 4: ข้อมูลบิดา-มารดา
        │   └── ReviewStep.jsx        # สรุปข้อมูลก่อนไปเลือกห้อง
        ├── RoomSelection.jsx         # หน้า 5: เลือกหอ/ชั้น/ห้อง (ผังห้องสีเขียว/เหลือง/แดง)
        ├── Payment.jsx               # หน้า 7: ชำระเงิน 1,999 บาท (QR / โอนธนาคาร)
        ├── Receipt.jsx               # ใบเสร็จ (จำลองอีเมลแจ้งเตือน) + ห้องที่จอง
        └── FeedbackReview.jsx        # หน้า 10: รีวิวเพื่อนำไปพัฒนาต่อ
```

## การรันโปรเจกต์ (Local Development)

ต้องมี [Node.js](https://nodejs.org) เวอร์ชัน 18 ขึ้นไป

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

## Build สำหรับ Production

```bash
npm run build
npm run preview   # ทดสอบไฟล์ที่ build แล้วก่อน deploy จริง
```

ไฟล์ที่ build เสร็จจะอยู่ในโฟลเดอร์ `dist/`

## วิธี Deploy

### Vercel
1. Push โปรเจกต์นี้ขึ้น GitHub
2. Import repo เข้า [vercel.com](https://vercel.com) → เลือก Framework Preset เป็น **Vite**
3. Build command: `npm run build`, Output directory: `dist` (Vercel ตรวจจับให้อัตโนมัติ, มี `vercel.json` จัดการ SPA routing ให้แล้ว)

### Netlify
1. Push ขึ้น GitHub แล้ว "New site from Git"
2. Build command: `npm run build`, Publish directory: `dist`
3. ไฟล์ `public/_redirects` จัดการ SPA routing ให้แล้ว

### GitHub Pages / โฮสต์ static อื่นๆ
1. `npm run build`
2. อัปโหลดเนื้อหาในโฟลเดอร์ `dist/` ไปยัง static host ที่ต้องการ
3. ตั้งค่า rewrite ทุก path ให้กลับไปที่ `index.html` (SPA)

## สิ่งที่ต้องต่อกับ Backend จริงก่อนใช้งานจริง

โปรเจกต์นี้เป็น **frontend scaffold** เท่านั้น ส่วนที่จำลอง (mock) ไว้และต้องแทนที่ด้วยระบบหลังบ้านจริง:

- **การยืนยันตัวตน**: `AuthContext.jsx` จำลอง login/OTP ฝั่ง client — ต้องเชื่อมกับ API ตรวจสอบ username/password และ OTP provider (SMS/Email) จริง พร้อมระบบ session/JWT
- **ข้อมูลห้องพัก**: `data/dorms.js` เป็น mock data แบบสุ่ม — ต้องดึงจาก API จริงแบบ real-time เพื่อกันการจองซ้ำ (race condition) ควรมี lock/transaction ฝั่งเซิร์ฟเวอร์ตอนกดยืนยันจอง
- **การชำระเงิน**: `Payment.jsx` มี QR ตัวอย่าง (ไม่ใช่ QR จริง) — ต้องเชื่อม payment gateway (เช่น PromptPay/Omise/2C2P) เพื่อสร้าง QR จริงและตรวจสอบสถานะการชำระเงิน
- **อีเมลใบเสร็จ**: ต้องเชื่อมบริการส่งอีเมล (เช่น backend + SMTP/SendGrid) หลัง webhook ยืนยันการชำระเงินสำเร็จ
- **การเก็บข้อมูล**: ปัจจุบันเก็บใน `localStorage` ของเบราว์เซอร์เพื่อ demo เท่านั้น ข้อมูลจริงต้องบันทึกลงฐานข้อมูลฝั่งเซิร์ฟเวอร์
