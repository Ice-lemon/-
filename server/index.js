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
    { id: 'u-student', name: '林晓雨', email: 'student@campus.local', password: '123456', role: 'student', department: '设计学院' },
    { id: 'u-teacher', name: '周老师', email: 'teacher@campus.local', password: '123456', role: 'teacher', department: '学生工作处' }
  ],
  activities: [
    { id: 'a-1', title: '秋日草坪音乐会', summary: '和朋友一起听现场、看落日，给忙碌的学期留一段轻松的空白。', category: '文艺', date: '2026-09-19', time: '18:30', location: '中央草坪', organizer: '校学生会', capacity: 300, participants: ['u-student'], status: 'published', cover: 'sunset' },
    { id: 'a-2', title: '新生夜跑打卡', summary: '沿着环湖路线慢跑 3 公里，认识新同学，也熟悉校园的夜色。', category: '体育', date: '2026-09-16', time: '19:00', location: '北门广场', organizer: '体育部', capacity: 120, participants: [], status: 'published', cover: 'run' },
    { id: 'a-3', title: '旧书交换市集', summary: '带一本闲置好书来，换走下一段阅读旅程。', category: '公益', date: '2026-09-23', time: '11:30', location: '图书馆南门', organizer: '青年志愿者协会', capacity: 80, participants: [], status: 'published', cover: 'book' },
    { id: 'a-4', title: '校园摄影漫游', summary: '从建筑、光影和路过的人里，找到属于你的校园镜头。', category: '社团', date: '2026-09-28', time: '15:00', location: '艺术楼大厅', organizer: '光影社', capacity: 30, participants: [], status: 'draft', cover: 'photo' }
  ]
};

function loadDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2));
  return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
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
  return user && user.role === role ? user : null;
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
      return json(res, 200, { user: safeUser(user) });
    }
    if (url.pathname === '/api/activities' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const category = url.searchParams.get('category');
      let activities = db.activities.filter(a => (!status || a.status === status) && (!category || a.category === category) && (!q || `${a.title} ${a.summary} ${a.location}`.toLowerCase().includes(q)));
      return json(res, 200, { activities: activities.map(a => ({ ...a, participantCount: a.participants.length })) });
    }
    if (url.pathname === '/api/activities' && req.method === 'POST') {
      const input = await body(req);
      if (!requireRole(db, input.userId, 'teacher')) return json(res, 403, { message: '只有活动组织教师可以发布活动' });
      if (!input.title || !input.date || !input.time || !input.location || !input.capacity) return json(res, 400, { message: '请补充活动标题、时间、地点和人数' });
      const activity = { id: id('a'), title: input.title, summary: input.summary || '期待在校园里和你见面。', category: input.category || '其他', date: input.date, time: input.time, location: input.location, organizer: input.organizer || '学生工作处', capacity: Number(input.capacity), participants: [], status: input.status || 'published', cover: input.cover || 'default' };
      db.activities.unshift(activity); saveDb(db); return json(res, 201, { activity: { ...activity, participantCount: 0 } });
    }
    const join = url.pathname.match(/^\/api\/activities\/([^/]+)\/join$/);
    if (join && req.method === 'POST') {
      const input = await body(req); const activity = db.activities.find(a => a.id === join[1]);
      if (!activity) return json(res, 404, { message: '活动不存在' });
      if (!requireRole(db, input.userId, 'student')) return json(res, 403, { message: '只有学生可以报名活动' });
      if (activity.participants.includes(input.userId)) return json(res, 409, { message: '你已经报名过了' });
      if (activity.participants.length >= activity.capacity) return json(res, 409, { message: '活动名额已满' });
      activity.participants.push(input.userId); saveDb(db); return json(res, 200, { activity: { ...activity, participantCount: activity.participants.length } });
    }
    const detail = url.pathname.match(/^\/api\/activities\/([^/]+)$/);
    if (detail && req.method === 'PUT') {
      const activity = db.activities.find(a => a.id === detail[1]); if (!activity) return json(res, 404, { message: '活动不存在' });
      const input = await body(req);
      if (!requireRole(db, input.userId, 'teacher')) return json(res, 403, { message: '只有活动组织教师可以管理活动' });
      delete input.userId;
      Object.assign(activity, input, { capacity: Number(input.capacity || activity.capacity) }); saveDb(db); return json(res, 200, { activity: { ...activity, participantCount: activity.participants.length } });
    }
    const userActivities = url.pathname.match(/^\/api\/users\/([^/]+)\/activities$/);
    if (userActivities && req.method === 'GET') {
      const user = findUser(db, userActivities[1]);
      if (!user) return json(res, 404, { message: '用户不存在' });
      const activities = db.activities.filter(activity => activity.participants.includes(user.id));
      return json(res, 200, { activities: activities.map(activity => ({ ...activity, participantCount: activity.participants.length })) });
    }
    if (detail && req.method === 'GET') {
      const activity = db.activities.find(a => a.id === detail[1]); return activity ? json(res, 200, { activity: { ...activity, participantCount: activity.participants.length } }) : json(res, 404, { message: '活动不存在' });
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
