@echo off
setlocal

powershell -ExecutionPolicy Bypass -File "%~dp0make_shirt_image_variants_safe_list180_q64.ps1" ^
  -InputDir "D:\unrocher\tshirt-simulator\public\shirts" ^
  -OutputMainDir "D:\unrocher\tshirt-simulator\public\shirts-main" ^
  -OutputListDir "D:\unrocher\tshirt-simulator\public\shirts-list" ^
  -MainLongEdge 1280 ^
  -ListLongEdge 180 ^
  -MainJpegQuality 82 ^
  -ListJpegQuality 64

pause
