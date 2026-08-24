@echo off
setlocal
title LUNIX DataControl Studio Launcher
color 0B

cd /d "%~dp0"

echo ================================================================
echo           LUNIX DataControl Studio Launcher
echo    In-Memory Multi-Spreadsheet Database dan Workbench
echo ================================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan di komputer ini!
    echo.
    echo Silakan unduh dan install Node.js versi LTS dari:
    echo https://nodejs.org/
    echo.
    echo Setelah selesai install, buka kembali file launch.bat ini.
    echo ================================================================
    pause
    exit /b 1
)

:: 2. Check if node_modules exists, install if missing
if not exist "node_modules" (
    echo [INFO] Menyiapkan dependensi aplikasi untuk pertama kali...
    echo [INFO] Proses ini memerlukan koneksi internet, mohon tunggu...
    echo.
    call npm.cmd install --legacy-peer-deps
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Gagal menginstall dependensi paket!
        echo Pastikan koneksi internet aktif dan coba lagi.
        echo ================================================================
        pause
        exit /b 1
    )
    echo [INFO] Instalasi selesai.
    echo.
)

:: 3. Launch application server and open browser
echo [INFO] Menjalankan server aplikasi di port 3120...
echo [INFO] Membuka browser di http://localhost:3120/ ...
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3120/"

call npm.cmd run dev

echo.
echo ================================================================
echo Server telah berhenti.
echo ================================================================
pause
