// ==========================================
// แชทนิสิต ↔ เจ้าหน้าที่
// นิสิตเริ่มจากแชทบอท (FAQ ฝั่งหน้าเว็บ) → กด "ติดต่อเจ้าหน้าที่" → ระบบสรุปเรื่องส่งให้เจ้าหน้าที่ แล้วคุยต่อในห้องแชทเดียวกัน
// Real-time: ส่ง event ให้ห้อง socket 'admins' และ 'user:<id>' (ตั้งใน index.js)
// ==========================================
const rateLimit = require('express-rate-limit');
const { clip, isText } = require('./validation');

const MESSAGE_MAX = 1000;
const THREAD_STATUSES = ['OPEN', 'CLOSED'];
const PAYMENT_LABEL = { PAID: 'ชำระแล้ว', UNPAID: 'ยังไม่ชำระ' };

const perUser = (windowMinutes, limit, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message },
  keyGenerator: (req) => `user:${req.user?.id}`,
});
const messageLimiter = perUser(1, 20, 'ส่งข้อความบ่อยเกินไป กรุณารอสักครู่');
const handoffLimiter = perUser(10, 5, 'ส่งเรื่องถึงเจ้าหน้าที่บ่อยเกินไป กรุณารอสักครู่');

const toMessage = (m) => ({
  id: m.id,
  threadId: m.threadId,
  sender: m.sender,
  body: m.body,
  createdAt: m.createdAt,
  authorName: m.sender === 'ADMIN' ? m.author?.name || m.author?.username || 'เจ้าหน้าที่' : undefined,
});
const MESSAGE_INCLUDE = { author: { select: { name: true, username: true } } };

module.exports = function registerChatRoutes({ app, prisma, io, authenticateToken, requireAdmin, serverError }) {
  const guard = [authenticateToken, requireAdmin];

  const emitToThread = (thread, event, payload) =>
    io.to('admins').to(`user:${thread.userId}`).emit(event, payload);

  // ข้อมูลนิสิตสำหรับสรุปเรื่อง / แสดงข้างห้องแชทฝั่งเจ้าหน้าที่
  async function studentInfo(userId) {
    const [user, profile, booking] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, name: true, email: true } }),
      prisma.tenantProfile.findUnique({ where: { userId }, select: { prefix: true, firstName: true, lastName: true, mobile: true, lineId: true } }),
      prisma.booking.findFirst({
        where: { userId, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        include: { room: { select: { code: true } } },
      }),
    ]);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: profile ? `${profile.prefix}${profile.firstName} ${profile.lastName}` : user.name || user.username,
      mobile: profile?.mobile || null,
      lineId: profile?.lineId || null,
      room: booking?.room?.code || null,
      paymentStatus: booking?.paymentStatus || null,
    };
  }

  function buildSummary(student, topics, question) {
    const lines = ['📋 สรุปเรื่องจากแชทบอท'];
    lines.push(`• สิ่งที่อยากสอบถาม: ${question}`);
    if (topics.length) lines.push(`• หัวข้อที่ดูในแชทบอทแล้ว: ${topics.join(', ')}`);
    lines.push(`• ผู้ติดต่อ: ${student.name} (${student.username})`);
    lines.push(student.room
      ? `• ห้องพัก: ${student.room} (${PAYMENT_LABEL[student.paymentStatus] || student.paymentStatus})`
      : '• ห้องพัก: ยังไม่ได้จองห้อง');
    if (student.mobile) lines.push(`• เบอร์ติดต่อ: ${student.mobile}`);
    return lines.join('\n');
  }

  // เพิ่มข้อความลงห้องแชท + อัปเดตเวลา แล้วแจ้งทั้งสองฝั่งแบบ Real-time
  async function addMessages(thread, entries, threadData = {}) {
    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const e of entries) {
        rows.push(await tx.chatMessage.create({ data: { threadId: thread.id, ...e }, include: MESSAGE_INCLUDE }));
      }
      await tx.chatThread.update({ where: { id: thread.id }, data: { lastMessageAt: now, ...threadData } });
      return rows;
    });
    const status = threadData.status || thread.status;
    for (const m of created) {
      emitToThread(thread, 'chat_message', { threadId: thread.id, userId: thread.userId, status, message: toMessage(m) });
    }
    return created.map(toMessage);
  }

  const textOf = (value) => (isText(value) ? clip(value, MESSAGE_MAX) : '');

  // ---------- ฝั่งนิสิต ----------

  // GET /api/chat/me — ห้องแชทของตัวเอง (ยังไม่เคยติดต่อ = thread null)
  app.get('/api/chat/me', authenticateToken, async (req, res) => {
    try {
      const thread = await prisma.chatThread.findUnique({
        where: { userId: req.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 300, include: MESSAGE_INCLUDE } },
      });
      if (!thread) return res.json({ thread: null, messages: [], unread: 0 });
      const unread = thread.messages.filter((m) => m.sender === 'ADMIN' && (!thread.userReadAt || m.createdAt > thread.userReadAt)).length;
      const { messages, ...rest } = thread;
      res.json({ thread: rest, messages: messages.map(toMessage), unread });
    } catch (err) {
      serverError(res, err, 'โหลดแชทไม่สำเร็จ');
    }
  });

  // POST /api/chat/me/handoff — ส่งเรื่องจากแชทบอทถึงเจ้าหน้าที่ { question, topics[] }
  app.post('/api/chat/me/handoff', authenticateToken, handoffLimiter, async (req, res) => {
    try {
      const question = textOf(req.body?.question);
      if (!question) return res.status(400).json({ message: 'กรุณาพิมพ์เรื่องที่ต้องการสอบถาม' });
      const topics = (Array.isArray(req.body?.topics) ? req.body.topics : [])
        .filter(isText).map((t) => clip(t, 60)).filter(Boolean).slice(0, 10);

      const student = await studentInfo(req.user.id);
      if (!student) return res.status(401).json({ message: 'Invalid or expired token' });
      const summary = buildSummary(student, [...new Set(topics)], question);

      const thread = await prisma.chatThread.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id },
        update: {},
      });
      const messages = await addMessages(
        thread,
        [{ sender: 'SYSTEM', body: summary }, { sender: 'USER', senderId: req.user.id, body: question }],
        { summary, status: 'OPEN', userReadAt: new Date() },
      );
      res.status(201).json({ threadId: thread.id, messages });
    } catch (err) {
      serverError(res, err, 'ส่งเรื่องถึงเจ้าหน้าที่ไม่สำเร็จ');
    }
  });

  // POST /api/chat/me/messages — พิมพ์คุยกับเจ้าหน้าที่ต่อ { body }
  app.post('/api/chat/me/messages', authenticateToken, messageLimiter, async (req, res) => {
    try {
      const body = textOf(req.body?.body);
      if (!body) return res.status(400).json({ message: 'กรุณาพิมพ์ข้อความ' });
      const thread = await prisma.chatThread.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id },
        update: {},
      });
      const [message] = await addMessages(thread, [{ sender: 'USER', senderId: req.user.id, body }], { status: 'OPEN', userReadAt: new Date() });
      res.status(201).json(message);
    } catch (err) {
      serverError(res, err, 'ส่งข้อความไม่สำเร็จ');
    }
  });

  // POST /api/chat/me/read — อ่านข้อความเจ้าหน้าที่แล้ว
  app.post('/api/chat/me/read', authenticateToken, async (req, res) => {
    try {
      await prisma.chatThread.updateMany({ where: { userId: req.user.id }, data: { userReadAt: new Date() } });
      res.json({ ok: true });
    } catch (err) {
      serverError(res, err);
    }
  });

  // ---------- ฝั่งเจ้าหน้าที่ ----------

  // GET /api/admin/chats — รายการห้องแชท ล่าสุดก่อน พร้อมจำนวนข้อความที่ยังไม่อ่าน
  app.get('/api/admin/chats', ...guard, async (req, res) => {
    try {
      const threads = await prisma.chatThread.findMany({
        orderBy: { lastMessageAt: 'desc' },
        take: 200,
        include: {
          user: { select: { id: true, username: true, name: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      const unreadCounts = await Promise.all(threads.map((t) => prisma.chatMessage.count({
        where: { threadId: t.id, sender: 'USER', ...(t.adminReadAt ? { createdAt: { gt: t.adminReadAt } } : {}) },
      })));
      res.json(threads.map(({ messages, ...t }, i) => ({
        ...t,
        lastMessage: messages[0] ? toMessage(messages[0]) : null,
        unread: unreadCounts[i],
      })));
    } catch (err) {
      serverError(res, err, 'โหลดรายการแชทไม่สำเร็จ');
    }
  });

  async function findThread(req, res) {
    const thread = await prisma.chatThread.findUnique({ where: { id: Number(req.params.id) } });
    if (!thread) res.status(404).json({ message: 'ไม่พบห้องแชท' });
    return thread;
  }

  // GET /api/admin/chats/:id — ข้อความทั้งหมด + ข้อมูลนิสิต
  app.get('/api/admin/chats/:id', ...guard, async (req, res) => {
    try {
      const thread = await findThread(req, res);
      if (!thread) return;
      const [messages, student] = await Promise.all([
        prisma.chatMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: 'asc' }, take: 500, include: MESSAGE_INCLUDE }),
        studentInfo(thread.userId),
      ]);
      res.json({ thread, student, messages: messages.map(toMessage) });
    } catch (err) {
      serverError(res, err, 'โหลดแชทไม่สำเร็จ');
    }
  });

  // POST /api/admin/chats/:id/messages — เจ้าหน้าที่ตอบ { body }
  app.post('/api/admin/chats/:id/messages', ...guard, async (req, res) => {
    try {
      const body = textOf(req.body?.body);
      if (!body) return res.status(400).json({ message: 'กรุณาพิมพ์ข้อความ' });
      const thread = await findThread(req, res);
      if (!thread) return;
      const [message] = await addMessages(thread, [{ sender: 'ADMIN', senderId: req.user.id, body }], { adminReadAt: new Date() });
      res.status(201).json(message);
    } catch (err) {
      serverError(res, err, 'ส่งข้อความไม่สำเร็จ');
    }
  });

  // POST /api/admin/chats/:id/read — เจ้าหน้าที่เปิดอ่านแล้ว
  app.post('/api/admin/chats/:id/read', ...guard, async (req, res) => {
    try {
      const thread = await findThread(req, res);
      if (!thread) return;
      await prisma.chatThread.update({ where: { id: thread.id }, data: { adminReadAt: new Date() } });
      io.to('admins').emit('chat_updated', { threadId: thread.id });
      res.json({ ok: true });
    } catch (err) {
      serverError(res, err);
    }
  });

  // PATCH /api/admin/chats/:id/status — ปิดเรื่อง / เปิดเรื่องอีกครั้ง { status }
  app.patch('/api/admin/chats/:id/status', ...guard, async (req, res) => {
    try {
      const { status } = req.body || {};
      if (!THREAD_STATUSES.includes(status)) return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
      const thread = await findThread(req, res);
      if (!thread) return;
      const updated = await prisma.chatThread.update({ where: { id: thread.id }, data: { status } });
      emitToThread(updated, 'chat_updated', { threadId: updated.id, status });
      res.json(updated);
    } catch (err) {
      serverError(res, err);
    }
  });
};
