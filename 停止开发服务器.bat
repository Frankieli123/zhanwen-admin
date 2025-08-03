@echo off
chcp 65001 >nul
title 停止开发服务器

echo.
echo 🛑 停止开发服务器...
echo.

:: 定义端口
set BACKEND_PORT=3001
set FRONTEND_PORT=5173

echo 🔍 查找并停止占用端口的进程...

:: 停止后端端口 3001
echo 🔍 检查端口 %BACKEND_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT%') do (
    if not "%%a"=="" (
        echo 💀 停止占用端口 %BACKEND_PORT% 的进程 PID: %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: 停止前端端口 5173
echo 🔍 检查端口 %FRONTEND_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT%') do (
    if not "%%a"=="" (
        echo 💀 停止占用端口 %FRONTEND_PORT% 的进程 PID: %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: 停止所有node进程
echo 🧹 停止所有Node.js进程...
taskkill /IM node.exe /F >nul 2>&1
if %errorlevel%==0 (
    echo ✅ 已停止Node.js进程
) else (
    echo ✅ 没有发现Node.js进程
)

:: 停止nodemon进程
echo 🧹 停止nodemon进程...
taskkill /IM nodemon.exe /F >nul 2>&1

:: 等待进程完全停止
echo ⏳ 等待进程完全停止...
timeout /t 2 /nobreak >nul

:: 验证端口是否已释放
echo 🔍 验证端口状态...
netstat -ano | findstr :%BACKEND_PORT% >nul 2>&1
if %errorlevel%==0 (
    echo ⚠️ 端口 %BACKEND_PORT% 仍被占用
) else (
    echo ✅ 端口 %BACKEND_PORT% 已释放
)

netstat -ano | findstr :%FRONTEND_PORT% >nul 2>&1
if %errorlevel%==0 (
    echo ⚠️ 端口 %FRONTEND_PORT% 仍被占用
) else (
    echo ✅ 端口 %FRONTEND_PORT% 已释放
)

echo.
echo 🎉 开发服务器已停止!
echo.

pause
