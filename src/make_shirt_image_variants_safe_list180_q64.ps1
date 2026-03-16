param(
  [string]$InputDir = "D:\unrocher\tshirt-simulator\public\shirts",
  [string]$OutputMainDir = "D:\unrocher\tshirt-simulator\public\shirts-main",
  [string]$OutputListDir = "D:\unrocher\tshirt-simulator\public\shirts-list",
  [int]$MainLongEdge = 1280,
  [int]$ListLongEdge = 180,
  [long]$MainJpegQuality = 82,
  [long]$ListJpegQuality = 64
)

Add-Type -AssemblyName System.Drawing

function Get-JpegCodec {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Save-JpegWithQuality {
  param(
    [Parameter(Mandatory=$true)][System.Drawing.Image]$Image,
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][long]$Quality
  )
  $codec = Get-JpegCodec
  $encoder = [System.Drawing.Imaging.Encoder]::Quality
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, $Quality)
  $Image.Save($Path, $codec, $encoderParams)
  $encoderParams.Dispose()
}

function Resize-Jpeg {
  param(
    [Parameter(Mandatory=$true)][string]$SourcePath,
    [Parameter(Mandatory=$true)][string]$DestPath,
    [Parameter(Mandatory=$true)][int]$LongEdge,
    [Parameter(Mandatory=$true)][long]$Quality
  )

  $src = [System.Drawing.Image]::FromFile($SourcePath)
  try {
    $srcW = $src.Width
    $srcH = $src.Height

    if ($srcW -ge $srcH) {
      $newW = [Math]::Min($LongEdge, $srcW)
      $newH = [int][Math]::Round($srcH * ($newW / [double]$srcW))
    } else {
      $newH = [Math]::Min($LongEdge, $srcH)
      $newW = [int][Math]::Round($srcW * ($newH / [double]$srcH))
    }

    $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
    try {
      $bmp.SetResolution(72, 72)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.Clear([System.Drawing.Color]::White)
        $g.DrawImage($src, 0, 0, $newW, $newH)
      } finally {
        $g.Dispose()
      }

      $destDir = Split-Path -Parent $DestPath
      if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
      }

      Save-JpegWithQuality -Image $bmp -Path $DestPath -Quality $Quality
    } finally {
      $bmp.Dispose()
    }
  } finally {
    $src.Dispose()
  }
}

if (-not (Test-Path $InputDir)) {
  Write-Error "InputDir not found: $InputDir"
  exit 1
}

$resolvedInput = (Resolve-Path $InputDir).Path
$files = Get-ChildItem -Path $InputDir -File -Recurse | Where-Object {
  $_.Extension -match '^\.(jpg|jpeg)$'
}

if ($files.Count -eq 0) {
  Write-Host "No JPEG files found in: $InputDir"
  exit 0
}

Write-Host "InputDir : $InputDir"
Write-Host "MainDir  : $OutputMainDir (long edge $MainLongEdge, quality $MainJpegQuality)"
Write-Host "ListDir  : $OutputListDir (long edge $ListLongEdge, quality $ListJpegQuality)"
Write-Host ""

foreach ($file in $files) {
  $relative = $file.FullName.Substring($resolvedInput.Length).TrimStart('\')
  $mainPath = Join-Path $OutputMainDir $relative
  $listPath = Join-Path $OutputListDir $relative

  Write-Host "Processing: $relative"
  Resize-Jpeg -SourcePath $file.FullName -DestPath $mainPath -LongEdge $MainLongEdge -Quality $MainJpegQuality
  Resize-Jpeg -SourcePath $file.FullName -DestPath $listPath -LongEdge $ListLongEdge -Quality $ListJpegQuality
}

Write-Host ""
Write-Host "Done."
