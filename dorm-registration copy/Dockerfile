# ใช้ Node.js 20 Alpine เป็น Base Image
FROM node:20-alpine

WORKDIR /app

# คัดลอก package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง Dependencies ทั้งหมด
RUN npm install

# คัดลอกซอร์สโค้ดทั้งหมด
COPY . .

# Build โปรเจกต์สำหรับการใช้งาน
RUN npm run build

# กำหนด Port สำหรับ Frontend
EXPOSE 5173

# รัน Frontend ด้วย Vite preview ผ่าน Node.js
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]