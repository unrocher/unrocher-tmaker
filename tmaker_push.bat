@echo off
title Tmaker Push
cd /d G:\unrocher\tshirt-simulator

echo [1/3] Git add...
git add .

echo.
set /p MSG=commit messageを入力してください: 
if "%MSG%"=="" set MSG=update

echo.
echo [2/3] Git commit...
git commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo commit できませんでした。変更が無いか、別のエラーの可能性があります。
  pause
  exit /b 1
)

echo.
echo [3/3] Git push...
git push
if errorlevel 1 (
  echo.
  echo push でエラーが出ました。
  pause
  exit /b 1
)

echo.
echo 完了しました。
pause
