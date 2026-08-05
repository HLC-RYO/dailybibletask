param([string]$ProjectPath = ".")
$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) { throw "DailyBibleTask のプロジェクト直下で実行してください。" }

$target = Join-Path $ProjectPath "src\components\CustomStudyWorkspace.tsx"
$cssTarget = Join-Path $ProjectPath "src\app\globals.css"
$source = Join-Path $PSScriptRoot "CustomStudyWorkspace.tsx"
$cssSource = Join-Path $PSScriptRoot "category-manager.css"

Copy-Item $source $target -Force
$marker = "/* v1.5.4 category manager */"
$currentCss = Get-Content $cssTarget -Raw -Encoding UTF8
if ($currentCss -notmatch [regex]::Escape($marker)) {
  Add-Content -Path $cssTarget -Value (Get-Content $cssSource -Raw -Encoding UTF8) -Encoding UTF8
}

Write-Host "カテゴリー管理機能を追加しました。" -ForegroundColor Green
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Add study category management"'
Write-Host "git push"
