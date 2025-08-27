@echo off
chcp 65001 >nul
title Development Server Startup Script

echo.
echo Starting development server...
echo.

:: Define ports
set BACKEND_PORT=3001
set FRONTEND_PORT=5173

echo Cleaning port usage...

:: Clean backend port 3001
echo Checking port %BACKEND_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT%') do (
    if not "%%a"=="" (
        echo Killing process PID: %%a on port %BACKEND_PORT%
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: Clean frontend port 5173
echo Checking port %FRONTEND_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT%') do (
    if not "%%a"=="" (
        echo Killing process PID: %%a on port %FRONTEND_PORT%
        taskkill /PID %%a /F >nul 2>&1
    )
)

:: Extra cleanup: kill all node processes
echo Cleaning remaining Node.js processes...
taskkill /IM node.exe /F >nul 2>&1
if %errorlevel%==0 (
    echo Node.js processes cleaned
) else (
    echo No Node.js processes found
)

:: Wait for port release
echo Waiting for port release...
timeout /t 3 /nobreak >nul

echo.
echo Starting services...

:: Check if directories exist
if not exist "backend" (
    echo ERROR: backend directory does not exist!
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: frontend directory does not exist!
    pause
    exit /b 1
)

:: Start backend service
echo Starting backend service (port %BACKEND_PORT%)...
cd backend
start "Backend Service" cmd /k "npm run dev"
cd ..

:: Wait for backend startup
echo Waiting for backend service startup...
timeout /t 8 /nobreak >nul

:: Check if backend service started successfully
echo Checking backend service...
curl -s http://localhost:%BACKEND_PORT%/health >nul 2>&1
if %errorlevel%==0 (
    echo Backend service started successfully!
) else (
    echo Backend service may still be starting...
)

:: Start frontend service
echo Starting frontend service (port %FRONTEND_PORT%)...
cd frontend
start "Frontend Service" cmd /k "npm run dev"
cd ..

:: Wait for frontend startup
echo Waiting for frontend service startup...
timeout /t 8 /nobreak >nul

:: Check if frontend service started successfully
echo Checking frontend service...
curl -s http://localhost:%FRONTEND_PORT% >nul 2>&1
if %errorlevel%==0 (
    echo Frontend service started successfully!
) else (
    echo Frontend service may still be starting...
)

echo.
echo Development server startup complete!
echo.
echo Service Information:
echo    Backend API: http://localhost:%BACKEND_PORT%
echo    Frontend App: http://localhost:%FRONTEND_PORT%
echo    API Docs: http://localhost:%BACKEND_PORT%/api-docs
echo.
echo Login Information:
echo    Username: admin
echo    Password: admin123456
echo.

:: Auto open browser
echo Opening browser...
start http://localhost:%FRONTEND_PORT%

echo Tips:
echo    - Both services are running in separate windows
echo    - Close the corresponding command windows to stop services
echo    - To restart, close all service windows first then run this script
echo.

pause
