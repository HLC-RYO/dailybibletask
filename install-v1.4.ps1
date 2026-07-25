param(
  [string]$ProjectPath = "."
)

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Payload = Join-Path $PSScriptRoot "payload"

Write-Host "宝を探そう v1.4 を更新します..." -ForegroundColor Cyan
Write-Host "対象: $ProjectPath"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "package.json が見つかりません。dailybibletask のプロジェクト直下で実行してください。"
}

$files = @(
  "src\app\page.tsx",
  "src\app\personal-study\page.tsx",
  "src\app\study\page.tsx",
  "src\app\notes\page.tsx",
  "src\app\resources\page.tsx",
  "src\app\ministry\page.tsx",
  "src\components\CustomStudyWorkspace.tsx",
  "src\lib\types.ts"
)

foreach ($file in $files) {
  $source = Join-Path $Payload $file
  $target = Join-Path $ProjectPath $file
  $targetDir = Split-Path $target -Parent
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item $source $target -Force
  Write-Host "更新: $file" -ForegroundColor Green
}

$cssSource = Join-Path $Payload "STYLE_APPEND.css"
$cssTarget = Join-Path $ProjectPath "src\app\globals.css"
$marker = "/* v1.4 research workspaces */"
$cssText = Get-Content $cssTarget -Raw -Encoding UTF8

if ($cssText -notmatch [regex]::Escape($marker)) {
  Add-Content -Path $cssTarget -Value "`r`n" -Encoding UTF8
  Get-Content $cssSource -Raw -Encoding UTF8 | Add-Content -Path $cssTarget -Encoding UTF8
  Write-Host "更新: src\app\globals.css" -ForegroundColor Green
} else {
  Write-Host "CSSはすでに追加されています。" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "更新完了。" -ForegroundColor Cyan
Write-Host "次を実行してください:"
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Add customizable study workspaces"'
Write-Host "git push"
