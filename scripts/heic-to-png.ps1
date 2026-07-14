# heic-to-png.ps1 — decode a HEIC/HEIF via Windows WIC (WPF) to a PNG.
# Fallback for files libheif refuses (e.g. iOS HEIC whose iref box exceeds
# libheif's hardcoded security limit). Usage:
#   powershell -File heic-to-png.ps1 -Src <in.heic> -Dst <out.png>
param(
  [Parameter(Mandatory = $true)][string]$Src,
  [Parameter(Mandatory = $true)][string]$Dst
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
$uri = New-Object System.Uri((Resolve-Path $Src).Path)
$dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create(
  $uri,
  [System.Windows.Media.Imaging.BitmapCreateOptions]::None,
  [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
$enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
$enc.Frames.Add($dec.Frames[0])
$fs = [System.IO.File]::Create($Dst)
try { $enc.Save($fs) } finally { $fs.Close() }
