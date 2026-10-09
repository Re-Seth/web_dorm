FROM node:20-bookworm-slim

# Prisma ต้องใช้ openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# ต้องติดตั้ง devDependencies ด้วย เพราะ `prisma` CLI อยู่ใน devDependencies
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 5000

# สร้าง/อัปเดตตารางให้ตรงกับ schema แล้วค่อยสตาร์ทเซิร์ฟเวอร์
CMD ["sh", "-c", "npx prisma db push && node index.js"]