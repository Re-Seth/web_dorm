#  หอพักเทาทอง — ระบบลงทะเบียนหอพักนิสิต (Web Dorm)

ระบบลงทะเบียนหอพักนิสิตแบบครบวงจร ตั้งแต่สมัครสมาชิก/เข้าสู่ระบบ (OTP) กรอกข้อมูลนิสิต-ผู้ปกครอง เลือกห้องพัก ชำระเงิน ออกใบเสร็จ ไปจนถึงระบบแจ้งซ่อมและมอนิเตอร์การใช้ไฟฟ้าแบบเรียลไทม์

โปรเจกต์นี้เป็น **Monorepo** ประกอบด้วย 2 ส่วนหลัก:

| โฟลเดอร์ | หน้าที่ | เทคโนโลยีหลัก |
|---|---|---|
| [`dorm-registration/`](./dorm-registration) | Frontend (เว็บแอปสำหรับผู้ใช้งาน) | React 18 + Vite + Tailwind CSS |
| [`dorm-registration-backend/`](./dorm-registration-backend) | Backend (REST API + Real-time) | Express.js + Prisma + Socket.io |

---

##  ฟีเจอร์หลัก

- **Authentication** — สมัครสมาชิก / เข้าสู่ระบบ / ยืนยันตัวตนด้วย OTP / เปลี่ยนรหัสผ่าน / จัดการผู้ใช้ (JWT)
- **ลงทะเบียนหอพัก** — กรอกข้อมูลนิสิตและผู้ปกครองแบบเป็นขั้นตอน (Wizard)
- **เลือกห้องพัก** — ผังห้องแสดงสถานะว่าง/ไม่ว่างแบบสี (เขียว/เหลือง/แดง)
- **ชำระเงิน & ใบเสร็จ** — ชำระผ่าน QR/โอนธนาคาร พร้อมออกใบเสร็จจำลอง
- **แจ้งซ่อม (Maintenance)** — แจ้งปัญหาห้องพัก ติดตามสถานะ PENDING → IN_PROGRESS → COMPLETED
- **มอนิเตอร์ไฟฟ้าแบบเรียลไทม์** — ส่งค่าแรงดัน/กระแส/กำลังไฟฟ้าและหน่วยสะสมผ่าน Socket.io
- **แบบประเมิน/รีวิว** — ให้นิสิตรีวิวหลังใช้งานระบบ
- **👑 ระบบผู้จัดการหอพัก (Dorm Manager / Admin)** — แดชบอร์ดสรุปสถิติภาพรวม, จัดการผู้เข้าพักและยกเลิกการจอง, อนุมัติสถานะการชำระเงิน, จัดการงานแจ้งซ่อมบำรุง และจัดการสิทธิ์ผู้ใช้งาน (USER ↔ ADMIN)

---

### 🔑 บัญชีทดสอบระบบ

| ประเภทผู้ใช้งาน | Username | Password | สิทธิ์ (Role) | การเข้าถึง |
|---|---|---|---|---|
| **👑 ผู้จัดการหอพัก** | `admin` | `admin123` | `ADMIN` | เข้าถึงระบบจัดการหอพักทั้งหมด (`/app/admin`) |
| **👤 นิสิต (Demo)** | `64010001` | `123456` | `USER` | ระบบลงทะเบียน จองห้อง ชำระเงิน และแจ้งซ่อม |


##  เทคโนโลยีที่ใช้

**Frontend**
- React 18 + Vite
- React Router v6
- Tailwind CSS (ธีมกำหนดเอง "เทาทอง" — charcoal + gold)
- Axios, Chart.js / react-chartjs-2
- Socket.io Client

**Backend**
- Express.js + Socket.io (Real-time)
- Prisma ORM (SQLite)
- JWT (jsonwebtoken) สำหรับ Authentication
- bcryptjs สำหรับเข้ารหัสรหัสผ่าน

---

## โครงสร้างโปรเจกต์

```
web_dorm/
├── dorm-registration/            # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/           # UI Components (OtpInput, StepIndicator, Layout ฯลฯ)
│   │   ├── context/               # AuthContext, RegistrationContext
│   │   ├── data/                  # ข้อมูล mock หอพัก/ชั้น/ห้อง
│   │   └── pages/                 # AuthPage, Dashboard, RegisterDorm, RoomSelection, Payment ฯลฯ
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── vercel.json
│
└── dorm-registration-backend/    # Backend (Express + Prisma)
    ├── index.js                   # Entry point: routes + Socket.io
    └── prisma/
        └── schema.prisma          # Models: User, PowerUsage, MaintenanceRequest
```

> รายละเอียดโครงสร้าง frontend แบบเจาะลึกดูเพิ่มเติมได้ที่ [`dorm-registration/README.md`](./dorm-registration/README.md)

---

### 🚀 วิธีรันทั้งระบบแบบง่ายที่สุด (1 คำสั่ง หรือ 1 คลิก)

อยู่ในโฟลเดอร์หลัก `web_dorm/` สามารถเลือกวิธีใดวิธีหนึ่งได้เลย:

#### รันผ่าน Docker (แนะนำ — มี Node.js 20 พร้อมใช้ ไม่ต้องลงอะไรในเครื่อง)
- **วิธีที่ 1 (ดับเบิลคลิก):** ดับเบิลคลิกที่ไฟล์ [`docker-start.bat`](./docker-start.bat) (หรือดับเบิลคลิก [`start.bat`](./start.bat))
- **วิธีที่ 2 (Terminal):** รันคำสั่ง:
  ```bash
  docker compose up -d --build
  ```
- **หยุดการทำงาน:** ดับเบิลคลิก [`docker-stop.bat`](./docker-stop.bat) หรือรัน `docker compose down`

#### หรือรันผ่านเครื่องโฮสต์ (ต้องมี Node.js ติดตั้งไว้ในเครื่อง)
- **ดับเบิลคลิก:** ไฟล์ [`start.bat`](./start.bat) (หากไม่มี Node.js จะสลับไปรัน Docker ให้อัตโนมัติ)
- **Terminal:** รัน `npm start` หรือ `node start.js`

> ระบบจะเริ่มทำงานทั้ง Backend (Port 5000) และ Frontend (Port 5173) พร้อมเปิดเบราว์เซอร์ไปที่ [http://localhost:5173](http://localhost:5173) ให้อัตโนมัติ!

---

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/Re-Seth/web_dorm.git
cd web_dorm
```

### 2. ติดตั้งและรัน Backend

```bash
cd dorm-registration-backend
npm install
```

สร้างไฟล์ `.env` ในโฟลเดอร์ `dorm-registration-backend/`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_jwt_secret_here"
```

สร้างฐานข้อมูลด้วย Prisma แล้วรันเซิร์ฟเวอร์:

```bash
npx prisma migrate dev --name init
npm run dev      # โหมดพัฒนา (nodemon)
# หรือ
npm start        # โหมด production
```

### 3. ติดตั้งและรัน Frontend

เปิดเทอร์มินัลใหม่:

```bash
cd dorm-registration
npm install
npm run dev
```

จากนั้นเปิดเบราว์เซอร์ที่ URL ที่ Vite แสดง (ค่าเริ่มต้นคือ `http://localhost:5173`)

---

##  API Endpoints (Backend)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| POST | `/register` | สมัครสมาชิก |
| POST | `/login` | เข้าสู่ระบบ (คืนค่า JWT) |
| POST | `/logout` | ออกจากระบบ *(ต้องมี token)* |
| POST | `/change-password` | เปลี่ยนรหัสผ่าน *(ต้องมี token)* |
| GET | `/me` | ดึงข้อมูลผู้ใช้ปัจจุบัน *(ต้องมี token)* |
| GET | `/check-username/:name` | ตรวจสอบว่า username ซ้ำหรือไม่ |
| GET | `/users` | ดึงรายชื่อผู้ใช้ทั้งหมด *(ต้องมี token)* |
| GET | `/users/:id` | ดึงข้อมูลผู้ใช้รายบุคคล *(ต้องมี token)* |
| PUT | `/users/:id` | แก้ไขข้อมูลผู้ใช้ *(ต้องมี token)* |
| DELETE | `/users/:id` | ลบผู้ใช้ *(ต้องมี token)* |
| GET | `/api/student-profile` | ดึงข้อมูลนิสิตและผู้ปกครอง *(ต้องมี token)* |
| POST | `/api/student-profile` | บันทึก/อัปเดตข้อมูลนิสิตและผู้ปกครอง *(ต้องมี token)* |
| GET | `/api/dorms` | ดึงรายชื่อหอพักทั้งหมด |
| GET | `/api/dorms/:id/rooms` | ดึงรายชื่อห้องพักและจำนวนคนจองจริงตามชั้น |
| POST | `/api/bookings` | จองห้องพัก *(ต้องมี token)* |
| GET | `/api/bookings/my` | ดึงข้อมูลการจองของผู้ใช้ปัจจุบัน *(ต้องมี token)* |
| POST | `/api/payments` | ชำระเงินและออกใบเสร็จ *(ต้องมี token)* |
| GET | `/api/payments/receipt` | ดึงข้อมูลใบเสร็จรับเงิน *(ต้องมี token)* |
| POST | `/api/reviews` | ส่งคะแนนและข้อเสนอแนะ *(ต้องมี token)* |
| GET | `/api/reviews` | ดึงรายการรีวิวทั้งหมด |
| GET | `/api/maintenance` | ดึงรายการแจ้งซ่อมทั้งหมด |
| POST | `/api/maintenance` | สร้างรายการแจ้งซ่อมใหม่ |
| PATCH | `/api/maintenance/:id/status` | อัปเดตสถานะการแจ้งซ่อม |
| GET | `/api/power/history` | ดึงประวัติการใช้ไฟฟ้าย้อนหลังจาก SQLite |
| **GET** | `/api/admin/overview` | **(Admin)** สรุปสถิติภาพรวมหอพักทั้งหมดและความจุเตียง |
| **GET** | `/api/admin/residents` | **(Admin)** ดึงรายชื่อผู้เข้าพักทั้งหมด กรองตามหอพักและค้นหา |
| **POST** | `/api/admin/bookings/cancel` | **(Admin)** ยกเลิกการจองห้องพักของผู้ใช้เพื่อคืนเตียงว่าง |
| **GET** | `/api/admin/payments` | **(Admin)** ดึงรายการชำระเงินทั้งหมด |
| **PATCH** | `/api/admin/payments/:id/status`| **(Admin)** อัปเดตสถานะการชำระเงิน (PAID/PENDING) |
| **GET** | `/api/admin/users` | **(Admin)** ดึงรายชื่อผู้ใช้ทั้งหมด |
| **PATCH** | `/api/admin/users/:id/role` | **(Admin)** ปรับเปลี่ยนสิทธิ์ผู้ใช้ (USER ↔ ADMIN) |

นอกจากนี้ยังมีการส่งข้อมูลการใช้ไฟฟ้าแบบเรียลไทม์ผ่าน **Socket.io** พร้อมบันทึกประวัติลงฐานข้อมูล SQLite อัตโนมัติ

---

## 🐳 Docker Deployment (ทั้งระบบพร้อม Node.js)

ทั้งระบบ (Backend + Frontend) รองรับการรันผ่าน Docker โดยติดตั้ง **Node.js 20 Alpine** ภายในคอนเทนเนอร์ทั้งหมด

### คำสั่งควบคุมระบบผ่าน Docker

```bash
# สั่ง Build และรันทั้งระบบในเบื้องหลัง
docker compose up -d --build

# ดูสถานะคอนเทนเนอร์
docker compose ps

# ดู Logs ของ Backend หรือ Frontend
docker compose logs -f backend
docker compose logs -f frontend

# หยุดการทำงานของทั้งระบบ
docker compose down
```

### การตั้งค่า Port และ Services

| Service | Container Name | Port (โฮสต์) | รายละเอียด |
|---|---|---|---|
| **Backend** | `dorm_backend` | `http://localhost:5000` | Node.js 20 + Express + Prisma (SQLite persist) + Socket.io |
| **Frontend** | `dorm_frontend` | `http://localhost:5173` | Node.js 20 + Vite Preview (React 18 + Tailwind) |

> 💾 ฐานข้อมูล SQLite ใน `dorm-registration-backend/prisma/` ถูก mount แบบ volume ไว้บนโฮสต์ ทำให้ข้อมูลการจอง ผู้ใช้ และค่าไฟไม่สูญหายเมื่อหยุดคอนเทนเนอร์

---

##  License

ยังไม่ได้ระบุสัญญาอนุญาต (License) — โปรดเพิ่มไฟล์ `LICENSE` หากต้องการเผยแพร่แบบโอเพนซอร์ส
