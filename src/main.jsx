import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = '/api';

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 3-1.7 5.3L5 10l5.3 1.7L12 17l1.7-5.3L19 10l-5.3-1.7L12 3Z"/><path d="m19 16-.8 2.2L16 19l2.2.8L19 22l.8-2.2L22 19l-2.2-.8L19 16Z"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

const coverClass = { sunset: 'cover-sunset', run: 'cover-run', book: 'cover-book', photo: 'cover-photo', default: 'cover-default' };
const coverAssets = {
  'campus-gate-main': '/assets/campus-pixel/campus-gate-main.png',
  'campus-gate-dusk': '/assets/campus-pixel/campus-gate-dusk.png',
  'campus-library': '/assets/campus-pixel/campus-library.png',
  'campus-library-night': '/assets/campus-pixel/campus-library-night.png',
  'campus-train': '/assets/campus-pixel/campus-train.png',
  'campus-train-retro': '/assets/campus-pixel/campus-train-retro.png',
  'campus-lane': '/assets/campus-pixel/campus-lane.png',
  'campus-lane-summer': '/assets/campus-pixel/campus-lane-summer.png',
  'campus-panorama': '/assets/campus-pixel/campus-panorama.png',
  'campus-panorama-evening': '/assets/campus-pixel/campus-panorama-evening.png'
};
const taskCoverMap = { 文艺: 'campus-gate-main', 体育: 'campus-lane-summer', 公益: 'campus-library', 社团: 'campus-train', 讲座: 'campus-library-night' };
const categories = ['全部', '文艺', '体育', '公益', '社团', '讲座'];
const coverOptions = [
  ['campus-gate-main', '校门 · 明亮'], ['campus-gate-dusk', '校门 · 黄昏'], ['campus-library', '图书馆 · 清新'],
  ['campus-library-night', '图书馆 · 夜色'], ['campus-train', '列车 · 青春'], ['campus-train-retro', '列车 · 复古'],
  ['campus-lane', '林荫道 · 青蓝'], ['campus-lane-summer', '林荫道 · 盛夏'], ['campus-panorama', '校园 · 全景'], ['campus-panorama-evening', '校园 · 暮色']
];
const coverStyle = cover => coverAssets[cover] ? { backgroundImage: `url(${coverAssets[cover]})` } : undefined;

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '请求失败');
  return data;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'student', department: '' });
  const [error, setError] = useState('');
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const submit = async e => {
    e.preventDefault(); setError('');
    try { const { user } = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) }); onAuth(user); }
    catch (err) { setError(err.message); }
  };
  return <div className="auth-page">
    <div className="auth-aside">
      <div className="brand brand-light"><span className="brand-mark"><Icon name="spark" size={18}/></span><span>拾光校园</span></div>
      <div className="auth-copy"><p className="overline">CAMPUS ACTIVITY · V1.0</p><h1>把校园里<br/><em>值得参与的事</em><br/>放在一起。</h1><p>从发现一场活动开始，和志趣相投的人见面，让每一次参与都留下痕迹。</p></div>
      <div className="auth-footer"><span>本周已有</span><strong>1,284</strong><span>次活动参与</span></div>
    </div>
    <div className="auth-panel">
      <div className="auth-panel-top"><span>{mode === 'login' ? '欢迎回来' : '加入拾光校园'}</span><button className="text-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? '注册新账号' : '返回登录'}</button></div>
      <div className="auth-form-wrap"><div className="auth-heading"><h2>{mode === 'login' ? '登录你的校园账户' : '创建你的校园账户'}</h2><p>{mode === 'login' ? '继续探索本周的校园活动' : '只需要一点信息，就能开始参与'}</p></div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <><label>你的名字<input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="例如：林晓雨"/></label><label>身份<select value={form.role} onChange={e => update('role', e.target.value)}><option value="student">学生</option><option value="teacher">活动组织教师</option></select></label></>}
          <label>邮箱地址<input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="name@campus.edu.cn"/></label>
          <label>密码<input required type="password" minLength="6" value={form.password} onChange={e => update('password', e.target.value)} placeholder="至少 6 位字符"/></label>
          {mode === 'register' && <label>院系（选填）<input value={form.department} onChange={e => update('department', e.target.value)} placeholder="例如：设计学院"/></label>}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn full" type="submit">{mode === 'login' ? '进入拾光校园' : '完成注册'}<Icon name="arrow" size={17}/></button>
        </form>
        {mode === 'login' && <div className="demo-hint"><span className="hint-dot"/>演示账号：student@campus.local / 123456<br/><span className="hint-dot"/>教师账号：teacher@campus.local / 123456</div>}
      </div>
    </div>
  </div>;
}

function Sidebar({ active, setActive, user, onLogout }) {
  const items = [{ id: 'overview', label: '活动广场', icon: 'grid' }, { id: 'calendar', label: '我的日程', icon: 'calendar' }, ...(user.role === 'teacher' ? [{ id: 'manage', label: '活动管理', icon: 'edit' }] : [{ id: 'joined', label: '我参加的', icon: 'heart' }])];
  return <aside className="sidebar"><div className="brand"><span className="brand-mark"><Icon name="spark" size={18}/></span><span>拾光校园</span></div><div className="sidebar-label">WORKSPACE</div><nav>{items.map(item => <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => setActive(item.id)}><Icon name={item.icon} size={18}/><span>{item.label}</span>{item.id === 'joined' && <span className="nav-count">1</span>}</button>)}</nav><div className="sidebar-bottom"><div className="mini-note"><Icon name="spark" size={16}/><span>今天也去参加<br/>一件有趣的事吧</span></div><button className="profile-chip" onClick={onLogout}><span className="avatar">{user.name.slice(0, 1)}</span><span className="profile-text"><strong>{user.name}</strong><small>{user.role === 'teacher' ? '活动组织教师' : user.department}</small></span><Icon name="logout" size={15}/></button></div></aside>;
}

function TopBar({ user, onCreate }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  return <header className="topbar"><div className="mobile-brand brand"><span className="brand-mark"><Icon name="spark" size={16}/></span><span>拾光校园</span></div><div className="topbar-title"><span>星期三，9月 9日</span><strong>你好，{user.name}</strong></div><div className="topbar-actions"><div className="notification-wrap"><button className={`icon-btn ${notificationsOpen ? 'active' : ''}`} title="校园动态" aria-label="打开校园动态" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(open => !open); setUnread(false); }}><span className={`notification-dot ${unread ? '' : 'is-read'}`}/><Icon name="spark" size={18}/></button>{notificationsOpen && <div className="notification-panel" role="status"><div className="notification-heading"><div><strong>校园动态</strong><span>及时了解活动变化</span></div><button className="notification-close" onClick={() => setNotificationsOpen(false)}><Icon name="close" size={14}/></button></div><div className="notification-item"><span className="notification-badge"><Icon name="calendar" size={14}/></span><div><strong>本周新增活动</strong><p>讲座、社团与运动活动正在持续更新。</p></div></div><div className="notification-item"><span className="notification-badge green"><Icon name="heart" size={14}/></span><div><strong>别忘了查看我的日程</strong><p>已报名的活动会集中显示在你的日程中。</p></div></div><button className="notification-action" onClick={() => { setNotificationsOpen(false); document.querySelector('.activity-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>浏览本周活动 <Icon name="arrow" size={14}/></button></div>}</div>{user.role === 'teacher' && <button className="primary-btn compact" onClick={onCreate}><Icon name="plus" size={16}/>发布活动</button>}<span className="avatar large">{user.name.slice(0, 1)}</span></div></header>;
}

function Hero({ onExplore }) {
  return <section className="hero"><div className="hero-copy"><div className="hero-icon"><Icon name="spark" size={19}/></div><h1>今天，去参加<br/><span>一件有趣的事。</span></h1><p>这里有正在发生的讲座、社团、运动和演出。选一场喜欢的，和校园重新连接。</p><button className="hero-btn" onClick={onExplore}>浏览本周活动<Icon name="arrow" size={16}/></button></div><div className="hero-art"><img src="/assets/campus-pixel/campus-gate-main.png" alt="华东交通大学校门像素风校园图"/><div className="hero-note"><strong>华东交通大学</strong><span>本周活动 · 12 场新鲜发布</span></div></div></section>;
}

function ActivityCard({ activity, user, onJoin, onOpen }) {
  const joined = activity.participants?.includes(user.id);
  const full = activity.participantCount >= activity.capacity;
  return <article className="activity-card"><button className={`card-cover ${coverClass[activity.cover] || coverClass.default} ${coverAssets[activity.cover] ? 'cover-image' : ''}`} style={coverStyle(activity.cover)} onClick={() => onOpen(activity)}><span className="cover-category">{activity.category}</span><span className="cover-date">{formatDate(activity.date)}</span><div className="cover-shape"/></button><div className="card-content"><button className="card-title" onClick={() => onOpen(activity)}>{activity.title}</button><p>{activity.summary}</p><div className="meta-row"><span><Icon name="clock" size={14}/>{activity.time}</span><span><Icon name="pin" size={14}/>{activity.location}</span></div><div className="card-footer"><span className="organizer"><span className="organizer-avatar">{activity.organizer.slice(0, 1)}</span>{activity.organizer}</span><button className={`join-btn ${joined ? 'joined' : ''}`} disabled={joined || full} onClick={() => onJoin(activity)}>{joined ? <><Icon name="check" size={14}/>已报名</> : full ? '已满员' : '报名参加'}</button></div></div></article>;
}

function ActivityModal({ activity, user, onClose, onJoin }) {
  if (!activity) return null;
  const joined = activity.participants?.includes(user.id); const full = activity.participantCount >= activity.capacity;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="activity-modal"><button className="modal-close" onClick={onClose}><Icon name="close" size={18}/></button><div className={`modal-cover ${coverClass[activity.cover] || coverClass.default} ${coverAssets[activity.cover] ? 'cover-image' : ''}`} style={coverStyle(activity.cover)}><span className="cover-category">{activity.category}</span><span className="cover-date">{formatDate(activity.date)}</span><div className="cover-shape"/></div><div className="modal-body"><div className="modal-heading"><div><span className="overline">{activity.organizer}</span><h2>{activity.title}</h2></div><span className="capacity-stamp">{activity.participantCount}/{activity.capacity}<small>已报名</small></span></div><p className="modal-summary">{activity.summary}</p><div className="detail-grid"><div><span>时间</span><strong>{formatDate(activity.date)} · {activity.time}</strong></div><div><span>地点</span><strong>{activity.location}</strong></div></div><button className={`primary-btn full ${joined ? 'success' : ''}`} disabled={joined || full} onClick={() => { onJoin(activity); onClose(); }}>{joined ? <><Icon name="check" size={17}/>你已报名</> : full ? '活动名额已满' : <>报名参加 <Icon name="arrow" size={16}/></>}</button></div></div></div>;
}

function CreateModal({ user, activity, onClose, onCreated }) {
  const [form, setForm] = useState(() => activity ? { title: activity.title, summary: activity.summary, category: activity.category, date: activity.date, time: activity.time, location: activity.location, capacity: activity.capacity, organizer: activity.organizer, cover: activity.cover } : { title: '', summary: '', category: '文艺', date: '2026-10-03', time: '18:30', location: '', capacity: 50, organizer: '学生工作处', cover: taskCoverMap.文艺 });
  const [error, setError] = useState(''); const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async e => { e.preventDefault(); setError(''); try { const payload = { ...form, userId: user.id }; const { activity: saved } = await api(activity ? `/activities/${activity.id}` : '/activities', { method: activity ? 'PUT' : 'POST', body: JSON.stringify(payload) }); onCreated(saved); onClose(); } catch (err) { setError(err.message); } };
  return <div className="modal-backdrop"><div className="create-modal"><div className="modal-titlebar"><div><span className="overline">TEACHER WORKSPACE</span><h2>{activity ? '编辑活动' : '发布一场新活动'}</h2></div><button className="modal-close" onClick={onClose}><Icon name="close" size={18}/></button></div><form className="create-form" onSubmit={submit}><label className="span-2">活动标题<input required value={form.title} onChange={e => update('title', e.target.value)} placeholder="例如：秋日草坪音乐会"/></label><label className="span-2">活动简介<textarea required rows="3" value={form.summary} onChange={e => update('summary', e.target.value)} placeholder="用一句话介绍活动的亮点"/></label><label>活动类型<select value={form.category} onChange={e => { const category = e.target.value; update('category', category); update('cover', taskCoverMap[category] || 'campus-gate-main'); }}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label><label>封面图片<select value={form.cover} onChange={e => update('cover', e.target.value)}>{coverOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>人数上限<input required type="number" min="1" value={form.capacity} onChange={e => update('capacity', e.target.value)}/></label><label>日期<input required type="date" value={form.date} onChange={e => update('date', e.target.value)}/></label><label>时间<input required type="time" value={form.time} onChange={e => update('time', e.target.value)}/></label><label className="span-2">活动地点<input required value={form.location} onChange={e => update('location', e.target.value)} placeholder="例如：中央草坪"/></label>{error && <div className="form-error span-2">{error}</div>}<div className="form-actions span-2"><button type="button" className="secondary-btn" onClick={onClose}>取消</button><button className="primary-btn" type="submit">{activity ? '保存修改' : '发布活动'}<Icon name="arrow" size={16}/></button></div></form></div></div>;
}

function Overview({ user, onCreate, refreshToken = 0 }) {
  const [activities, setActivities] = useState([]); const [query, setQuery] = useState(''); const [category, setCategory] = useState('全部'); const [selected, setSelected] = useState(null); const [toast, setToast] = useState(''); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); const params = new URLSearchParams({ status: 'published' }); if (query) params.set('q', query); if (category !== '全部') params.set('category', category); const { activities } = await api(`/activities?${params}`); setActivities(activities); setLoading(false); };
  useEffect(() => { load().catch(() => setLoading(false)); }, [query, category, refreshToken]);
  const join = async activity => { try { const { activity: updated } = await api(`/activities/${activity.id}/join`, { method: 'POST', body: JSON.stringify({ userId: user.id }) }); setActivities(items => items.map(item => item.id === updated.id ? updated : item)); setSelected(updated); setToast('报名成功，已加入你的日程'); setTimeout(() => setToast(''), 2600); } catch (err) { setToast(err.message); setTimeout(() => setToast(''), 2600); } };
  return <div className="page-content"><Hero onExplore={() => document.querySelector('.activity-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}/><section className="activity-section"><div className="section-heading"><div><span className="overline">DISCOVER</span><h2>本周值得参加</h2></div><button className="link-btn" onClick={() => { setCategory('全部'); setQuery(''); }}>查看全部 <Icon name="arrow" size={15}/></button></div><div className="toolbar"><div className="search-box"><Icon name="search" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索活动、地点或组织方"/></div><div className="category-tabs">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>{loading ? <div className="loading-state">正在加载活动…</div> : activities.length ? <div className="activity-grid">{activities.map(a => <ActivityCard key={a.id} activity={a} user={user} onJoin={join} onOpen={setSelected}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Icon name="search" size={22}/></div><h3>没有找到匹配的活动</h3><p>换个关键词，或者看看全部活动。</p></div>}</section>{selected && <ActivityModal activity={selected} user={user} onClose={() => setSelected(null)} onJoin={join}/>} {toast && <div className="toast"><span><Icon name={toast.includes('成功') ? 'check' : 'spark'} size={15}/></span>{toast}</div>}</div>;
}

function Manage({ user, onCreate, onEdit, refreshToken = 0 }) {
  const [activities, setActivities] = useState([]); useEffect(() => { api('/activities').then(r => setActivities(r.activities)); }, [refreshToken]);
  const publish = async a => { const { activity } = await api(`/activities/${a.id}`, { method: 'PUT', body: JSON.stringify({ userId: user.id, status: 'published' }) }); setActivities(items => items.map(item => item.id === activity.id ? activity : item)); };
  return <div className="page-content inner-page"><div className="inner-header"><div><span className="overline">TEACHER WORKSPACE</span><h1>活动管理</h1><p>发布、查看并维护你负责的校园活动。</p></div><button className="primary-btn" onClick={onCreate}><Icon name="plus" size={17}/>发布活动</button></div><div className="manage-summary"><div><span>全部活动</span><strong>{activities.length}</strong></div><div><span>已发布</span><strong>{activities.filter(a => a.status === 'published').length}</strong></div><div><span>累计报名</span><strong>{activities.reduce((sum, a) => sum + a.participantCount, 0)}</strong></div></div><div className="manage-table"><div className="table-head"><span>活动</span><span>时间地点</span><span>报名进度</span><span>状态</span><span/></div>{activities.map(a => <div className="table-row" key={a.id}><div className="table-title"><span className={`table-cover ${coverClass[a.cover]}`}/><div><strong>{a.title}</strong><small>{a.category} · {a.organizer}</small></div></div><div><strong>{formatDate(a.date)}</strong><small>{a.time} · {a.location}</small></div><div className="progress-wrap"><span>{a.participantCount} / {a.capacity}</span><div className="progress"><i style={{ width: `${Math.min(100, a.participantCount / a.capacity * 100)}%` }}/></div></div><span className={`status ${a.status}`}>{a.status === 'published' ? '已发布' : '草稿'}</span>{a.status === 'draft' ? <button className="table-action" onClick={() => publish(a)}>发布</button> : <button className="table-action" title="编辑活动" onClick={() => onEdit(a)}><Icon name="edit" size={15}/></button>}</div>)}</div></div>;
}

function MyActivities({ user, type }) {
  const [activities, setActivities] = useState([]); const [selected, setSelected] = useState(null);
  useEffect(() => { api(`/users/${user.id}/activities`).then(r => setActivities(r.activities)); }, [user.id]);
  const title = type === 'calendar' ? '我的日程' : '我参加的';
  return <div className="page-content inner-page"><div className="inner-header"><div><span className="overline">YOUR SPACE</span><h1>{title}</h1><p>{type === 'calendar' ? '把已经报名的活动，整理成自己的校园节奏。' : '记录每一次参与，让校园生活有迹可循。'}</p></div></div>{activities.length ? <div className="activity-grid">{activities.map(activity => <ActivityCard key={activity.id} activity={activity} user={user} onJoin={() => {}} onOpen={setSelected}/>)}</div> : <div className="empty-panel"><div className="empty-icon"><Icon name={type === 'calendar' ? 'calendar' : 'heart'} size={24}/></div><h2>{type === 'calendar' ? '你的日程还很轻盈' : '还没有参加活动'}</h2><p>{type === 'calendar' ? '报名活动后，它们会出现在这里。' : '去活动广场挑一场感兴趣的活动吧。'}</p></div>}{selected && <ActivityModal activity={selected} user={user} onClose={() => setSelected(null)} onJoin={() => {}}/>}</div>;
}

function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('campus-user')); } catch { return null; } }); const [active, setActive] = useState('overview'); const [createOpen, setCreateOpen] = useState(false); const [editActivity, setEditActivity] = useState(null); const [refreshToken, setRefreshToken] = useState(0);
  const auth = u => { localStorage.setItem('campus-user', JSON.stringify(u)); setUser(u); }; const logout = () => { localStorage.removeItem('campus-user'); setUser(null); setActive('overview'); };
  if (!user) return <Auth onAuth={auth}/>;
  const closeEditor = () => { setCreateOpen(false); setEditActivity(null); };
  return <div className="app-shell"><Sidebar active={active} setActive={setActive} user={user} onLogout={logout}/><main className="main"><TopBar user={user} onCreate={() => { setEditActivity(null); setCreateOpen(true); }}/>{active === 'overview' && <Overview user={user} onCreate={() => { setEditActivity(null); setCreateOpen(true); }} refreshToken={refreshToken}/>} {active === 'manage' && <Manage user={user} onCreate={() => { setEditActivity(null); setCreateOpen(true); }} onEdit={activity => { setEditActivity(activity); setCreateOpen(true); }} refreshToken={refreshToken}/>} {active === 'calendar' && <MyActivities user={user} type="calendar"/>} {active === 'joined' && <MyActivities user={user} type="joined"/>}</main>{createOpen && <CreateModal user={user} activity={editActivity} onClose={closeEditor} onCreated={() => { setActive('overview'); setRefreshToken(token => token + 1); }}/>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
