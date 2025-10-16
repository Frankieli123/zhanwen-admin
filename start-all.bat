@echo off
setlocal EnableDelayedExpansion
title Start Development Environment

:: Always run from the script's directory (project root)
pushd "%~dp0"

echo.
echo Starting Full-Stack Development Environment...
echo.

:: Define ports
set BACKEND_PORT=3001
set FRONTEND_PORT=3006
:: Set to 1 to run frontend inline (current window), 0 to open a separate window
set FRONTEND_INLINE=1
:: Silence Dart Sass legacy JS API deprecation warnings in dev
set SASS_SILENCE_DEPRECATIONS=legacy-js-api
:: Pass Vite server/env defaults
set VITE_PORT=%FRONTEND_PORT%
set VITE_API_PROXY_URL=http://localhost:%BACKEND_PORT%

echo Cleaning port usage...

:: Clean backend port 3001
echo Checking port %BACKEND_PORT%...
netstat -ano | findstr :%BACKEND_PORT% > temp_port.txt
if exist temp_port.txt (
    for /f "tokens=5" %%a in (temp_port.txt) do (
        if not "%%a"=="0" (
            echo Killing process PID: %%a on port %BACKEND_PORT%
            taskkill /PID %%a /F >nul 2>&1
        )
    )
    del temp_port.txt
)

:: Clean frontend port 3006
echo Checking port %FRONTEND_PORT%...
netstat -ano | findstr :%FRONTEND_PORT% > temp_port2.txt
if exist temp_port2.txt (
    for /f "tokens=5" %%a in (temp_port2.txt) do (
        if not "%%a"=="0" (
            echo Killing process PID: %%a on port %FRONTEND_PORT%
            taskkill /PID %%a /F >nul 2>&1
        )
    )
    del temp_port2.txt
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
    popd
    exit /b 1
)

if not exist "zhanwen-admin-vue" (
    echo ERROR: zhanwen-admin-vue directory does not exist!
    pause
    popd
    exit /b 1
)

:: Ensure backend dependencies are installed
echo Checking backend dependencies...
pushd "backend"
if exist "node_modules\.bin\nodemon*" (
    echo Backend dependencies detected.
) else (
    echo Installing backend dependencies...
    npm ci
    if %errorlevel% neq 0 (
        echo npm ci failed, trying npm install...
        npm install
    )
)
popd

:: Detect package manager for frontend
where pnpm >nul 2>&1
if %errorlevel%==0 (
    set "FRONTEND_PKG_MGR=pnpm"
) else (
    set "FRONTEND_PKG_MGR=npm"
)
echo Using %FRONTEND_PKG_MGR% for frontend package management.

:: Start backend service
if "%FRONTEND_INLINE%"=="1" (
    echo Inline mode enabled: backend will be started together with frontend in this window.
) else (
    echo Starting backend service on port %BACKEND_PORT%...
    cd backend
    start "Backend Service" cmd /k "npm run dev"
    cd ..
)

:: Wait for backend startup (skip in inline mode)
if not "%FRONTEND_INLINE%"=="1" (
    echo Waiting for backend service startup...
    timeout /t 8 /nobreak >nul
    echo Checking backend service...
    curl -s http://localhost:%BACKEND_PORT%/health >nul 2>&1
    if %errorlevel%==0 (
        echo Backend service started successfully!
    ) else (
        echo Backend service may still be starting...
    )
) else (
    echo Inline mode: skip pre-wait for backend and start both services together.
)

:: Start Vue frontend service
echo Starting Vue frontend service on port %FRONTEND_PORT%...
pushd "zhanwen-admin-vue"
:: Ensure frontend dependencies are installed (vite binary exists)
set "_FRONTEND_DEPS_OK="
if exist node_modules\.bin\vite.cmd (
    echo Frontend dependencies detected.
    set "_FRONTEND_DEPS_OK=1"
)
if not defined _FRONTEND_DEPS_OK (
    echo Installing frontend dependencies...
    if "%FRONTEND_PKG_MGR%"=="pnpm" (
        pnpm install
        if errorlevel 1 (
            echo pnpm install failed, trying npm ci...
            npm ci
            if errorlevel 1 (
                echo npm ci failed, trying npm install...
                npm install
            )
        )
    ) else (
        npm ci
        if errorlevel 1 (
            echo npm ci failed, trying npm install...
            npm install
        )
    )
)
popd
:: Run frontend dev server with explicit port
:: Simple mode: skip pnpm approve-builds/rebuild to avoid CMD parser issues
echo Skipping pnpm approve-builds/rebuild step.

if "%FRONTEND_INLINE%"=="1" goto :INLINE_MODE
rem Non-inline branch
if "%FRONTEND_PKG_MGR%"=="pnpm" (
    start "Vue Frontend Service" cmd /k "pnpm run dev --port %FRONTEND_PORT%"
) else (
    start "Vue Frontend Service" cmd /k "npm run dev -- --port %FRONTEND_PORT%"
)
cd ..
goto :CONTINUE

:INLINE_MODE
echo Running backend and frontend inline in this window on port %FRONTEND_PORT% ...
set "CONCURRENTLY_BIN=%~dp0node_modules\.bin\concurrently.cmd"
if exist "%CONCURRENTLY_BIN%" goto :HAVE_CONCURRENTLY
echo concurrently not found. Installing at project root...
if exist "%~dp0package-lock.json" (
  pushd "%~dp0"
  npm ci
  if errorlevel 1 npm install
  popd
) else (
  pushd "%~dp0"
  npm install
  popd
)
if exist "%CONCURRENTLY_BIN%" goto :HAVE_CONCURRENTLY
echo Failed to install concurrently. Falling back to builtin inline mode.
echo Starting backend in background...
start "" /B /D "%~dp0backend" cmd /c npm run dev
echo Waiting for backend health endpoint...
set "_TRIES=0"
:wait_backend_health2
set /a _TRIES+=1
curl -s http://localhost:%BACKEND_PORT%/health >nul 2>&1
if not errorlevel 1 goto :backend_ok2
if %_TRIES% lss 20 (
  timeout /t 1 >nul
  goto :wait_backend_health2
)
echo Warning: backend health check still failing, continue to start frontend.
:backend_ok2
cd /d "%~dp0zhanwen-admin-vue"
if "%FRONTEND_PKG_MGR%"=="pnpm" (
  pnpm run dev --port %FRONTEND_PORT%
) else (
  npm run dev -- --port %FRONTEND_PORT%
)
goto :after_frontend

:HAVE_CONCURRENTLY
echo Starting with concurrently (inline)...
"%CONCURRENTLY_BIN%" -n backend,frontend "npm --prefix \"%~dp0backend\" run dev" "pnpm -C \"%~dp0zhanwen-admin-vue\" run dev --port %FRONTEND_PORT%"
goto :after_frontend

:CONTINUE

:: Wait for frontend startup
echo Waiting for frontend service startup...
timeout /t 10 /nobreak >nul

:: Check if frontend service started successfully
echo Checking frontend service...
curl -s http://localhost:%FRONTEND_PORT% >nul 2>&1
if %errorlevel%==0 (
    echo Frontend service started successfully!
) else (
    echo Frontend service check failed. Falling back to inline dev server to show logs...
    echo Launching frontend inline on port %FRONTEND_PORT% ...
    cd zhanwen-admin-vue
    if "%FRONTEND_PKG_MGR%"=="pnpm" (
        pnpm run dev --port %FRONTEND_PORT%
    ) else (
        npm run dev -- --port %FRONTEND_PORT%
    )
)

echo.
echo Development environment startup complete!
echo.
echo Service Information:
echo    Backend API: http://localhost:%BACKEND_PORT%
echo    Vue Frontend: http://localhost:%FRONTEND_PORT%
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

:after_frontend
popd
endlocal
exit /b 0
