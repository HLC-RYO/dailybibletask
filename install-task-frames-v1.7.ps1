param([string]$ProjectPath = ".")
$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "DailyBibleTask のプロジェクト直下で実行してください。"
}

$PageTarget = Join-Path $ProjectPath "src\app\tasks\page.tsx"
$TypesTarget = Join-Path $ProjectPath "src\lib\types.ts"
$CssTarget = Join-Path $ProjectPath "src\app\globals.css"

Copy-Item (Join-Path $PSScriptRoot "page.tsx") $PageTarget -Force

$types = Get-Content $TypesTarget -Raw -Encoding UTF8
$marker = "export type TaskFrameRow"
if ($types -notmatch $marker) {
  $insert = Get-Content (Join-Path $PSScriptRoot "types-append.txt") -Raw -Encoding UTF8
  $types = $types.Replace("export type TaskItem = {", $insert + "`r`nexport type TaskItem = {")
  Set-Content $TypesTarget -Value $types -Encoding UTF8
}

$css = Get-Content $CssTarget -Raw -Encoding UTF8
$cssMarker = "/* v1.7 task frames */"
if ($css -notmatch [regex]::Escape($cssMarker)) {
  Add-Content $CssTarget -Value (Get-Content (Join-Path $PSScriptRoot "task-frames.css") -Raw -Encoding UTF8) -Encoding UTF8
}

Write-Host "タスク枠機能を追加しました。" -ForegroundColor Green
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Add task list frames"'
Write-Host "git push"
