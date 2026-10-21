# Stage 1: Build application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# ติดตั้งตาม package-lock.json แบบตายตัว (รวม devDependencies เช่น vite ที่ใช้ build)
RUN npm ci

COPY . .

# URL ของ backend ที่เบราว์เซอร์เรียกใช้ (ฝังตอน build) — Docker ใช้ '/_api' ให้ nginx ด้านล่างส่งต่อให้ backend
ARG VITE_API_URL=/_api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve ด้วย Nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
