param([string]$ProjectPath = ".")

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Source = Join-Path $PSScriptRoot "payload\src\app\api\topics\route.ts"
$Target = Join-Path $ProjectPath "src\app\api\topics\route.ts"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "package.json が見つかりません。dailybibletask のプロジェクト直下を指定してください。"
}

New-Item -ItemType Directory -Force -Path (Split-Path $Target -Parent) | Out-Null
Copy-Item $Source $Target -Force

Write-Host "ニュース取得APIを修正しました。" -ForegroundColor Green
Write-Host ""
Write-Host "次を実行してください:"
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Fix daily topics news feed"'
Write-Host "git push"
