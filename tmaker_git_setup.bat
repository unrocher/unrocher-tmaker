@echo off
chcp 65001 >nul
title Tmaker Git Setup

echo Git の名前とメールを設定します。
echo.
set /p USERNAME=Git user.name を入力してください: 
set /p USEREMAIL=Git user.email を入力してください: 

if "%USERNAME%"=="" (
  echo user.name が空です。
  pause
  exit /b 1
)

if "%USEREMAIL%"=="" (
  echo user.email が空です。
  pause
  exit /b 1
)

git config --global user.name "%USERNAME%"
git config --global user.email "%USEREMAIL%"

echo.
echo 設定結果:
git config --global user.name
git config --global user.email

echo.
echo 完了しました。
pause
