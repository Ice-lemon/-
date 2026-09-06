# 拾光校园 · 校园活动管理系统 V1.0

这是“实验一：基于工程意图的软件迭代开发”的可运行项目版本。当前版本围绕一条最小但完整的业务闭环实现：用户注册/登录，学生浏览与报名活动，教师发布并管理活动。

## 快速运行

```bash
pnpm install
pnpm run build
pnpm start
```

浏览器打开 `http://localhost:4173`。

演示账号：

- 学生：`student@campus.local` / `123456`
- 教师：`teacher@campus.local` / `123456`

开发模式可使用 `pnpm dev`，前端运行在 `http://localhost:5173`，API 自动代理到 `4173`。

## V1 工程意图

### 为什么建设

校园活动信息分散在群聊、海报和口头通知中，学生很难持续发现适合自己的活动，组织教师也缺少统一的发布与报名管理入口。V1 先验证“活动被发布、被发现、被报名”这条核心链路。

### 本轮完成

1. 学生与活动组织教师的注册、登录与身份区分。
2. 活动广场：活动列表、关键词搜索、类型筛选和活动详情。
3. 学生报名：名额校验、重复报名校验、报名成功反馈。
4. 教师工作区：发布活动、查看报名进度、将草稿发布。
5. JSON 数据持久化、API 接口和响应式界面。

### 重要约束

- V1 不接入支付、消息推送、复杂审批、第三方统一身份认证。
- 业务数据只使用本地演示数据，不包含真实个人隐私。
- 报名以用户和活动的唯一关系判断重复，人数不得超过容量。
- 先保证桌面端主流程完整，同时支持手机宽度浏览。

### 达标判断

登录后，学生可以在 3 个操作内找到一场活动并完成报名；教师可以在 1 个表单内发布活动，发布后立即出现在学生活动广场；刷新页面后用户和活动仍然保留。

## 设计与实现

```text
src/main.jsx       React 页面、状态和交互
src/styles.css     视觉系统与响应式布局
server/index.js    原生 Node HTTP API 与静态资源服务
data/db.json       首次启动自动生成的演示数据
```

API 采用 `/api/auth/register`、`/api/auth/login`、`/api/activities` 以及 `/api/activities/:id/join` 等简单资源接口。前端只通过 API 修改业务状态，便于下一版本替换为真实数据库。

## 验证记录

- `pnpm run build`：Vite 生产构建通过。
- `GET /api/health`：返回 `ok: true` 与 `version: 1.0.0`。
- 学生主流程：登录 → 搜索/筛选 → 打开详情 → 报名 → “已报名”状态与人数更新。
- 教师主流程：登录 → 发布活动 → 活动出现在列表 → 管理页查看状态与报名进度。
- 响应式检查：桌面三列活动卡片、平板两列、手机单列与移动顶部导航。

## Git 过程

建议在本地按真实开发过程提交，例如：

```bash
git add package.json server src index.html vite.config.js
git commit -m "chore: initialize campus activity manager"
git add README.md
git commit -m "docs: record v1 engineering intent and verification"
```
