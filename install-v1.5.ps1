param([string]$ProjectPath = ".")
$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Payload = Join-Path $PSScriptRoot "payload"
if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) { throw "package.json が見つかりません。dailybibletask のプロジェクト直下を指定してください。" }
$files = @("src\components\CustomStudyWorkspace.tsx","src\app\ministry\page.tsx","src\app\api\topics\route.ts")
foreach ($file in $files) { $source=Join-Path $Payload $file; $target=Join-Path $ProjectPath $file; New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent)|Out-Null; Copy-Item $source $target -Force; Write-Host "更新: $file" -ForegroundColor Green }
$cssTarget=Join-Path $ProjectPath "src\app\globals.css"; $cssSource=Join-Path $Payload "STYLE_APPEND_V1.5.css"; $marker="/* v1.5 categories and topics */"; $cssText=Get-Content $cssTarget -Raw -Encoding UTF8
if ($cssText -notmatch [regex]::Escape($marker)) { Add-Content -Path $cssTarget -Value "`r`n" -Encoding UTF8; Get-Content $cssSource -Raw -Encoding UTF8 | Add-Content -Path $cssTarget -Encoding UTF8; Write-Host "更新: src\app\globals.css" -ForegroundColor Green }
Write-Host "v1.5 更新完了" -ForegroundColor Cyan
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Add category buttons and daily topics"'
Write-Host "git push"
