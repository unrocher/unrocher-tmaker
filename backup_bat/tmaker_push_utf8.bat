@echo off
chcp 65001 >nul
title Tmaker Push
cd /d D:\unrocher\tshirt-simulator

set GIT_USERNAME=
set GIT_USEREMAIL=

for /f "delims=" %%i in ('git config --global user.name 2^>nul') do set GIT_USERNAME=%%i
for /f "delims=" %%i in ('git config --global user.email 2^>nul') do set GIT_USEREMAIL=%%i

if "%GIT_USERNAME%"=="" (
  echo Git の user.name が未設定です。
  echo 先に次を1回だけ実行してください:
  echo git config --global user.name "Shinobu itou"
  echo git config --global user.email "GitHubに登録しているメールアドレス"
  echo.
  pause
  exit /b 1
)

if "%GIT_USEREMAIL%"=="" (
  echo Git の user.email が未設定です。
  echo 先に次を1回だけ実行してください:
  echo git config --global user.name "Shinobu itou"
  echo git config --global user.email "GitHubに登録しているメールアドレス"
  echo.
  pause
  exit /b 1
)

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
  echo commit できませんでした。
  echo 変更が無いか、別のエラーの可能性があります。
  pause
  exit /b 1
)

echo.
echo [3/3] Git push...
git push
if errorlevel 1 (
  echo.
  echo push でエラーが出ました。
  echo 先に git pull が必要な場合があります。
  pause
  exit /b 1
)

echo.
echo 完了しました。
pause
