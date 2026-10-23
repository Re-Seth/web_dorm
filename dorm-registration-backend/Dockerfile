FROM node:22-bookworm-slim

# Prisma ต้องใช้ openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# ติดตั้งตาม package-lock.json แบบตายตัว (prisma CLI อยู่ใน devDependencies และต้องใช้ตอนเริ่ม container)
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 5000

# เก็บกวาดข้อมูลเก่าที่ขัดกับ schema → สร้าง/อัปเดตตาราง → เริ่มเซิร์ฟเวอร์
# exec ให้ node เป็น PID 1 รับสัญญาณ SIGTERM ตอน docker stop ได้ทันที
CMD ["sh", "-c", "node prisma/prepare-db.js && npx prisma db push --skip-generate && exec node index.js"]
