@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo 正在安装项目依赖...
  call pnpm install
)

if not exist "dist" (
  echo 正在构建前端...
  call pnpm run build
)

start "" "http://localhost:4173"
echo 校园活动系统已启动，浏览器地址为 http://localhost:4173
echo 关闭此窗口会停止服务。
call pnpm start
