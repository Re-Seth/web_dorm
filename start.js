const { spawn, exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'dorm-registration-backend');
const frontendDir = path.join(rootDir, 'dorm-registration');

console.log('\x1b[33m%s\x1b[0m', '================================================');
console.log('\x1b[32m%s\x1b[0m', ' 🚀 กำลังเริ่มระบบ หอพักเทาทอง (Web Dorm)...');
console.log('\x1b[33m%s\x1b[0m', '================================================\n');

// สร้างไฟล์ .env ของ Backend จาก .env.example ถ้ายังไม่มี
const backendEnv = path.join(backendDir, '.env');
if (!fs.existsSync(backendEnv)) {
  fs.copyFileSync(path.join(backendDir, '.env.example'), backendEnv);
  console.log('\x1b[33m[Backend]\x1b[0m สร้างไฟล์ .env จาก .env.example แล้ว');
}

// ติดตั้ง Dependencies อัตโนมัติถ้ายังไม่มี node_modules (เช่น เพิ่ง clone โปรเจกต์มา)
for (const [label, dir] of [['Backend', backendDir], ['Frontend', frontendDir]]) {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    console.log(`\x1b[33m[${label}]\x1b[0m ไม่พบ node_modules กำลังติดตั้ง Dependencies (npm install)...`);
    try {
      execSync('npm install', { cwd: dir, stdio: 'inherit' });
    } catch (err) {
      console.error(`\x1b[31m[${label}]\x1b[0m ติดตั้ง Dependencies ไม่สำเร็จ กรุณารัน npm install ในโฟลเดอร์ ${dir} เอง`);
      process.exit(1);
    }
  }
}

// สั่งรัน Backend
console.log('\x1b[36m[Backend]\x1b[0m กำลังเริ่มต้นเซิร์ฟเวอร์ (Port 5000)...');
const backend = spawn('npm.cmd', ['run', 'dev'], {
  cwd: backendDir,
  shell: true,
  stdio: 'pipe',
  env: process.env
});

backend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line.trim()) console.log(`\x1b[36m[Backend]\x1b[0m ${line.trim()}`);
  });
});

backend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line.trim() && !line.includes('Conda.psm1')) {
      console.error(`\x1b[31m[Backend Error]\x1b[0m ${line.trim()}`);
    }
  });
});

// สั่งรัน Frontend
console.log('\x1b[35m[Frontend]\x1b[0m กำลังเริ่มต้นเซิร์ฟเวอร์ (Port 5173)...');
const frontend = spawn('npm.cmd', ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  stdio: 'pipe',
  env: process.env
});

frontend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line.trim()) console.log(`\x1b[35m[Frontend]\x1b[0m ${line.trim()}`);
  });
});

frontend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line.trim() && !line.includes('Conda.psm1')) {
      console.error(`\x1b[31m[Frontend Error]\x1b[0m ${line.trim()}`);
    }
  });
});

// เปิดเบราว์เซอร์อัตโนมัติหลังจากเริ่มระบบ 3 วินาที
setTimeout(() => {
  console.log('\n\x1b[32m%s\x1b[0m', '✨ เซิร์ฟเวอร์พร้อมใช้งานแล้ว!');
  console.log(' 👉 Frontend: \x1b[34mhttp://localhost:5173\x1b[0m');
  console.log(' 👉 Backend:  \x1b[34mhttp://localhost:5000\x1b[0m');
  console.log('\x1b[90m(กด Ctrl + C เพื่อหยุดการทำงานของทุกระบบ)\x1b[0m\n');

  exec('start http://localhost:5173', (err) => {
    if (err) console.error('ไม่สามารถเปิดเบราว์เซอร์อัตโนมัติได้:', err.message);
  });
}, 3000);

// ฟังก์ชันปิดโปรเซสลูกทั้งหมดเมื่อผู้ใช้กดปิด
function cleanExit() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 กำลังปิดเซิร์ฟเวอร์ทั้งหมด...');
  if (backend && backend.pid) {
    exec(`taskkill /pid ${backend.pid} /T /F`, () => {});
  }
  if (frontend && frontend.pid) {
    exec(`taskkill /pid ${frontend.pid} /T /F`, () => {});
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
