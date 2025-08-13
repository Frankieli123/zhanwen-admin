@echo off
chcp 65001 >nul
title 开发服务器启动脚本

echo.
echo 🚀 启动开发服务器...
echo.

:: 定义端口
set BACKEND_PORT=3001
set FRONTEND_PORT=5173

echo 🧹 清理端口占用...

:: 清理后端端口 3001
echo 🔍 检查端口 %BACKEND_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT%') do (
    if not "%%a"=="" (
        echo 💀 杀掉占用端口 %BACKEND_PORT% 的进程 PID: %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: 清理前端端口 5173
echo 🔍 检查端口 %FRONTEND_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT%') do (
    if not "%%a"=="" (
        echo 💀 杀掉占用端口 %FRONTEND_PORT% 的进程 PID: %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: 额外清理：杀掉所有node进程
echo 🧹 清理残留的Node.js进程...
taskkill /IM node.exe /F >nul 2>&1
if %errorlevel%==0 (
    echo ✅ 已清理Node.js进程
) else (
    echo ✅ 没有发现Node.js进程
)

:: 等待端口释放
echo ⏳ 等待端口释放...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 启动服务...

:: 检查目录是否存在
if not exist "backend" (
    echo ❌ backend目录不存在!
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ frontend目录不存在!
    pause
    exit /b 1
)

:: 启动后端服务
echo 🔧 启动后端服务 (端口 %BACKEND_PORT%)...
cd backend
start "后端服务" cmd /k "npm run dev"
cd ..

:: 等待后端启动
echo ⏳ 等待后端服务启动...
timeout /t 8 /nobreak >nul

:: 检查后端服务是否启动成功
echo 🔍 检查后端服务...
curl -s http://localhost:%BACKEND_PORT%/health >nul 2>&1
if %errorlevel%==0 (
    echo ✅ 后端服务启动成功!
) else (
    echo ⚠️ 后端服务可能还在启动中...
)

:: 启动前端服务
echo 🎨 启动前端服务 (端口 %FRONTEND_PORT%)...
cd frontend
start "前端服务" cmd /k "npm run dev"
cd ..

:: 等待前端启动
echo ⏳ 等待前端服务启动...
timeout /t 8 /nobreak >nul

:: 检查前端服务是否启动成功
echo 🔍 检查前端服务...
curl -s http://localhost:%FRONTEND_PORT% >nul 2>&1
if %errorlevel%==0 (
    echo ✅ 前端服务启动成功!
) else (
    echo ⚠️ 前端服务可能还在启动中...
)

echo.
echo 🎉 开发服务器启动完成!
echo.
echo 📋 服务信息:
echo    🔧 后端API: http://localhost:%BACKEND_PORT%
echo    🎨 前端应用: http://localhost:%FRONTEND_PORT%
echo    📚 API文档: http://localhost:%BACKEND_PORT%/api-docs
echo.
echo 🔑 登录信息:
echo    👤 用户名: admin
echo    🔒 密码: admin123456
echo.

:: 自动打开浏览器
echo 🌐 正在打开浏览器...
start http://localhost:%FRONTEND_PORT%

echo 💡 提示:
echo    - 两个服务已在独立窗口中启动
echo    - 关闭对应的命令行窗口可停止服务
echo    - 如需重启，请先关闭所有服务窗口再运行此脚本
echo.

pause
