@echo off
echo 正在启动开发服务器...
echo.

REM 启动后端服务
echo [1/2] 启动后端服务 (端口 3001)...
cd backend
start "Backend Server" cmd /k "npm run dev"
timeout /t 5 /nobreak > nul

REM 启动前端服务
echo [2/2] 启动前端服务 (端口 5173)...
cd ../frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo 服务器启动完成！
echo 后端: http://localhost:3001
echo 前端: http://localhost:5173
echo.
pause
