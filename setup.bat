@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   Blockchain Fire Insurance - Environment Setup
echo ============================================================
echo.

:: ─────────────────────────────────────────────
:: 0. Check prerequisites
:: ─────────────────────────────────────────────

echo [1/5] Checking prerequisites...

where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Please install Node.js (v18+) from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=1" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

where npm >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] npm not found. Please reinstall Node.js.
    pause & exit /b 1
)
echo  [OK] npm found

where python >nul 2>&1
if errorlevel 1 (
    where python3 >nul 2>&1
    if errorlevel 1 (
        echo  [ERROR] Python not found. Please install Python 3.10+ from https://python.org
        pause & exit /b 1
    )
    set PYTHON=python3
) else (
    set PYTHON=python
)
for /f "tokens=2" %%v in ('!PYTHON! --version') do set PY_VER=%%v
echo  [OK] Python %PY_VER%

echo.

:: ─────────────────────────────────────────────
:: 1. Install Node / Hardhat dependencies
:: ─────────────────────────────────────────────

echo [2/5] Installing Node.js dependencies (Hardhat)...
echo  Running: npm install
call npm install
if errorlevel 1 (
    echo  [ERROR] npm install failed.
    pause & exit /b 1
)
echo  [OK] Node modules installed.
echo.

:: ─────────────────────────────────────────────
:: 2. Verify Hardhat is available
:: ─────────────────────────────────────────────

echo [3/5] Verifying Hardhat installation...
call npx hardhat --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Hardhat could not be verified. Check the npm install output above.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('call npx hardhat --version 2^>^&1') do set HH_VER=%%v
echo  [OK] Hardhat %HH_VER% ready.
echo.

:: ─────────────────────────────────────────────
:: 3. Create Python virtual environment
:: ─────────────────────────────────────────────

echo [4/5] Setting up Python virtual environment...

if exist "venv\" (
    echo  [SKIP] venv\ already exists. Delete it manually to recreate.
) else (
    echo  Creating venv...
    !PYTHON! -m venv venv
    if errorlevel 1 (
        echo  [ERROR] Failed to create virtual environment.
        pause & exit /b 1
    )
    echo  [OK] venv created.
)

echo  Activating venv and installing Python requirements...
call venv\Scripts\activate.bat

echo  Upgrading pip...
python -m pip install --upgrade pip --quiet

if exist "requirements.txt" (
    echo  Installing from requirements.txt...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo  [ERROR] pip install failed.
        pause & exit /b 1
    )
    echo  [OK] Python packages installed.
) else (
    echo  [WARN] requirements.txt not found. Skipping pip install.
)
echo.

:: ─────────────────────────────────────────────
:: 4. Check / copy .env file
:: ─────────────────────────────────────────────

echo [5/5] Checking environment configuration...

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [OK] .env created from .env.example — please edit it with your values.
    ) else (
        echo  [WARN] No .env file found. Create one before running the app.
    )
) else (
    echo  [OK] .env already exists.
)

echo.
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo   Next steps:
echo.
echo   1. Activate the Python virtual environment:
echo         venv\Scripts\activate
echo.
echo   2. Start the Hardhat local blockchain node:
echo         npx hardhat node
echo.
echo   3. In a NEW terminal, deploy the smart contract:
echo         npx hardhat run scripts/deploy.ts --network local
echo.
echo   4. In another terminal, start the FastAPI backend:
echo         venv\Scripts\activate
echo         uvicorn backend.app:app --reload
echo.
echo ============================================================
echo.
pause
