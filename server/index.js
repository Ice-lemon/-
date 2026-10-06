import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const dataDir = path.join(root, 'data');
const dbFile = path.join(dataDir, 'db.json');

const seed = {
  users: [
    { id: 'u-student', name: '林晓雨', email: 'student@campus.local', password: '123456', role: 'student', department: '设计学院', active: true },
    { id: 'u-teacher', name: '周老师', email: 'teacher@campus.local', password: '123456', role: 'teacher', department: '学生工作处', active: true },
    { id: 'u-admin', name: '平台管理员', email: 'admin@campus.local', password: '123456', role: 'admin', department: '平台管理', active: true }
  ],
  activities: [
    { id: 'a-1', title: '秋日草坪音乐会', summary: '和朋友一起听现场、看落日，给忙碌的学期留一段轻松的空白。', category: '文艺', date: '2026-09-19', time: '18:30', location: '中央草坪', organizer: '校学生会', ownerId: 'u-teacher', capacity: 300, participants: [], registrations: [], status: 'published', cover: 'campus-gate-main', reviewRequired: false },
    { id: 'a-2', title: '新生夜跑打卡', summary: '沿着环湖路线慢跑 3 公里，认识新同学，也熟悉校园的夜色。', category: '体育', date: '2026-09-16', time: '19:00', location: '北门广场', organizer: '体育部', ownerId: 'u-teacher', capacity: 120, participants: [], registrations: [], status: 'published', cover: 'campus-lane-summer', reviewRequired: false },
    { id: 'a-3', title: '旧书交换市集', summary: '带一本闲置好书来，换走下一段阅读旅程。', category: '公益', date: '2026-09-23', time: '11:30', location: '图书馆南门', organizer: '青年志愿者协会', ownerId: 'u-teacher', capacity: 80, participants: [], registrations: [], status: 'published', cover: 'campus-library', reviewRequired: false },
    { id: 'a-4', title: '校园摄影漫游', summary: '从建筑、光影和路过的人里，找到属于你的校园镜头。', category: '社团', date: '2026-09-28', time: '15:00', location: '艺术楼大厅', organizer: '光影社', ownerId: 'u-teacher', capacity: 30, participants: [], registrations: [], status: 'draft', cover: 'campus-train', reviewRequired: false }
  ]
};

function loadDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2));
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  db.users = db.users.map(user => ({ ...user, active: user.active !== false }));
  db.activities = db.activities.map(activity => {
    const registrations = activity.registrations || (activity.participants || []).map((userId, index) => ({ userId, status: 'confirmed', createdAt: new Date(Date.now() - index * 1000).toISOString() }));
    return { ...activity, ownerId: activity.ownerId || 'u-teacher', registrations, reviewRequired: Boolean(activity.reviewRequired) };
  });
  if (!db.users.some(user => user.role === 'admin')) db.users.push(seed.users[2]);
  return db;
}
function saveDb(db) { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' });
  res.end(JSON.stringify(body));
}
function id(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 8)}`; }
function body(req) {
  return new Promise((resolve, reject) => { let raw = ''; req.on('data', c => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } }); });
}
function safeUser(user) { const { password, ...rest } = user; return rest; }
function findUser(db, userId) { return db.users.find(user => user.id === userId); }
function requireRole(db, userId, role) {
  const user = findUser(db, userId);
  return user && user.active !== false && user.role === role ? user : null;
}
function registrationFor(activity, userId) { return activity.registrations.find(item => item.userId === userId); }
function confirmedRegistrations(activity) { return activity.registrations.filter(item => item.status === 'confirmed'); }
function waitlistRegistrations(activity) { return activity.registrations.filter(item => item.status === 'waitlist').sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
function publicActivity(activity, userId) {
  const confirmed = confirmedRegistrations(activity);
  const waitlist = waitlistRegistrations(activity);
  const own = userId ? registrationFor(activity, userId) : null;
  return { ...activity, participants: confirmed.map(item => item.userId), participantCount: confirmed.length, waitlistCount: waitlist.length, myRegistration: own ? { ...own } : null };
}
function promoteNext(activity) {
  const next = waitlistRegistrations(activity)[0];
  if (next) next.status = 'confirmed';
  return next;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, 'http://localhost');
  const db = loadDb();
  try {
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, version: '1.0.0' });
    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      const input = await body(req);
      if (!input.name || !input.email || !input.password || !input.role) return json(res, 400, { message: '请填写完整信息' });
      if (!['student', 'teacher'].includes(input.role)) return json(res, 400, { message: '身份类型无效' });
      if (db.users.some(u => u.email === input.email)) return json(res, 409, { message: '该邮箱已注册' });
      const user = { id: id('u'), name: input.name, email: input.email, password: input.password, role: input.role, department: input.department || '未填写' };
      db.users.push(user); saveDb(db); return json(res, 201, { user: safeUser(user) });
    }
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const input = await body(req);
      const user = db.users.find(u => u.email === input.email && u.password === input.password);
      if (!user) return json(res, 401, { message: '邮箱或密码不正确' });
      if (user.active === false) return json(res, 403, { message: '账号已停用，请联系系统管理员' });
      return json(res, 200, { user: safeUser(user) });
    }
    if (url.pathname === '/api/activities' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const category = url.searchParams.get('category');
      const userId = url.searchParams.get('userId');
      let activities = db.activities.filter(a => (!status || a.status === status) && a.status !== 'archived' && (!category || a.category === category) && (!q || `${a.title} ${a.summary} ${a.location}`.toLowerCase().includes(q)));
      return json(res, 200, { activities: activities.map(a => publicActivity(a, userId)) });
    }
    if (url.pathname === '/api/activities' && req.method === 'POST') {
      const input = await body(req);
      if (!requireRole(db, input.userId, 'teacher')) return json(res, 403, { message: '只有活动组织教师可以发布活动' });
      if (!input.title || !input.date || !input.time || !input.location || !input.capacity) return json(res, 400, { message: '请补充活动标题、时间、地点和人数' });
      const activity = { id: id('a'), title: input.title, summary: input.summary || '期待在校园里和你见面。', category: input.category || '其他', date: input.date, time: input.time, location: input.location, organizer: input.organizer || '学生工作处', ownerId: input.userId, capacity: Number(input.capacity), participants: [], registrations: [], status: input.status || 'published', cover: input.cover || 'default', reviewRequired: Boolean(input.reviewRequired), eligibility: input.eligibility || '' };
      db.activities.unshift(activity); saveDb(db); return json(res, 201, { activity: { ...activity, participantCount: 0 } });
    }
    const join = url.pathname.match(/^\/api\/activities\/([^/]+)\/join$/);
    if (join && req.method === 'POST') {
      const input = await body(req); const activity = db.activities.find(a => a.id === join[1]);
      if (!activity) return json(res, 404, { message: '活动不存在' });
      if (!requireRole(db, input.userId, 'student')) return json(res, 403, { message: '只有学生可以报名活动' });
      const existing = registrationFor(activity, input.userId);
      if (existing && !['cancelled', 'rejected'].includes(existing.status)) return json(res, 409, { message: existing.status === 'waitlist' ? '你已在候补队列中' : '你已经提交过报名' });
      const registration = existing || { userId: input.userId, createdAt: new Date().toISOString() };
      registration.createdAt = registration.createdAt || new Date().toISOString();
      registration.status = activity.reviewRequired ? 'pending' : (confirmedRegistrations(activity).length < activity.capacity ? 'confirmed' : 'waitlist');
      registration.reviewedAt = null;
      if (!existing) activity.registrations.push(registration);
      saveDb(db); return json(res, 200, { activity: publicActivity(activity, input.userId) });
    }
    const cancel = url.pathname.match(/^\/api\/activities\/([^/]+)\/cancel$/);
    if (cancel && req.method === 'POST') {
      const input = await body(req); const activity = db.activities.find(a => a.id === cancel[1]);
      if (!activity) return json(res, 404, { message: '活动不存在' });
      if (!requireRole(db, input.userId, 'student')) return json(res, 403, { message: '只有学生可以取消自己的报名' });
      const registration = registrationFor(activity, input.userId);
      if (!registration || ['cancelled', 'rejected'].includes(registration.status)) return json(res, 409, { message: '没有可取消的报名' });
      const wasConfirmed = registration.status === 'confirmed'; registration.status = 'cancelled'; registration.cancelledAt = new Date().toISOString();
      if (wasConfirmed) promoteNext(activity);
      saveDb(db); return json(res, 200, { activity: publicActivity(activity, input.userId) });
    }
    const detail = url.pathname.match(/^\/api\/activities\/([^/]+)$/);
    if (detail && req.method === 'PUT') {
      const activity = db.activities.find(a => a.id === detail[1]); if (!activity) return json(res, 404, { message: '活动不存在' });
      const input = await body(req);
      const teacher = requireRole(db, input.userId, 'teacher');
      if (!teacher) return json(res, 403, { message: '只有活动组织教师可以管理活动' });
      if (activity.ownerId && activity.ownerId !== teacher.id) return json(res, 403, { message: '教师只能管理本人负责的活动' });
      delete input.userId;
      Object.assign(activity, input, { capacity: Number(input.capacity || activity.capacity), reviewRequired: Boolean(input.reviewRequired), eligibility: input.eligibility || activity.eligibility || '' }); saveDb(db); return json(res, 200, { activity: publicActivity(activity) });
    }
    const userActivities = url.pathname.match(/^\/api\/users\/([^/]+)\/activities$/);
    if (userActivities && req.method === 'GET') {
      const user = findUser(db, userActivities[1]);
      if (!user) return json(res, 404, { message: '用户不存在' });
      const activities = db.activities.filter(activity => registrationFor(activity, user.id) && !['cancelled', 'rejected'].includes(registrationFor(activity, user.id).status));
      return json(res, 200, { activities: activities.map(activity => publicActivity(activity, user.id)) });
    }
    const registrations = url.pathname.match(/^\/api\/activities\/([^/]+)\/registrations$/);
    if (registrations && req.method === 'GET') {
      const inputUser = url.searchParams.get('userId'); const activity = db.activities.find(a => a.id === registrations[1]);
      if (!activity) return json(res, 404, { message: '活动不存在' });
      const teacher = requireRole(db, inputUser, 'teacher');
      if (!teacher || activity.ownerId !== teacher.id) return json(res, 403, { message: '只能查看本人活动的报名' });
      return json(res, 200, { registrations: activity.registrations.map(item => ({ ...item, user: safeUser(findUser(db, item.userId) || {}) })) });
    }
    const review = url.pathname.match(/^\/api\/activities\/([^/]+)\/registrations\/([^/]+)$/);
    if (review && req.method === 'PUT') {
      const input = await body(req); const activity = db.activities.find(a => a.id === review[1]);
      const teacher = requireRole(db, input.userId, 'teacher');
      if (!activity || !teacher) return json(res, 404, { message: '活动或教师不存在' });
      if (activity.ownerId !== teacher.id) return json(res, 403, { message: '只能处理本人活动的报名' });
      const registration = registrationFor(activity, review[2]);
      if (!registration || registration.status !== 'pending') return json(res, 409, { message: '该报名不在待审核状态' });
      if (!['confirmed', 'rejected'].includes(input.status)) return json(res, 400, { message: '审核状态无效' });
      registration.status = input.status === 'rejected' ? 'rejected' : (confirmedRegistrations(activity).length < activity.capacity ? 'confirmed' : 'waitlist');
      registration.reviewedAt = new Date().toISOString(); saveDb(db); return json(res, 200, { registration, activity: publicActivity(activity) });
    }
    if (url.pathname === '/api/admin/users' && req.method === 'GET') {
      const admin = requireRole(db, url.searchParams.get('userId'), 'admin'); if (!admin) return json(res, 403, { message: '只有系统管理员可以查看平台用户' });
      return json(res, 200, { users: db.users.map(safeUser) });
    }
    const adminUser = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (adminUser && req.method === 'PUT') {
      const input = await body(req); const admin = requireRole(db, input.userId, 'admin'); const user = findUser(db, adminUser[1]);
      if (!admin) return json(res, 403, { message: '只有系统管理员可以修改账号状态' });
      if (!user) return json(res, 404, { message: '用户不存在' });
      if (user.id === admin.id) return json(res, 400, { message: '不能停用当前管理员账号' });
      user.active = input.active !== false; saveDb(db); return json(res, 200, { user: safeUser(user) });
    }
    if (url.pathname === '/api/admin/activities' && req.method === 'GET') {
      const admin = requireRole(db, url.searchParams.get('userId'), 'admin'); if (!admin) return json(res, 403, { message: '只有系统管理员可以查看平台活动' });
      return json(res, 200, { activities: db.activities.map(activity => publicActivity(activity)) });
    }
    const adminActivity = url.pathname.match(/^\/api\/admin\/activities\/([^/]+)$/);
    if (adminActivity && req.method === 'PUT') {
      const input = await body(req); const admin = requireRole(db, input.userId, 'admin'); const activity = db.activities.find(a => a.id === adminActivity[1]);
      if (!admin) return json(res, 403, { message: '只有系统管理员可以处理活动状态' });
      if (!activity) return json(res, 404, { message: '活动不存在' });
      if (!['published', 'archived'].includes(input.status)) return json(res, 400, { message: '活动状态无效' });
      activity.status = input.status; saveDb(db); return json(res, 200, { activity: publicActivity(activity) });
    }
    if (detail && req.method === 'GET') {
      const activity = db.activities.find(a => a.id === detail[1]); return activity ? json(res, 200, { activity: publicActivity(activity, url.searchParams.get('userId')) }) : json(res, 404, { message: '活动不存在' });
    }
    if (req.method === 'GET') {
      const filePath = url.pathname === '/' ? path.join(dist, 'index.html') : path.join(dist, url.pathname);
      if (filePath.startsWith(dist) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) { const ext = path.extname(filePath); const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }; res.writeHead(200, { 'Content-Type': `${types[ext] || 'application/octet-stream'}; charset=utf-8` }); return res.end(fs.readFileSync(filePath)); }
    }
    return json(res, 404, { message: 'Not found' });
  } catch (error) { console.error(error); return json(res, 500, { message: '服务器暂时不可用' }); }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, () => console.log(`Campus Activity Manager running at http://localhost:${port}`));
