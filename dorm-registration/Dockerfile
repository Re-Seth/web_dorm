# Stage 1: Build application
FROM node:20-alpine AS builder

WORKDIR /app

# คัดลอก package.json และ package-lock.json
COPY package*.json ./

# เปลี่ยนตรงนี้: ใช้ npm install หรือ npm ci --include=dev เพื่อบังคับติดตั้ง devDependencies (เช่น vite)
RUN npm install

# คัดลอก source code
COPY . .

# Build โปรเจกต์
RUN npm run build

# Stage 2: Serve ด้วย Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]