@echo off
chcp 65001 >nul
title Tmaker Start
cd /d D:\unrocher\tshirt-simulator

echo [1/2] Git pull...
git pull
if errorlevel 1 (
  echo.
  echo Git pull でエラーが出ました。
  echo 先に git pull の競合やネット接続を確認してください。
  pause
  exit /b 1
)

echo.
echo [2/2] Vite dev server start...
npm run dev

pause
