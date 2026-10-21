#  หอพักเทาทอง — ระบบลงทะเบียนหอพักนิสิต (Web Dorm)

ระบบลงทะเบียนหอพักนิสิตแบบครบวงจร ตั้งแต่สมัครผู้เช่า กรอกข้อมูลผู้เช่า/ผู้ติดต่อฉุกเฉิน เลือกห้องพัก ชำระเงิน ออกใบเสร็จ ไปจนถึงระบบแจ้งซ่อม มอนิเตอร์การใช้ไฟฟ้าแบบเรียลไทม์ และระบบหลังบ้านสำหรับผู้จัดการหอพัก

โปรเจกต์นี้เป็น **Monorepo** ประกอบด้วย 2 ส่วนหลัก:

| โฟลเดอร์ | หน้าที่ | เทคโนโลยีหลัก |
|---|---|---|
| [`dorm-registration/`](./dorm-registration) | Frontend (เว็บแอปสำหรับผู้ใช้งาน) | React 18 + Vite + Tailwind CSS |
| [`dorm-registration-backend/`](./dorm-registration-backend) | Backend (REST API + Real-time) | Express.js + Prisma + Socket.io |

---

##  ฟีเจอร์หลัก

- **Authentication** — สมัครสมาชิก / เข้าสู่ระบบ / เปลี่ยนรหัสผ่าน (JWT)
- **ลงทะเบียนผู้เช่า** — กรอกข้อมูลส่วนตัว การศึกษา ผู้ติดต่อฉุกเฉิน 2 คน และยานพาหนะ คัดกรองอาคารตามเพศ (ชาย → เทาทอง 1 / หญิง → เทาทอง 2–4) และเปิดรับเฉพาะช่วงรอบลงทะเบียน
- **บัตรผู้เช่า** — แสดงข้อมูลผู้เช่าพร้อมรูปโปรไฟล์
- **เลือกห้องพัก** — ผังห้องแสดงจำนวนผู้พักจริงของแต่ละห้อง (ห้องละ 4 เตียง)
- **ชำระเงิน & ใบเสร็จ** — ชำระผ่าน QR/โอนธนาคาร (จำลอง) พร้อมออกใบเสร็จ
- **แจ้งซ่อม (Maintenance)** — แจ้งปัญหาห้องพัก ติดตามสถานะ PENDING → IN_PROGRESS → COMPLETED ผู้จัดการได้รับแจ้งเตือนแบบเรียลไทม์
- **มอนิเตอร์ไฟฟ้าแบบเรียลไทม์** — ส่งค่าแรงดัน/กระแส/กำลังไฟฟ้าและหน่วยสะสมผ่าน Socket.io (ข้อมูลจำลอง)
- **แบบประเมิน/รีวิว** — ให้ผู้เช่ารีวิวหลังใช้งานระบบ
- **👑 ระบบผู้จัดการหอพัก (Admin)** — แดชบอร์ดสรุปสถิติ, จัดการผู้เข้าพักและยกเลิกการจอง, อนุมัติสถานะการชำระเงิน, จัดการงานแจ้งซ่อม และจัดการสิทธิ์ผู้ใช้ (USER ↔ ADMIN)

---

### 🔑 การเข้าใช้งานเพื่อทดสอบ

**ปุ่มบัญชีทดลอง (แนะนำสำหรับเว็บทดสอบ)** — ตั้ง `DEMO_LOGIN=true` ใน `.env` ของ backend (หรือ `.env` ที่โฟลเดอร์หลักถ้าใช้ Docker) แล้วหน้า login จะมีปุ่ม **ผู้เช่า** และ **ผู้จัดการหอ (Admin)** กดแล้วเข้าระบบได้ทันที (ระบบสร้างบัญชี `demo-user@demo.local` / `demo-admin@demo.local` ให้เอง โดยใช้รหัสผ่านสุ่ม และบัญชีผู้เช่าทดลองมีโปรไฟล์ตัวอย่างให้ จึงทดสอบเลือกห้อง/ชำระเงิน/แจ้งซ่อมได้ทันที)

> ⚠️ **ห้ามเปิด `DEMO_LOGIN` บนระบบจริง** — ใครก็กดเข้าเป็น Admin ได้

**สร้างบัญชี Admin จริง** — ตั้ง `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` ใน `.env` แล้วรัน:

```bash
cd dorm-registration-backend
npm run seed

# ถ้าใช้ Docker: ตั้ง ADMIN_PASSWORD ใน .env ที่โฟลเดอร์หลัก แล้วรัน
docker exec dorm_backend node prisma/seed.js
```

**ผู้เช่า** — สมัครใหม่ได้ที่หน้า `/apply` (รหัสผ่านอย่างน้อย 8 ตัวอักษร ต้องอยู่ในช่วงเปิดรับลงทะเบียน — ค่าเริ่มต้นเปิดถึง 31 มี.ค. 2027 เปลี่ยนได้ด้วย `REG_CLOSE_AT`)

**กฎการจองห้อง** — ต้องอยู่ในรอบเปิดลงทะเบียน, ต้องกรอกข้อมูลผู้เช่าก่อน, อาคารต้องตรงกับเพศ (ชาย → เทาทอง 1 / หญิง → เทาทอง 2–4), 1 คนมีการจองที่ยังไม่ยกเลิกได้ 1 รายการ, ห้องละ 4 เตียง, ค่าลงทะเบียน 1,999 บาท (`REGISTRATION_FEE`)

---

##  เทคโนโลยีที่ใช้

**Frontend**
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Axios, Chart.js / react-chartjs-2
- Socket.io Client

**Backend**
- Express.js + Socket.io (Real-time)
- Prisma ORM (SQLite)
- JWT (jsonwebtoken) สำหรับ Authentication
- bcryptjs สำหรับเข้ารหัสรหัสผ่าน
- express-rate-limit สำหรับจำกัดการเดารหัสผ่าน

---

## โครงสร้างโปรเจกต์

```
web_dorm/
├── dorm-registration/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/             # Layout, landing (LoginCard), tenant (ฟอร์ม/บัตรผู้เช่า) ฯลฯ
│   │   ├── context/                # AuthContext, RegistrationContext
│   │   ├── hooks/                  # useMaintenanceAlerts, useRegistrationPeriod
│   │   ├── pages/                  # Landing, ApplyPage, Dashboard, RoomSelection, Payment, Receipt, Admin ฯลฯ
│   │   ├── services/               # api.js, socket.js
│   │   └── studentApi.js           # axios instance + จัดการ token
│   ├── Dockerfile                  # build ด้วย Vite แล้วเสิร์ฟด้วย Nginx
│   └── nginx.conf
│
├── dorm-registration-backend/      # Backend (Express + Prisma)
│   ├── index.js                    # Entry point: auth, users, แจ้งซ่อม, Socket.io
│   ├── adminRoutes.js              # /api/admin/* (ห้อง, การจอง, ผู้ใช้)
│   ├── adminDashboardRoutes.js     # /api/admin/* (แดชบอร์ดผู้จัดการ)
│   ├── studentRoutes.js            # จองห้อง / ชำระเงิน / รีวิว
│   ├── profileRoutes.js            # ข้อมูลผู้เช่า
│   ├── registrationPeriod.js       # รอบเปิดรับลงทะเบียน
│   ├── demoLogin.js                # ปุ่มบัญชีทดลอง (DEMO_LOGIN)
│   ├── bookings.js / validation.js # กันจองเกินความจุ, เลขใบเสร็จ, ตรวจข้อมูลบัญชี
│   ├── .env.example
│   └── prisma/schema.prisma        # Models: User, TenantProfile, Room, Booking, MaintenanceRequest, Review ฯลฯ
│
├── docker-compose.yml
├── start.js / start.bat            # รันทั้งระบบบนเครื่อง (ไม่ใช้ Docker)
└── docker-start.bat / docker-stop.bat
```

> รายละเอียด frontend ดูเพิ่มเติมได้ที่ [`dorm-registration/README.md`](./dorm-registration/README.md)

---

### 🚀 วิธีรันทั้งระบบแบบง่ายที่สุด (1 คำสั่ง หรือ 1 คลิก)

อยู่ในโฟลเดอร์หลัก `web_dorm/` เลือกวิธีใดวิธีหนึ่ง:

#### รันผ่าน Docker (ไม่ต้องลง Node.js ในเครื่อง)
- **ดับเบิลคลิก:** [`docker-start.bat`](./docker-start.bat) (ถ้าโหลดเป็น ZIP ให้ **Extract All** ก่อน) — สคริปต์จะ:
  - เปิด Docker Desktop ให้และรอจนพร้อม, ตรวจโหมด Linux containers
  - สร้างไฟล์ `.env` ที่โฟลเดอร์หลักพร้อม `JWT_SECRET` แบบสุ่มให้อัตโนมัติ
  - ถามก่อนหยุดโปรแกรม/container อื่นที่ใช้พอร์ต 5000 หรือ 8080
  - สำรองฐานข้อมูลเดิมไว้ที่โฟลเดอร์ `backups\` (เก็บล่าสุด 5 ชุด) ก่อนอัปเดต
  - รอจน backend พร้อมแล้วเปิดเบราว์เซอร์ และแสดงลิงก์สำหรับเครื่องอื่นในวง LAN
- **Terminal:** ต้องมีไฟล์ `.env` ที่โฟลเดอร์หลักที่ตั้ง `JWT_SECRET` ไว้ก่อน แล้วรัน:
  ```bash
  docker compose up -d --build
  ```
- **หยุดการทำงาน:** ดับเบิลคลิก [`docker-stop.bat`](./docker-stop.bat) หรือรัน `docker compose down`

#### หรือรันบนเครื่อง (ต้องมี Node.js)
- **ดับเบิลคลิก:** [`start.bat`](./start.bat) (ถ้าไม่มี Node.js จะสลับไปใช้ Docker ให้อัตโนมัติ)
- **Terminal:** `npm start` หรือ `node start.js`

> `start.js` จะสร้าง `.env` ของ backend (สุ่ม `JWT_SECRET` ให้) ติดตั้ง dependencies สร้างตารางฐานข้อมูล แล้วรัน Backend (Port 5000) และ Frontend (Port 5173) พร้อมเปิดเบราว์เซอร์ไปที่ [http://localhost:5173](http://localhost:5173)

---

## ติดตั้งแบบทีละขั้น (Manual)

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

คัดลอก `.env.example` เป็น `.env` แล้วตั้งค่า **อย่างน้อย `JWT_SECRET`** (backend จะไม่ยอมเริ่มถ้าไม่ได้ตั้ง หรือสั้นกว่า 16 ตัวอักษร):

```bash
# สร้างค่าสุ่มสำหรับ JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

| ตัวแปร | จำเป็น | คำอธิบาย |
|---|---|---|
| `DATABASE_URL` | ✅ | ที่อยู่ไฟล์ SQLite เช่น `file:./dev.db` |
| `JWT_SECRET` | ✅ | คีย์ลับสำหรับเซ็น token (≥ 16 ตัวอักษร ห้าม commit) |
| `CORS_ORIGIN` | | origin ของ frontend ที่อนุญาต คั่นด้วย `,` (ค่าเริ่มต้น `http://localhost:5173,http://localhost:8080`) |
| `REGISTRATION_FEE` | | ค่าลงทะเบียน (บาท) ค่าเริ่มต้น 1999 |
| `TRUST_PROXY` | | จำนวน reverse proxy ข้างหน้า (Docker ตั้งเป็น 1 ให้แล้ว) — ใช้ IP จริงของผู้ใช้ในการจำกัดความถี่ |
| `DEMO_LOGIN` | | `true` = แสดงปุ่มบัญชีทดลองบนหน้า login (เฉพาะเว็บทดสอบ) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` | | ใช้กับ `npm run seed` เพื่อสร้างบัญชี Admin |
| `REG_TERM` / `REG_OPEN_AT` / `REG_CLOSE_AT` | | ภาคเรียนและช่วงเปิดรับลงทะเบียน (ISO 8601 พร้อมเขตเวลา) |

สร้างตารางในฐานข้อมูล แล้วรันเซิร์ฟเวอร์:

```bash
node prisma/prepare-db.js   # เก็บกวาดข้อมูลเก่าที่ขัดกับ schema (เช่น ข้อมูลของผู้ใช้ที่ถูกลบ)
npx prisma db push          # สร้าง/อัปเดตตารางตาม schema (ทำครั้งแรก และทุกครั้งที่ schema เปลี่ยน)
npm run dev          # โหมดพัฒนา (node --watch)
# หรือ
npm start            # โหมด production
```

### 3. ติดตั้งและรัน Frontend

เปิดเทอร์มินัลใหม่:

```bash
cd dorm-registration
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173` (ถ้า backend ไม่ได้อยู่ที่ `http://localhost:5000` ให้ตั้ง `VITE_API_URL`)

---

##  API Endpoints (Backend)

🔒 = ต้องแนบ token (`Authorization: Bearer <token>`) · 👑 = เฉพาะ Admin

**บัญชีผู้ใช้**

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| POST | `/register` | สมัครสมาชิก (รหัสผ่าน ≥ 8 ตัวอักษร) |
| POST | `/login` | เข้าสู่ระบบด้วย username หรืออีเมล (คืนค่า JWT อายุ 1 วัน) |
| POST | `/logout` | ออกจากระบบ 🔒 |
| POST | `/change-password` | เปลี่ยนรหัสผ่าน — token เก่าใช้ไม่ได้ทันที และคืน token ใหม่ 🔒 |
| GET | `/me` | ข้อมูลผู้ใช้ปัจจุบัน 🔒 |
| GET | `/check-username/:name` | ตรวจสอบว่า username ว่างหรือไม่ |
| GET | `/users` | รายชื่อผู้ใช้ทั้งหมด (แบ่งหน้า) 🔒👑 |
| GET / PUT / DELETE | `/users/:id` | ดู/แก้ไข/ลบผู้ใช้ — ของตัวเอง หรือ Admin (เปลี่ยน role ได้เฉพาะ Admin) 🔒 |
| GET / POST | `/api/demo-login` | สถานะ/เข้าสู่ระบบด้วยบัญชีทดลอง (ใช้ได้เมื่อ `DEMO_LOGIN=true`) |

**ผู้เช่า**

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/registration-period` | รอบเปิดรับลงทะเบียนปัจจุบัน |
| GET / PUT | `/api/profile` | ดู/บันทึกข้อมูลผู้เช่า 🔒 |
| PATCH | `/api/profile/keep` | เก็บข้อมูลไว้ใช้ภาคเรียนถัดไป 🔒 |
| PATCH | `/api/profile/photo` | อัปโหลด/ลบรูปบนบัตรผู้เช่า 🔒 |
| GET | `/api/rooms/availability?dormId=&floor=` | จำนวนผู้พักของแต่ละห้องในชั้น 🔒 |
| POST | `/api/bookings` | จอง/เปลี่ยนห้องพัก 🔒 |
| GET | `/api/bookings/me` | การจองของผู้ใช้ปัจจุบัน 🔒 |
| POST | `/api/bookings/pay` | ชำระเงิน (จำลอง) และออกใบเสร็จ 🔒 |
| POST | `/api/reviews` | ส่งหรือแก้ไขคะแนนและข้อเสนอแนะ 🔒 |
| GET | `/api/reviews/me` | รีวิวของตัวเอง 🔒 |
| GET | `/api/maintenance` | รายการแจ้งซ่อม — ผู้เช่าเห็นเฉพาะของตัวเอง Admin เห็นทั้งหมด 🔒 |
| POST | `/api/maintenance` | แจ้งซ่อมห้องที่ตัวเองจองไว้ (ห้องมาจากการจอง ไม่รับจาก client) 🔒 |
| PATCH | `/api/maintenance/:id/status` | อัปเดตสถานะการแจ้งซ่อม 🔒👑 |

**ผู้จัดการหอพัก (ทุก endpoint ต้องเป็น Admin 🔒👑)**

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/admin/overview` | สรุปสถิติภาพรวมหอพักและความจุเตียง |
| GET | `/api/admin/residents` | รายชื่อผู้เข้าพัก กรองตามหอพัก/ชั้น และค้นหา |
| POST | `/api/admin/bookings/cancel` | ยกเลิกการจองเพื่อคืนเตียงว่าง |
| GET | `/api/admin/payments` | รายการชำระเงินทั้งหมด |
| PATCH | `/api/admin/payments/:id/status` | อัปเดตสถานะการชำระเงิน (PAID/PENDING) |
| GET | `/api/admin/users` | รายชื่อผู้ใช้พร้อมโปรไฟล์และการจอง |
| PATCH | `/api/admin/users/:id/role` | เปลี่ยนสิทธิ์ผู้ใช้ (USER ↔ ADMIN) |
| GET | `/api/admin/reviews` | รีวิวทั้งหมด |
| | `/api/admin/rooms`, `/api/admin/bookings`, `/api/admin/maintenance`, `/api/admin/users/:id` | CRUD ห้อง การจอง งานแจ้งซ่อม และผู้ใช้ |

**Real-time (Socket.io)**
- `power_update` — ข้อมูลการใช้ไฟฟ้าทุก 3 วินาที (ส่งให้ทุกคน, `timestamp` เป็น ISO)
- `maintenance_created` / `maintenance_updated` — ส่งเฉพาะ Admin และผู้แจ้งรายการนั้น (client ต้องแนบ token ใน `auth.token` ตอนเชื่อมต่อ)

---

## 🔒 ความปลอดภัย

- **ห้าม commit** ไฟล์ `.env` และไฟล์ฐานข้อมูล `*.db` (มีข้อมูลส่วนบุคคล — อยู่ใน `.gitignore` แล้ว)
- ทุก request โหลด role ล่าสุดจากฐานข้อมูล ลดสิทธิ์หรือลบบัญชีแล้วมีผลทันที
- จำกัดการเข้าสู่ระบบผิด 10 ครั้ง / 15 นาที ต่อ IP + บัญชี
- การจองห้องทำใน transaction กันจองเกินความจุ และกันผู้ใช้คนเดียวจองซ้อน เมื่อมีหลายคำขอเข้ามาพร้อมกัน
- ลบบัญชี → ลบโปรไฟล์/รีวิว/แจ้งซ่อม และยกเลิกการจอง (คืนเตียง) อัตโนมัติ; ห้องที่มีประวัติการจองลบไม่ได้ (ให้ปิดด้วยสถานะ CLOSED)
- สถานะการจอง/ชำระเงินของผู้เช่าโหลดจาก server ทุกครั้ง (ไม่เก็บข้อมูลส่วนตัวไว้ใน localStorage)
- การชำระเงินยังเป็นแบบจำลอง — ก่อนใช้งานจริงควรเปลี่ยนเป็นแนบสลิปให้ Admin ยืนยัน

---

## 🐳 Docker Deployment

### คำสั่งควบคุมระบบผ่าน Docker

```bash
# สั่ง Build และรันทั้งระบบในเบื้องหลัง (ต้องมี .env ที่โฟลเดอร์หลักที่ตั้ง JWT_SECRET)
docker compose up -d --build

# ดูสถานะคอนเทนเนอร์
docker compose ps

# ดู Logs ของ Backend หรือ Frontend
docker compose logs -f backend
docker compose logs -f frontend

# หยุดการทำงานของทั้งระบบ
docker compose down
```

ตัวแปรที่ใส่ในไฟล์ `.env` ที่โฟลเดอร์หลักได้: `JWT_SECRET` (จำเป็น), `CORS_ORIGIN`, `DEMO_LOGIN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`

### การตั้งค่า Port และ Services

| Service | Container Name | Port (โฮสต์) | รายละเอียด |
|---|---|---|---|
| **Backend** | `dorm_backend` | `http://localhost:5000` (เฉพาะเครื่องนี้) | Node.js 22 + Express + Prisma (SQLite, WAL) + Socket.io — เริ่มทุกครั้งจะเก็บกวาดข้อมูลแล้ว `prisma db push`, มี healthcheck |
| **Frontend** | `dorm_frontend` | `http://<IP เครื่อง>:8080` | Build ด้วย Vite แล้วเสิร์ฟด้วย Nginx — ส่งต่อ `/_api/*` และ Socket.io ไปที่ backend จึงเปิดจากเครื่องอื่นในวง LAN ได้ |

> 💾 ฐานข้อมูล SQLite ของ Docker เก็บใน volume `web_dorm_dbdata` (`/data/dev.db` ในคอนเทนเนอร์) แยกจากฐานข้อมูลที่ใช้ตอนรันแบบไม่ใช้ Docker — ข้อมูลไม่หายเมื่อหยุดคอนเทนเนอร์ (ยกเว้นสั่ง `docker compose down -v`) และชื่อโปรเจกต์ตายตัว (`name: web_dorm`) จึงใช้ข้อมูลชุดเดิมแม้ย้าย/เปลี่ยนชื่อโฟลเดอร์
>
> สำรองข้อมูลเอง: `docker exec dorm_backend node prisma/backup.js /data/backup-latest.db` แล้ว `docker cp dorm_backend:/data/backup-latest.db backups\` (docker-start.bat ทำให้อัตโนมัติก่อนอัปเดต)

---

##  License

ยังไม่ได้ระบุสัญญาอนุญาต (License) — โปรดเพิ่มไฟล์ `LICENSE` หากต้องการเผยแพร่แบบโอเพนซอร์ส
