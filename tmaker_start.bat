@echo off
title Tmaker Start
cd /d G:\unrocher\tshirt-simulator

echo [1/2] Git pull...
git pull
if errorlevel 1 (
  echo.
  echo Git pull でエラーが出ました。
  pause
  exit /b 1
)

echo.
echo [2/2] Vite dev server start...
npm run dev

pause
