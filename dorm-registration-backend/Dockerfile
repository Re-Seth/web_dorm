# ใช้ Node.js 20 Alpine เป็น Base Image
FROM node:20-alpine

# ติดตั้ง openssl สำหรับ Prisma ORM
RUN apk add --no-cache openssl

WORKDIR /app

# คัดลอก package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง Dependencies ทั้งหมด
RUN npm install

# คัดลอก Prisma schema และโครงสร้างไฟล์
COPY prisma ./prisma/

# Generate Prisma Client ให้พร้อมใช้งาน
RUN npx prisma generate

# คัดลอกซอร์สโค้ดทั้งหมด
COPY . .

# กำหนด Port สำหรับ Backend API & Socket.io
EXPOSE 5000

# รัน Migration / Push schema, Seed ข้อมูลเริ่มต้น และเริ่มเซิร์ฟเวอร์
CMD ["sh", "-c", "npx prisma db push --skip-generate && node seed.js && npm start"]
