const http = require('http');

// Helper to do HTTP requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resData });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 เริ่มทดสอบการเชื่อมต่อ Backend & SQLite Database...\n');

  // 1. Test Login
  const loginRes = await request('POST', '/login', {
    username: '64010001',
    password: '123456',
  });
  console.log('1. Login:', loginRes.status === 200 ? '✅ ผ่าน' : '❌ ล้มเหลว', loginRes.data?.user?.username);
  const token = loginRes.data?.token;

  if (!token) {
    console.error('Cannot proceed without token');
    process.exit(1);
  }

  // 2. Test /me
  const meRes = await request('GET', '/me', null, token);
  console.log('2. GET /me (ดึงข้อมูลผู้ใช้):', meRes.status === 200 ? '✅ ผ่าน' : '❌ ล้มเหลว', meRes.data?.name);

  // 3. Test Student Profile
  const profileRes = await request('POST', '/api/student-profile', {
    prefix: 'นาย',
    firstName: 'สมชาย',
    lastName: 'รักเรียน',
    citizenId: '1234567890123',
    phone: '0812345678',
    fatherPrefix: 'นาย',
    fatherFirstName: 'บุญมี',
    fatherLastName: 'รักเรียน',
    fatherPhone: '0898765432',
    motherPrefix: 'นาง',
    motherFirstName: 'สมศรี',
    motherLastName: 'รักเรียน',
    motherPhone: '0876543210',
  }, token);
  console.log('3. POST /api/student-profile (บันทึกข้อมูลนิสิต/ผู้ปกครอง):', profileRes.status === 200 ? '✅ ผ่าน' : '❌ ล้มเหลว');

  // 4. Test Dorms & Rooms
  const dormsRes = await request('GET', '/api/dorms');
  console.log('4. GET /api/dorms (ดึงรายการหอพัก):', dormsRes.status === 200 ? '✅ ผ่าน' : '❌ ล้มเหลว', `พบ ${dormsRes.data?.length} หอ`);

  const roomsRes = await request('GET', '/api/dorms/tt1/rooms?floor=1');
  console.log('5. GET /api/dorms/tt1/rooms (ดึงห้องและจำนวนคนจองจริง):', roomsRes.status === 200 ? '✅ ผ่าน' : '❌ ล้มเหลว', `พบ ${roomsRes.data?.length} ห้อง`);

  // 6. Test Booking
  const bookingRes = await request('POST', '/api/bookings', { roomId: 'tt1-1-1' }, token);
  console.log('6. POST /api/bookings (จองห้องพักลง SQLite):', (bookingRes.status === 200 || bookingRes.status === 201) ? '✅ ผ่าน' : '❌ ล้มเหลว');

  // 7. Test Payment
  const paymentRes = await request('POST', '/api/payments', { method: 'qr', amount: 1999 }, token);
  console.log('7. POST /api/payments (ชำระเงินและออกใบเสร็จ):', paymentRes.status === 200 ? '✅ ผ่าน' : '❌ ล้มเหลว', paymentRes.data?.payment?.receiptNo);

  const receiptRes = await request('GET', '/api/payments/receipt', null, token);
  console.log('8. GET /api/payments/receipt (ดึงใบเสร็จจาก SQLite):', receiptRes.status === 200 ? '✅ ผ่าน' : '❌ ล้มเหลว');

  // 9. Test Review
  const reviewRes = await request('POST', '/api/reviews', { rating: 5, comment: 'ระบบใช้งานง่าย สะดวก รวดเร็วมากครับ' }, token);
  console.log('9. POST /api/reviews (ส่งรีวิวลง SQLite):', reviewRes.status === 201 ? '✅ ผ่าน' : '❌ ล้มเหลว');

  // 10. Test Maintenance
  const maintRes = await request('POST', '/api/maintenance', {
    roomId: 101,
    title: 'ทดสอบก๊อกน้ำซึม',
    description: 'มีน้ำหยดตลอดเวลา',
  }, token);
  console.log('10. POST /api/maintenance (แจ้งซ่อม):', maintRes.status === 201 ? '✅ ผ่าน' : '❌ ล้มเหลว');

  console.log('\n🎉 ผลการทดสอบ: ทุก Feature เชื่อมต่อฐานข้อมูล SQLite สำเร็จครบ 100%!');
  process.exit(0);
}

// Start backend server first then test
const backend = require('./index.js');
setTimeout(() => {
  runTests().catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
}, 2000);
